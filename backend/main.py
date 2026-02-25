import os
import shutil
import time
import csv
import io
import logging
import traceback
import pandas as pd
from io import BytesIO
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel

# --- 1. SETUP & IMPORTS ---
from . import models, schemas
from .database import SessionLocal, engine, get_db
from .routers import placements, advisors

# Create base directories immediately to prevent "Directory does not exist" errors
UPLOAD_DIR = "uploaded_files"
ADVISOR_DIR = "uploads/advisor_docs"

for folder in [UPLOAD_DIR, "uploads", ADVISOR_DIR]:
    if not os.path.exists(folder):
        os.makedirs(folder, exist_ok=True)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables automatically
models.Base.metadata.create_all(bind=engine)

# --- DATABASE MIGRATION & CLEANUP CHECK ---
def ensure_profile_columns():
    """Safely adds columns and cleans up existing data formatting issues. Updated for Supabase compatibility."""
    try:
        # Get the database dialect (sqlite vs postgresql)
        db_type = engine.name
        
        with engine.connect() as conn:
            if db_type == 'sqlite':
                # Safely check and add columns to Faculty table
                col_info = conn.execute(text("PRAGMA table_info('faculty')")).fetchall()
                if col_info: # Only if table exists
                    cols = [c[1] for c in col_info]
                    if 'profile_pic' not in cols:
                        conn.execute(text("ALTER TABLE faculty ADD COLUMN profile_pic TEXT"))
                        logger.info("Added 'profile_pic' column to faculty table.")

                # Safely check and add columns to Students table
                col_info = conn.execute(text("PRAGMA table_info('students')")).fetchall()
                if col_info:
                    cols = [c[1] for c in col_info]
                    if 'profile_pic' not in cols:
                        conn.execute(text("ALTER TABLE students ADD COLUMN profile_pic TEXT"))
                        logger.info("Added 'profile_pic' column to students table.")
            
            # CRITICAL CLEANUP: Fix existing data formatting (Runs on both SQLite and Postgres/Supabase)
            # This ensures '21ai31t ' becomes '21AI31T' so fetches never fail
            conn.execute(text("UPDATE materials SET course_code = UPPER(TRIM(course_code))"))
            conn.execute(text("UPDATE academic_data SET course_code = UPPER(TRIM(course_code))"))
            
            conn.commit()
            logger.info(f"Database cleanup and migration check ({db_type}) completed successfully.")
    except Exception as e:
        logger.error(f"Migration/Cleanup failed: {e}")

# Run migration check on startup
ensure_profile_columns()

# --- 2. INITIALIZE THE APP ---
app = FastAPI(title="College Management System API")

# --- MIDDLEWARE & SECURITY ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler to catch 500 errors and print them to terminal
@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        logger.error("--- CRITICAL INTERNAL SERVER ERROR ---")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal Server Error: {str(exc)}", "trace": traceback.format_summary(traceback.extract_tb(exc.__traceback__))[0]}
        )

# --- MOUNT STATIC FILES ---
# Mounting /uploads for Advisor Docs and /static for General Uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

# --- INCLUDE ROUTERS ---
app.include_router(placements.router)
app.include_router(advisors.router)

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

# --- SYLLABUS TOPIC MANAGEMENT ---
@app.post("/syllabus/topics")
def save_syllabus_topic(topic: schemas.TopicCreate, db: Session = Depends(get_db)):
    """Saves faculty syllabus topics to the database."""
    try:
        new_topic = models.SyllabusTopic(
            course_code=topic.course_code.upper().strip(), 
            section=topic.section, 
            unit_no=int(topic.unit_no), 
            topic_name=topic.topic_name
        )
        db.add(new_topic)
        db.commit()
        db.refresh(new_topic)
        return new_topic
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving topic: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/syllabus/{course_code}/{section}")
def get_syllabus_topics(
    course_code: str, 
    section: str, 
    unit_no: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Fetches syllabus topics."""
    query = db.query(models.SyllabusTopic).filter(
        models.SyllabusTopic.course_code == course_code.upper().strip(),
        models.SyllabusTopic.section == section
    )
    if unit_no is not None:
        query = query.filter(models.SyllabusTopic.unit_no == unit_no)
        
    return query.order_by(models.SyllabusTopic.unit_no.asc()).all()

@app.delete("/syllabus/topics/{topic_id}")
def delete_syllabus_topic(topic_id: int, db: Session = Depends(get_db)):
    """Deletes a syllabus topic by ID (Fixes faculty mistakes)."""
    topic = db.query(models.SyllabusTopic).filter(models.SyllabusTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    try:
        db.delete(topic)
        db.commit()
        return {"message": "Topic removed successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

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
                    course_code=course.code.upper().strip(), 
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

@app.post("/admin/bulk-upload/{role}")
async def bulk_upload_users(role: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    contents = await file.read()
    decoded = contents.decode('utf-8')
    
    # 🌟 NEW: Save the file to track it for the UI panel and future deletion
    timestamp = int(time.time())
    safe_filename = file.filename.replace(" ", "_")
    saved_filename = f"bulk_{timestamp}_{role}_{safe_filename}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(decoded)
    # ----------------------------------------------------

    reader = csv.DictReader(io.StringIO(decoded))
    success_count = 0
    errors = []

    for row in reader:
        try:
            uid = row.get('id') or row.get('roll_no') or row.get('staff_no')
            if not uid: continue
            uid = str(uid).strip()

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

                courses = db.query(models.Course).filter(
                    models.Course.semester == profile.semester,
                    models.Course.section == profile.section
                ).all()
                for c in courses:
                    db.add(models.AcademicData(
                        student_roll_no=uid, 
                        course_id=c.id, 
                        course_code=c.code.upper().strip(), 
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
    return {
        "message": f"Successfully uploaded {success_count} users", 
        "errors": errors,
        "file_id": saved_filename # Matches the frontend expectation
    }

# 🌟 NEW ENDPOINT: Fetches all uploaded CSV files for the Admin Panel UI
@app.get("/admin/bulk-upload/files")
def get_uploaded_csv_files():
    files_list = []
    if not os.path.exists(UPLOAD_DIR):
        return files_list
        
    for filename in os.listdir(UPLOAD_DIR):
        if filename.startswith("bulk_") and filename.endswith(".csv"):
            # Parse filename format: bulk_{timestamp}_{role}_{original_name}
            parts = filename.split("_", 3)
            if len(parts) >= 4:
                try:
                    uploaded_at = int(parts[1])
                    role = parts[2]
                    files_list.append({
                        "filename": filename,
                        "role": role,
                        "uploaded_at": uploaded_at
                    })
                except ValueError:
                    continue
                    
    # Sort by newest first
    files_list.sort(key=lambda x: x["uploaded_at"], reverse=True)
    return files_list

# 🌟 NEW ENDPOINT: Deletes the CSV file AND all users inside it
@app.delete("/admin/bulk-upload/file/{filename}")
def delete_bulk_csv(filename: str, db: Session = Depends(get_db)):
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="CSV file not found on server")
        
    try:
        # 1. Read the file to find out WHICH users to delete
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                uid = row.get('id') or row.get('roll_no') or row.get('staff_no')
                if uid:
                    uid = str(uid).strip()
                    # Delete associated data
                    db.query(models.AcademicData).filter(models.AcademicData.student_roll_no == uid).delete(synchronize_session=False)
                    db.query(models.Student).filter(models.Student.roll_no == uid).delete(synchronize_session=False)
                    db.query(models.Course).filter(models.Course.faculty_id == uid).update({"faculty_id": None}, synchronize_session=False)
                    db.query(models.Faculty).filter(models.Faculty.staff_no == uid).delete(synchronize_session=False)
                    db.query(models.User).filter(models.User.id == uid).delete(synchronize_session=False)
        
        db.commit()
        
        # 2. Delete the physical file from the server
        os.remove(file_path)
        
        return {"message": "File and associated users deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error undoing CSV upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/courses")
def add_course(course: schemas.CourseCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Course).filter(
        models.Course.code == course.code.upper().strip(),
        models.Course.section == course.section
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"Subject {course.code} already exists for Section {course.section}")
    
    db_course = models.Course(**course.dict())
    db_course.code = db_course.code.upper().strip()
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
        course = db.query(models.Course).filter(models.Course.code == data.course_code.upper().strip()).first() 
        if not student or not course:
            raise HTTPException(status_code=404, detail="Student or Course not found")

        existing = db.query(models.AcademicData).filter(
            models.AcademicData.student_roll_no == data.student_roll_no,
            models.AcademicData.course_code == data.course_code.upper().strip()
        ).first()
        if existing:
            return {"message": "Student already enrolled in this course"}

        enrollment = models.AcademicData(
            student_roll_no=data.student_roll_no,
            course_id=course.id,
            course_code=data.course_code.upper().strip(),
            subject=course.title,
            section=student.section, 
            status="Pursuing"
        )
        db.add(enrollment)
        db.commit()
        return {"message": "Student enrolled successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- ARREAR MANAGEMENT SYSTEM ---
@app.post("/admin/arrears/preview")
async def preview_arrears(
    file: UploadFile = File(...),
    year: int = Form(...),
    semester: int = Form(...),
    section: str = Form(...),
    db: Session = Depends(get_db)
):
    if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV or Excel (.xlsx) files are allowed")

    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))

        df.columns = [str(c).strip().upper() for c in df.columns]
        vh_col = next((c for c in df.columns if "VH NO" in c or "REG NO" in c or "VHNO" in c), None)
        
        if not vh_col:
            raise HTTPException(status_code=400, detail="Could not find 'VH NO' column in file.")

        preview_results = []
        for _, row in df.iterrows():
            vh_val = str(row[vh_col]).strip()
            if not vh_val or vh_val.lower() == 'nan':
                continue

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
    if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV or Excel (.xlsx) files are allowed")
    
    try:
        contents = await file.read()
        
        # 🌟 NEW: Save the physical file so the UI can list it and delete it later
        timestamp = int(time.time())
        safe_filename = file.filename.replace(" ", "_")
        saved_filename = f"arrear_{timestamp}_{safe_filename}"
        file_path = os.path.join(UPLOAD_DIR, saved_filename)
        
        with open(file_path, "wb") as f:
            f.write(contents)
        # -------------------------------------------------------------------------
            
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        
        df.columns = [str(c).strip().upper() for c in df.columns]
        vh_col = next((c for c in df.columns if "VH NO" in c or "REG NO" in c or "VHNO" in c), None)

        success_count = 0
        for _, row in df.iterrows():
            reg_no = str(row.get(vh_col)).strip()
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
        return {
            "message": f"Successfully uploaded {success_count} arrear records.",
            "file_id": saved_filename
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Arrear upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

# 🌟 NEW ENDPOINT: Fetches all uploaded Arrear files for the Admin Panel UI
@app.get("/admin/arrears/files")
def get_uploaded_arrear_files():
    files_list = []
    if not os.path.exists(UPLOAD_DIR):
        return files_list
        
    for filename in os.listdir(UPLOAD_DIR):
        if filename.startswith("arrear_") and (filename.endswith(".csv") or filename.endswith(".xlsx")):
            parts = filename.split("_", 2)
            if len(parts) >= 3:
                try:
                    uploaded_at = int(parts[1])
                    files_list.append({
                        "filename": filename,
                        "uploaded_at": uploaded_at
                    })
                except ValueError:
                    continue
                    
    files_list.sort(key=lambda x: x["uploaded_at"], reverse=True)
    return files_list

# 🌟 NEW ENDPOINT: Deletes the Arrear file AND all records inside it
@app.delete("/admin/arrears/file/{filename}")
def delete_arrear_file(filename: str, db: Session = Depends(get_db)):
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
        
    try:
        # 1. Read the file to find out WHICH student arrears to delete
        if filename.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
            
        df.columns = [str(c).strip().upper() for c in df.columns]
        vh_col = next((c for c in df.columns if "VH NO" in c or "REG NO" in c or "VHNO" in c), None)
        
        if vh_col:
            for _, row in df.iterrows():
                reg_no = str(row.get(vh_col)).strip()
                subj_code = str(row.get('SUBJECT CODE', 'N/A')).strip().upper()
                if reg_no and reg_no.lower() != 'nan':
                    # Delete the specific arrear matching this roll_no and subject
                    db.query(models.Arrear).filter(
                        models.Arrear.roll_no == reg_no,
                        models.Arrear.subject_code == subj_code
                    ).delete(synchronize_session=False)
        
        db.commit()
        
        # 2. Delete the physical file from the server
        os.remove(file_path)
        return {"message": "Arrear file and associated records deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting arrear file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/student/arrears/{roll_no}")
def get_student_arrears(roll_no: str, db: Session = Depends(get_db)):
    """Fetches arrear list for a specific student."""
    return db.query(models.Arrear).filter(models.Arrear.roll_no == roll_no.strip()).all()

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
        models.AcademicData.course_code == course_code.upper().strip(),
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
        models.AcademicData.course_code == data.course_code.upper().strip()
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
                models.AcademicData.course_code == request.course_code.upper().strip()
            ).first()
            if record:
                setattr(record, request.entity, entry.mark)
                updated_count += 1
        db.commit()
        return {"message": f"Successfully updated {updated_count} student marks."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- SMART PROGRESS CALCULATION ---
@app.get("/faculty/course-progress/{course_code}/{section}")
def get_course_progress(course_code: str, section: str, db: Session = Depends(get_db)):
    clean_code = course_code.upper().strip()
    
    # 1. Fetch Course and Faculty details
    course_info = db.query(models.Course).filter(
        models.Course.code == clean_code,
        models.Course.section == section
    ).first()

    faculty_name = "Not Assigned"
    subject_title = "N/A"
    
    if course_info:
        subject_title = course_info.title
        faculty = db.query(models.Faculty).filter(models.Faculty.staff_no == course_info.faculty_id).first()
        if faculty:
            faculty_name = faculty.name

    # 2. Fetch all materials (Actual uploaded files)
    materials = db.query(models.Material).filter(models.Material.course_code == clean_code).all()
    
    # 3. Define REQUIRED topics per unit
    # Change this number to whatever your HOD requires (e.g., 5 topics per unit)
    REQUIRED_PER_UNIT = 5 

    unit_status = []
    for i in range(1, 6):
        # Count ACTUAL LECTURE NOTE FILES uploaded for this unit
        count_files_uploaded = len([
            m for m in materials 
            if m.type == "Lecture Notes" and f"Unit {i}" in (m.title or "")
        ])
        
        # Check for other resources
        qb_exists = any(m.type == "Question Bank" and f"Unit {i}" in (m.title or "") for m in materials)
        video_exists = any(m.type == "YouTube Video" and f"Unit {i}" in (m.title or "") for m in materials)

        is_unit_complete = count_files_uploaded >= REQUIRED_PER_UNIT

        unit_status.append({
            "unit": i, 
            "topic_count": count_files_uploaded,
            "required_count": REQUIRED_PER_UNIT,
            "completed": is_unit_complete,
            "qb_done": qb_exists,
            "video_done": video_exists
        })

    # 4. Return EVERYTHING
    return {
        "course_details": {
            "staff_name": faculty_name,
            "subject_id": clean_code,
            "subject_name": subject_title,
            "section": section
        },
        "units": unit_status,
        "qb_completed": all(u["qb_done"] for u in unit_status),
        "videos_completed": all(u["video_done"] for u in unit_status),
        "assignments_count": len([m for m in materials if m.type == "Assignment"])
    }

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
            # 🌟 FIX: Changed '0' to 'None' so PostgreSQL accepts it as a NULL foreign key
            cid = course.id if course else None

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
    if identifier.isdigit():
        return db.query(models.Material).filter(models.Material.course_id == int(identifier)).all()
    
    clean_id = identifier.strip().upper()
    materials = db.query(models.Material).filter(
        (models.Material.course_code == clean_id) | 
        (models.Material.course_code.ilike(f"%{clean_id}%"))
    ).all()
    
    if materials: return materials

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

@app.post("/announcements")
def create_announcement(announcement: schemas.AnnouncementCreate, db: Session = Depends(get_db)):
    cleaned_code = "Global"
    if announcement.course_code and announcement.course_code.upper() != "GLOBAL":
        cleaned_code = announcement.course_code.upper().replace(' (LAB)', '').replace('(LAB)', '').strip()

    db_announcement = models.Announcement(
        title=announcement.title, 
        content=announcement.content, 
        type=announcement.type,
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
    type: Optional[str] = None, 
    section: Optional[str] = None, 
    student_id: Optional[str] = None,
    course_code: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Announcement)
    
    # 1. Filter by Type or Audience
    if type:
        # If a specific type (like "Lab" or "Subject") is requested, fetch it
        query = query.filter(models.Announcement.type == type)
    elif audience == "Student" or student_id:
        # 🌟 FIX: Explicitly allow "Lab" and "Subject" for students
        query = query.filter(models.Announcement.type.in_(["Global", "Student", "Subject", "Placement", "Lab"]))
    elif audience == "Faculty":
        query = query.filter(models.Announcement.type.in_(["Global", "Faculty"]))
    else:
        query = query.filter(models.Announcement.type == "Global")

    # 2. Filter by Student's Section
    if student_id:
        student = db.query(models.Student).filter(models.Student.roll_no == student_id).first()
        if student:
            # Match the student's exact section OR "All"
            query = query.filter((models.Announcement.section == "All") | (models.Announcement.section == student.section))
            
    # 3. Filter by explicit Section (if passed)
    if section:
        query = query.filter((models.Announcement.section == "All") | (models.Announcement.section == section))
        
    # 4. Filter by explicit Course Code (if passed)
    if course_code:
        cleaned_course = course_code.upper().replace(' (LAB)', '').replace('(LAB)', '').strip()
        query = query.filter(models.Announcement.course_code == cleaned_course)
    
    announcements = query.order_by(models.Announcement.id.desc()).all()
    
    # 5. Enrich announcements with faculty name
    enriched_announcements = []
    for ann in announcements:
        ann_dict = {
            "id": ann.id,
            "title": ann.title,
            "content": ann.content,
            "type": ann.type,
            "target_year": ann.target_year,
            "external_link": ann.external_link,
            "course_code": ann.course_code,
            "section": ann.section,
            "posted_by": ann.posted_by,
            "created_at": ann.created_at
        }
        
        # Fetch faculty name if posted_by is a staff number
        faculty = db.query(models.Faculty).filter(models.Faculty.staff_no == ann.posted_by).first()
        if faculty:
            ann_dict["faculty_name"] = faculty.name
        else:
            ann_dict["faculty_name"] = ann.posted_by
        
        enriched_announcements.append(ann_dict)
    
    return enriched_announcements

@app.delete("/announcements/{announcement_id}")
def delete_announcement(announcement_id: int, db: Session = Depends(get_db)):
    ann = db.query(models.Announcement).filter(models.Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    db.delete(ann)
    db.commit()
    return {"message": "Announcement deleted successfully"}

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

@app.get("/admin/faculty-performance")
def get_faculty_performance(db: Session = Depends(get_db)):
    """Summary of all faculty upload activities for the Admin."""
    faculties = db.query(models.Faculty).all()
    report = []
    for f in faculties:
        count = db.query(models.Material).filter(models.Material.posted_by == f.staff_no).count()
        report.append({
            "name": f.name,
            "staff_no": f.staff_no,
            "total_uploads": count,
            "last_active": "Recent" if count > 0 else "Never"
        })
    return report

@app.get("/debug/materials")
def debug_all_materials(db: Session = Depends(get_db)):
    materials = db.query(models.Material).all()
    return {"total": len(materials), "materials": [{"id": m.id, "code": m.course_code, "type": m.type, "title": m.title} for m in materials]}

    # --- CLASS ADVISOR UI ENDPOINTS ---
@app.get("/advisors")
def get_all_advisors(db: Session = Depends(get_db)):
    """Fetches all assigned class advisors for the Admin Panel"""
    # Look up all advisor records
    # (Assuming your models.py has a ClassAdvisor model; adapt the model name if slightly different)
    advisors = db.query(models.ClassAdvisor).all() if hasattr(models, 'ClassAdvisor') else []
    
    result = []
    for adv in advisors:
        # Find the faculty's name to display in the UI
        faculty = db.query(models.Faculty).filter(models.Faculty.staff_no == adv.faculty_id).first()
        result.append({
            "advisor_no": adv.advisor_no,
            "faculty_id": adv.faculty_id,
            "faculty_name": faculty.name if faculty else "Unknown Faculty",
            "year": adv.year,
            "semester": adv.semester,
            "section": adv.section
        })
    return result

@app.delete("/advisors/{advisor_no}")
def delete_advisor(advisor_no: str, db: Session = Depends(get_db)):
    """Deletes a class advisor assignment"""
    if hasattr(models, 'ClassAdvisor'):
        adv = db.query(models.ClassAdvisor).filter(models.ClassAdvisor.advisor_no == advisor_no).first()
        if not adv:
            raise HTTPException(status_code=404, detail="Advisor not found")
        db.delete(adv)
        db.commit()
        return {"message": "Advisor assignment removed successfully"}
    raise HTTPException(status_code=500, detail="Advisor model not found")