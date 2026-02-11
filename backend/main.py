import os
import shutil
import time
import csv
import io
import logging
import pandas as pd
from io import BytesIO
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
import traceback

from .routers import placements
from .routers import advisors
from . import models, schemas
from .database import SessionLocal, engine, get_db

# --- 1. SETUP STORAGE ---
UPLOAD_DIR = "uploaded_files"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
    os.makedirs("uploads/advisor_docs", exist_ok=True)
# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables automatically
models.Base.metadata.create_all(bind=engine)

# --- DATABASE MIGRATION & CLEANUP CHECK ---
def ensure_profile_columns():
    """Safely adds columns and cleans up existing data formatting issues."""
    try:
        with engine.connect() as conn:
            # Check Faculty table
            col_info = conn.execute(text("PRAGMA table_info('faculty')")).fetchall()
            cols = [c[1] for c in col_info]
            if 'profile_pic' not in cols:
                conn.execute(text("ALTER TABLE faculty ADD COLUMN profile_pic TEXT"))
                logger.info("Added 'profile_pic' column to faculty table.")

            # Check Students table
            col_info = conn.execute(text("PRAGMA table_info('students')")).fetchall()
            cols = [c[1] for c in col_info]
            if 'profile_pic' not in cols:
                conn.execute(text("ALTER TABLE students ADD COLUMN profile_pic TEXT"))
                logger.info("Added 'profile_pic' column to students table.")
            
            # CRITICAL CLEANUP: Fix existing data formatting
            # This washes data like '21ai31t ' into '21AI31T' so fetching never fails
            conn.execute(text("UPDATE materials SET course_code = UPPER(TRIM(course_code))"))
            conn.execute(text("UPDATE academic_data SET course_code = UPPER(TRIM(course_code))"))
            
            conn.commit()
            logger.info("Database cleanup and migration check completed successfully.")
    except Exception as e:
        logger.error(f"Migration/Cleanup failed: {e}")

ensure_profile_columns()

# --- 2. INITIALIZE THE APP ---
app = FastAPI()

app.include_router(placements.router)
app.include_router(advisors.router)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- 3. MOUNT STATIC FILES ---
app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Or your specific localhost:3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PYDANTIC MODELS ---
class MarkSyncRequest(BaseModel):
    student_roll_no: str
    course_code: str
    cia1_marks: float
    cia1_retest: float
    cia2_marks: float
    cia2_retest: float
    ia1_marks: float 
    ia2_marks: float 
    subject_attendance: float

class ExcelMarkEntry(BaseModel):
    vh_no: str
    name: Optional[str] = None
    mark: float

class BulkExcelSyncRequest(BaseModel):
    course_code: str
    entity: str
    data: List[ExcelMarkEntry]

class AdminUserCreateRequest(BaseModel):
    id: str
    name: str
    role: str 
    password: str
    year: Optional[int] = 1
    semester: Optional[int] = 1
    section: Optional[str] = "A"
    designation: Optional[str] = None
    doj: Optional[str] = None

class AdminEnrollmentRequest(BaseModel):
    student_roll_no: str
    course_code: str
    section: Optional[str] = "A"

# --- AUTHENTICATION ---
@app.post("/login", response_model=schemas.Token)
def login(login_data: schemas.LoginData, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == login_data.username).first()
    if user and user.password == login_data.password:
        return {"access_token": user.id, "token_type": "bearer", "role": user.role, "user_id": user.id}
    raise HTTPException(status_code=400, detail="Incorrect username or password")

# --- ADMIN: USER & COURSE MANAGEMENT ---

@app.post("/admin/create-user")
def admin_create_user(data: AdminUserCreateRequest, db: Session = Depends(get_db)):
    try:
        if db.query(models.User).filter(models.User.id == data.id).first():
            raise HTTPException(status_code=400, detail="User ID already exists")

        new_user = models.User(id=data.id, role=data.role, password=data.password)
        db.add(new_user)
        db.flush() 

        if data.role == "Student":
            profile = models.Student(
                roll_no=data.id, 
                name=data.name, 
                year=int(data.year) if data.year else 1, 
                semester=int(data.semester) if data.semester else 1,
                section=data.section,
                cgpa=0.0,
                attendance_percentage=0.0
            )
            db.add(profile)
            db.flush()

            courses = db.query(models.Course).filter(
                models.Course.semester == data.semester,
                models.Course.section == data.section
            ).all()
            
            for course in courses:
                enrollment = models.AcademicData(
                    student_roll_no=data.id, 
                    course_id=course.id, 
                    course_code=course.code, 
                    subject=course.title,
                    section=data.section,
                    status="Pursuing"
                )
                db.add(enrollment)

        elif data.role == "Faculty":
            profile = models.Faculty(
                staff_no=data.id, 
                name=data.name, 
                designation=data.designation or "Assistant Professor", 
                doj=data.doj or "01.01.2024"
            )
            db.add(profile)
        
        db.commit()
        return {"message": f"{data.role} created and enrolled successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- BULK UPLOAD FROM CSV ---
@app.post("/admin/bulk-upload/{role}")
async def bulk_upload_users(role: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    contents = await file.read()
    decoded = contents.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    success_count = 0
    errors = []

    for row in reader:
        try:
            uid = row.get('id') or row.get('roll_no') or row.get('staff_no')
            if not uid: continue

            if db.query(models.User).filter(models.User.id == uid).first():
                errors.append(f"ID {uid} already exists")
                continue

            new_user = models.User(id=uid, role=role, password=row.get('password', '123456'))
            db.add(new_user)
            db.flush()

            if role == "Student":
                profile = models.Student(
                    roll_no=uid,
                    name=row.get('name'),
                    year=int(row.get('year', 1)),
                    semester=int(row.get('semester', 1)),
                    section=row.get('section', 'A'),
                    cgpa=float(row.get('cgpa', 0.0))
                )
                db.add(profile)
                db.flush()

                # Sync enrollment for ALL courses matching semester and section (including Labs)
                courses = db.query(models.Course).filter(
                    models.Course.semester == profile.semester,
                    models.Course.section == profile.section
                ).all()
                for c in courses:
                    db.add(models.AcademicData(
                        student_roll_no=uid, 
                        course_id=c.id, 
                        course_code=c.code, 
                        subject=c.title, 
                        section=c.section,
                        status="Pursuing"
                    ))

            elif role == "Faculty":
                profile = models.Faculty(
                    staff_no=uid,
                    name=row.get('name'),
                    designation=row.get('designation', 'Assistant Professor'),
                    doj=row.get('doj', '01.01.2026')
                )
                db.add(profile)

            success_count += 1
        except Exception as e:
            errors.append(f"Error at row {uid if 'uid' in locals() else 'unknown'}: {str(e)}")

    db.commit()
    return {"message": f"Successfully uploaded {success_count} users", "errors": errors}

# --- ARREAR MANAGEMENT SYSTEM (PREVIEW & UPLOAD) ---

@app.post("/admin/arrears/preview")
async def preview_arrears(
    file: UploadFile = File(...),
    year: int = Form(...),
    semester: int = Form(...),
    section: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Step 1: Analyzes the Excel/CSV file using VH NO.
    Cross-references VH NO with Students table based on selected Year, Sem, and Sec.
    """
    if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV or Excel (.xlsx) files are allowed")

    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))

        # Standardize headers
        df.columns = [str(c).strip().upper() for c in df.columns]
        
        # Robust VH NO column detection
        vh_col = next((c for c in df.columns if "VH NO" in c or "REG NO" in c or "VHNO" in c), None)
        
        if not vh_col:
            raise HTTPException(status_code=400, detail="Could not find 'VH NO' column in file.")

        preview_results = []
        for _, row in df.iterrows():
            vh_val = str(row[vh_col]).strip()
            if not vh_val or vh_val.lower() == 'nan':
                continue

            # Validation: Check if VH NO exists in the specific sorted class
            student = db.query(models.Student).filter(
                models.Student.roll_no == vh_val,
                models.Student.year == year,
                models.Student.semester == semester,
                models.Student.section == section
            ).first()

            status_msg = "✅ Ready" if student else "❌ Not found in selected class"
            
            preview_results.append({
                "vh_no": vh_val,
                "name": student.name if student else "Unknown",
                "sem_no": str(row.get('SEM NO', 'N/A')),
                "subject_code": str(row.get('SUBJECT CODE', 'N/A')).strip().upper(),
                "subject_name": str(row.get('SUBJECT NAME', 'N/A')),
                "status": status_msg,
                "is_valid": student is not None
            })

        return {"preview": preview_results}

    except Exception as e:
        logger.error(f"Arrear preview error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/admin/upload-arrears")
async def upload_arrears(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Step 2: Processes Arrear data from both .csv and .xlsx files after preview verification.
    Format: REG NO, NAME OF THE STUDENT, SEM NO, SUBJECT CODE, SUBJECT NAME
    """
    # Check for valid extensions
    if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV or Excel (.xlsx) files are allowed")
    
    try:
        contents = await file.read()
        
        # Logic to switch between CSV and Excel reading
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        
        # Clean column names
        df.columns = [str(c).strip().upper() for c in df.columns]
        
        # Detect VH NO column
        vh_col = next((c for c in df.columns if "VH NO" in c or "REG NO" in c or "VHNO" in c), None)

        success_count = 0
        for _, row in df.iterrows():
            reg_no = str(row.get(vh_col)).strip()
            # Skip empty rows or header artifacts
            if not reg_no or reg_no.lower() == 'nan' or "REG NO" in reg_no:
                continue
            
            new_arrear = models.Arrear(
                roll_no=reg_no,
                name=str(row.get('NAME OF THE STUDENT', 'N/A')),
                semester=str(row.get('SEM NO', 'N/A')),
                subject_code=str(row.get('SUBJECT CODE', 'N/A')).strip().upper(),
                subject_name=str(row.get('SUBJECT NAME', 'N/A')),
                batch="2024-2028"
            )
            db.add(new_arrear)
            success_count += 1
            
        db.commit()
        return {"message": f"Successfully uploaded {success_count} arrear records from {file.filename}."}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Arrear upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@app.get("/student/arrears/{roll_no}")
def get_student_arrears(roll_no: str, db: Session = Depends(get_db)):
    """Fetches arrear list for a specific student."""
    return db.query(models.Arrear).filter(models.Arrear.roll_no == roll_no.strip()).all()

# --- OTHER CORE ENDPOINTS (RETAINED) ---

@app.post("/admin/courses")
def add_course(course: schemas.CourseCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Course).filter(
        models.Course.code == course.code,
        models.Course.section == course.section
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"Subject {course.code} already exists for Section {course.section}")
    
    db_course = models.Course(**course.dict())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)

    existing_students = db.query(models.Student).filter(
        models.Student.semester == course.semester,
        models.Student.section == course.section
    ).all()

    for student in existing_students:
        enrollment = models.AcademicData(
            student_roll_no=student.roll_no,
            course_id=db_course.id,
            course_code=db_course.code,
            subject=db_course.title,
            section=db_course.section,
            status="Pursuing"
        )
        db.add(enrollment)
    
    db.commit()
    return db_course

@app.delete("/admin/courses/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    db.query(models.AcademicData).filter(models.AcademicData.course_id == course.id).delete()
    db.delete(course)
    db.commit()
    return {"message": "Course removed"}

@app.post("/admin/enroll")
def enroll_student(data: AdminEnrollmentRequest, db: Session = Depends(get_db)):
    try:
        student = db.query(models.Student).filter(models.Student.roll_no == data.student_roll_no).first()
        course = db.query(models.Course).filter(models.Course.code == data.course_code).first() 
        if not student or not course:
            raise HTTPException(status_code=404, detail="Student or Course not found")

        existing = db.query(models.AcademicData).filter(
            models.AcademicData.student_roll_no == data.student_roll_no,
            models.AcademicData.course_code == data.course_code
        ).first()
        if existing:
            return {"message": "Student already enrolled in this course"}

        enrollment = models.AcademicData(
            student_roll_no=data.student_roll_no,
            course_id=course.id,
            course_code=data.course_code,
            subject=course.title,
            section=student.section, # Explicitly use student's section for Lab accuracy
            status="Pursuing"
        )
        db.add(enrollment)
        db.commit()
        return {"message": "Student enrolled successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- PLACEMENT MANAGEMENT ---

@app.post("/admin/companies")
async def add_company(name: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        filename = f"logo_{int(time.time())}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        new_company = models.Company(name=name, logo_url=f"http://localhost:8000/static/{filename}")
        db.add(new_company)
        db.commit()
        return {"message": "Company added successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding company: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/companies")
def get_companies(db: Session = Depends(get_db)):
    return db.query(models.Company).all()

@app.post("/admin/placed-students")
async def add_placed_student(
    name: str = Form(...),
    dept: str = Form("AI & DS"),
    lpa: float = Form(...),
    company: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        filename = f"placed_{int(time.time())}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        new_placement = models.PlacedStudent(
            name=name, dept=dept, lpa=lpa, 
            company_name=company, photo_url=f"http://localhost:8000/static/{filename}"
        )
        db.add(new_placement)
        db.commit()
        return {"message": "Placement record added successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding placement record: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/placed-students")
def get_placed_students(db: Session = Depends(get_db)):
    return db.query(models.PlacedStudent).all()

# --- FACULTY: MARKS & ATTENDANCE ---

@app.get("/faculty/my-courses")
def get_faculty_courses(staff_no: str, db: Session = Depends(get_db)):
    return db.query(models.Course).filter(models.Course.faculty_id == staff_no).all()

@app.get("/marks/section")
def get_section_marks(course_code: str, section: Optional[str] = "A", db: Session = Depends(get_db)):
    results = db.query(
        models.Student.name,
        models.AcademicData.student_roll_no,
        models.AcademicData.cia1_marks,
        models.AcademicData.cia1_retest,
        models.AcademicData.ia1_marks,
        models.AcademicData.cia2_marks,
        models.AcademicData.cia2_retest,
        models.AcademicData.ia2_marks,
        models.AcademicData.subject_attendance
    ).join(
        models.AcademicData, models.Student.roll_no == models.AcademicData.student_roll_no
    ).filter(
        models.AcademicData.course_code == course_code,
        models.AcademicData.section == section
    ).all()
    
    return [
        {
            "name": row[0],
            "roll_no": row[1],
            "cia1_marks": row[2] or 0,
            "cia1_retest": row[3] or 0,
            "ia1_marks": row[4] or 0,
            "cia2_marks": row[5] or 0,
            "cia2_retest": row[6] or 0,
            "ia2_marks": row[7] or 0,
            "subject_attendance": row[8] or 0
        } for row in results
    ]

@app.post("/marks/sync")
def sync_marks(data: MarkSyncRequest, db: Session = Depends(get_db)):
    record = db.query(models.AcademicData).filter(
        models.AcademicData.student_roll_no == data.student_roll_no,
        models.AcademicData.course_code == data.course_code
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    record.cia1_marks = data.cia1_marks
    record.cia1_retest = data.cia1_retest
    record.cia2_marks = data.cia2_marks
    record.cia2_retest = data.cia2_retest
    record.ia1_marks = data.ia1_marks
    record.ia2_marks = data.ia2_marks
    record.subject_attendance = data.subject_attendance
    
    db.commit()
    return {"message": "Sync successful"}

# --- EXCEL AUTOMATION ENDPOINTS ---

@app.post("/marks/process-excel")
async def process_marks_excel(
    file: UploadFile = File(...),
    course_code: str = Form(...),
    section: str = Form(...),
    entity: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        contents = await file.read()
        # Handle college format header (first 4 rows skip)
        if file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(contents), skiprows=4)
        else:
            df = pd.read_excel(BytesIO(contents), skiprows=4)

        df.columns = [str(c).strip() for c in df.columns]
        vh_col = next((c for c in df.columns if "VH NO" in c.upper()), None)
        name_col = next((c for c in df.columns if "STUDENT NAME" in c.upper()), None)
        mark_col = next((c for c in df.columns if course_code.upper() in c.upper()), None)

        if not vh_col or not mark_col:
            raise HTTPException(status_code=400, detail=f"Could not find VH NO or column for {course_code} in Excel.")

        processed_data = []
        for _, row in df.iterrows():
            vh_val = str(row[vh_col]).strip()
            if not vh_val or vh_val.lower() == 'nan' or "S.No" in vh_val:
                continue
            
            raw_mark = str(row[mark_col]).strip().upper()
            
            # Robust logic for ABSENT (AB) or empty cells
            if raw_mark in ['AB', 'NAN', '', 'NONE', 'N/A']:
                mark_val = 0.0
            else:
                try:
                    mark_val = float(raw_mark)
                except ValueError:
                    mark_val = 0.0

            processed_data.append({
                "vh_no": vh_val,
                "name": str(row[name_col]) if name_col and not pd.isna(row[name_col]) else "N/A",
                "mark": mark_val
            })

        return {"preview": processed_data}
    except Exception as e:
        logger.error(f"Excel processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/marks/bulk-sync-excel")
def bulk_sync_excel_marks(request: BulkExcelSyncRequest, db: Session = Depends(get_db)):
    try:
        updated_count = 0
        for entry in request.data:
            record = db.query(models.AcademicData).filter(
                models.AcademicData.student_roll_no == entry.vh_no,
                models.AcademicData.course_code == request.course_code
            ).first()
            if record:
                # Dynamically set attribute based on entity choice (ia1_marks, cia2_marks etc)
                setattr(record, request.entity, entry.mark)
                updated_count += 1
        db.commit()
        return {"message": f"Successfully updated {updated_count} student marks."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- STUDENT: ACADEMIC PORTAL ---
@app.get("/marks/cia")
def get_student_marks(student_id: str, db: Session = Depends(get_db)):
    marks = db.query(models.AcademicData).filter(models.AcademicData.student_roll_no == student_id).all()
    return [{
        "subject": m.subject if m.subject else m.course_code,
        "course_code": m.course_code,
        "cia1": m.cia1_marks or 0,
        "cia1_retest": m.cia1_retest or 0, 
        "ia1_marks": m.ia1_marks or 0,
        "cia2": m.cia2_marks or 0,
        "cia2_retest": m.cia2_retest or 0, 
        "ia2_marks": m.ia2_marks or 0,
        "subject_attendance": m.subject_attendance or 0,
        # Display logic: max of (regular or retest) + IA marks
        "total": (max(m.cia1_marks or 0, m.cia1_retest or 0) + 
                  max(m.cia2_marks or 0, m.cia2_retest or 0) + 
                  (m.ia1_marks or 0) + (m.ia2_marks or 0))
    } for m in marks]

# --- MATERIALS & ANNOUNCEMENTS ---

@app.post("/materials")
async def upload_material(
    course_id: Optional[int] = Form(None),
    course_code: str = Form(...),
    type: str = Form(...),
    title: str = Form(...),
    posted_by: str = Form(...),
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    try:
        file_link = None
        # Always clean course code before saving to ensure consistency
        clean_course_code = course_code.strip().upper()
        
        if file:
            filename = f"{clean_course_code}_{int(time.time())}_{file.filename}"
            file_location = os.path.join(UPLOAD_DIR, filename)
            with open(file_location, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_link = f"http://localhost:8000/static/{filename}"
        elif url:
            file_link = url
        else:
            raise HTTPException(status_code=400, detail="Either file or url required")

        cid = course_id
        if not cid:
            course = db.query(models.Course).filter(models.Course.code == clean_course_code).first()
            cid = course.id if course else 0

        db_material = models.Material(
            course_id=cid, 
            course_code=clean_course_code,  
            type=type, 
            title=title, 
            file_link=file_link, 
            posted_by=posted_by
        )
        db.add(db_material)
        db.commit()
        db.refresh(db_material)
        return db_material
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/materials/{identifier}")
def get_course_materials(identifier: str, db: Session = Depends(get_db)):
    """Smart fetch: searches by ID, Code, or Subject Title to ensure student sees files."""
    # 1. Search by Numeric Course ID
    if identifier.isdigit():
        return db.query(models.Material).filter(models.Material.course_id == int(identifier)).all()
    
    # 2. Direct search by Course Code in Materials table
    clean_id = identifier.strip().upper()
    materials = db.query(models.Material).filter(
        (models.Material.course_code == clean_id) | 
        (models.Material.course_code.ilike(f"%{clean_id}%"))
    ).all()
    
    if materials:
        return materials

    # 3. If not found directly, the 'identifier' is likely a Subject Title.
    # We find the code associated with this title in AcademicData or Course table.
    course_ref = db.query(models.AcademicData).filter(
        (models.AcademicData.subject.ilike(f"%{identifier}%")) | 
        (models.AcademicData.course_code.ilike(f"%{identifier}%"))
    ).first()
    
    if course_ref:
        return db.query(models.Material).filter(
            models.Material.course_code == course_ref.course_code
        ).all()
        
    return []

@app.get("/materials/course/{course_code}")
def get_materials_by_course_section(course_code: str, section: Optional[str] = None, db: Session = Depends(get_db)):
    clean_code = course_code.strip().upper()
    return db.query(models.Material).filter(models.Material.course_code.ilike(f"%{clean_code}%")).all()

@app.delete("/materials/{material_id}")
def delete_material(material_id: int, db: Session = Depends(get_db)):
    mat = db.query(models.Material).filter(models.Material.id == material_id).first()
    if not mat: raise HTTPException(status_code=404, detail="Material not found")
    db.delete(mat)
    db.commit()
    return {"message": "Deleted"}

# --- TARGETED ANNOUNCEMENT SYSTEM ---

@app.post("/announcements")
def create_announcement(announcement: schemas.AnnouncementCreate, db: Session = Depends(get_db)):
    """Creates a targeted announcement and standardizes the course code."""
    cleaned_code = "Global"
    if announcement.course_code and announcement.course_code.upper() != "GLOBAL":
        # Standardization: Removes (Lab) tags so students always find the notices
        cleaned_code = announcement.course_code.upper().replace(' (LAB)', '').replace('(LAB)', '').strip()

    db_announcement = models.Announcement(
        title=announcement.title, 
        content=announcement.content, 
        type=announcement.type, # Should be: 'Global', 'Faculty', or 'Student'
        posted_by=announcement.posted_by, 
        course_code=cleaned_code,
        section=getattr(announcement, 'section', 'All')
    )
    db.add(db_announcement)
    db.commit()
    db.refresh(db_announcement)
    return db_announcement

@app.get("/announcements")
def get_announcements(
    audience: Optional[str] = "Global", 
    student_id: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    """Tiered fetching logic: fetches role-specific notices + global notices."""
    query = db.query(models.Announcement)
    
    # Logic: Students see Global + Student. Faculty see Global + Faculty.
    if audience == "Student":
        query = query.filter(models.Announcement.type.in_(["Global", "Student"]))
    elif audience == "Faculty":
        query = query.filter(models.Announcement.type.in_(["Global", "Faculty"]))
    else:
        # Strict filter for Home Page / Public view
        query = query.filter(models.Announcement.type == "Global")

    # Section-specific filtering for students
    if student_id:
        student = db.query(models.Student).filter(models.Student.roll_no == student_id).first()
        if student:
            query = query.filter((models.Announcement.section == "All") | (models.Announcement.section == student.section))
            
    return query.order_by(models.Announcement.id.desc()).all()

@app.delete("/announcements/{ann_id}")
def delete_announcement(ann_id: int, db: Session = Depends(get_db)):
    """Physically removes an announcement (for the Admin Dashboard Registry)."""
    ann = db.query(models.Announcement).filter(models.Announcement.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    db.delete(ann)
    db.commit()
    return {"message": "Announcement removed"}

# --- PROFILES & PHOTO UPLOADS ---

@app.get("/faculty/{staff_no}", response_model=schemas.Faculty)
def get_faculty(staff_no: str, db: Session = Depends(get_db)):
    faculty = db.query(models.Faculty).filter(models.Faculty.staff_no == staff_no.strip()).first()
    if not faculty: raise HTTPException(status_code=404, detail="Faculty not found")
    return faculty

@app.post("/faculty/{staff_no}/photo")
async def upload_faculty_photo(staff_no: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    faculty = db.query(models.Faculty).filter(models.Faculty.staff_no == staff_no.strip()).first()
    if not faculty: raise HTTPException(status_code=404, detail="Faculty not found")
    filename = f"faculty_{staff_no.strip()}_{int(time.time())}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    faculty.profile_pic = f"http://localhost:8000/static/{filename}"
    db.commit()
    return {"profile_pic": faculty.profile_pic}

@app.get("/student/{roll_no}", response_model=schemas.Student)
def get_student(roll_no: str, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.roll_no == roll_no.strip()).first()
    if not student: raise HTTPException(status_code=404, detail="Student not found")
    return student

@app.post("/student/upload-photo")
async def upload_student_photo(roll_no: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.roll_no == roll_no.strip()).first()
    if not student: raise HTTPException(status_code=404, detail="Student not found")
    filename = f"student_{roll_no.strip()}_{int(time.time())}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    student.profile_pic = f"http://localhost:8000/static/{filename}"
    db.commit()
    return {"profile_pic": student.profile_pic}

@app.get("/courses", response_model=List[schemas.Course])
def get_courses(semester: Optional[int] = None, section: Optional[str] = None, faculty_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Course)
    if semester: query = query.filter(models.Course.semester == semester)
    if section: query = query.filter(models.Course.section == section)
    if faculty_id: query = query.filter(models.Course.faculty_id == faculty_id)
    return query.all()

@app.get("/admin/faculties")
def get_all_faculties(designation: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Faculty)
    if designation and designation != "":
        query = query.filter(models.Faculty.designation == designation)
    return query.all()

@app.get("/admin/students")
def get_all_students(year: Optional[int] = None, semester: Optional[int] = None, section: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Student)
    if year: query = query.filter(models.Student.year == year)
    if semester: query = query.filter(models.Student.semester == semester)
    if section and section != "": query = query.filter(models.Student.section == section)
    return query.all()

@app.put("/admin/student/update")
def update_student(data: dict, db: Session = Depends(get_db)):
    orig_id = data.get('original_roll_no') or data.get('roll_no')
    new_id = data.get('roll_no')
    student = db.query(models.Student).filter(models.Student.roll_no == orig_id).first()
    user = db.query(models.User).filter(models.User.id == orig_id).first()
    if not student or not user: raise HTTPException(status_code=404, detail="Student not found")
    try:
        if str(orig_id) != str(new_id):
            if db.query(models.User).filter(models.User.id == new_id).first(): raise HTTPException(status_code=400, detail="ID exists")
            db.query(models.AcademicData).filter(models.AcademicData.student_roll_no == orig_id).update({"student_roll_no": new_id})
            student.roll_no, user.id = new_id, new_id
        student.name, student.year = data.get('name'), int(data.get('year', student.year))
        student.semester, student.section = int(data.get('semester', student.semester)), data.get('section')
        student.cgpa = float(data.get('cgpa', student.cgpa))
        if data.get('password'): user.password = data.get('password')
        db.commit()
        return {"message": "Success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/student/{roll_no}")
def delete_student_profile(roll_no: str, db: Session = Depends(get_db)):
    try:
        db.query(models.AcademicData).filter(models.AcademicData.student_roll_no == roll_no).delete()
        db.query(models.Student).filter(models.Student.roll_no == roll_no).delete()
        db.query(models.User).filter(models.User.id == roll_no).delete()
        db.commit()
        return {"message": "Deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/admin/faculty/update")
def update_faculty(data: dict, db: Session = Depends(get_db)):
    orig_id = data.get('original_id') or data.get('staff_no')
    new_id = data.get('staff_no') or data.get('id')
    faculty = db.query(models.Faculty).filter(models.Faculty.staff_no == orig_id).first()
    user = db.query(models.User).filter(models.User.id == orig_id).first()
    if not faculty or not user: raise HTTPException(status_code=404, detail="Faculty not found")
    try:
        if str(orig_id) != str(new_id):
            if db.query(models.User).filter(models.User.id == new_id).first(): raise HTTPException(status_code=400, detail="ID exists")
            db.query(models.Course).filter(models.Course.faculty_id == orig_id).update({"faculty_id": new_id})
            faculty.staff_no, user.id = new_id, new_id
        faculty.name, faculty.designation = data.get('name'), data.get('designation')
        if data.get('password'): user.password = data.get('password')
        db.commit()
        return {"message": "Success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/faculty/{staff_no}")
def delete_faculty_profile(staff_no: str, db: Session = Depends(get_db)):
    try:
        db.query(models.Course).filter(models.Course.faculty_id == staff_no.strip()).update({"faculty_id": None})
        db.query(models.Faculty).filter(models.Faculty.staff_no == staff_no.strip()).delete()
        db.query(models.User).filter(models.User.id == staff_no.strip()).delete()
        db.commit()
        return {"message": "Deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/toppers/overall")
def get_overall_toppers(year: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.Student)
    if year: query = query.filter(models.Student.year == year)
    return query.order_by(models.Student.cgpa.desc()).limit(3).all()

@app.get("/admin/toppers/classwise")
def get_classwise_toppers(year: int, section: str, db: Session = Depends(get_db)):
    return db.query(models.Student).filter(models.Student.year == year, models.Student.section == section).order_by(models.Student.cgpa.desc()).all()

@app.get("/debug/materials")
def debug_all_materials(db: Session = Depends(get_db)):
    materials = db.query(models.Material).all()
    return {"total": len(materials), "materials": [{"id": m.id, "code": m.course_code, "type": m.type, "title": m.title} for m in materials]}