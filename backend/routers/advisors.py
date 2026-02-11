from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
import time
import logging
from .. import models, database

# Configure logging to catch those 500 errors in the console
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/advisors", tags=["Class Advisor"])

# Define the base upload directory
UPLOAD_DIR = "uploads/advisor_docs"

# 1. Admin Logic: Assign a Faculty as a Class Advisor
@router.post("/assign")
def assign_advisor(
    advisor_no: str = Form(...),
    faculty_id: str = Form(...),
    year: int = Form(...),
    semester: int = Form(...),
    section: str = Form(...),
    db: Session = Depends(database.get_db)
):
    # Check if advisor mapping already exists for this class
    existing = db.query(models.ClassAdvisor).filter(
        models.ClassAdvisor.year == year,
        models.ClassAdvisor.section == section
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Advisor already assigned to this section")

    new_advisor = models.ClassAdvisor(
        advisor_no=advisor_no,
        faculty_id=faculty_id,
        year=year,
        semester=semester,
        section=section
    )
    db.add(new_advisor)
    db.commit()
    return {"message": f"Faculty {faculty_id} assigned as Advisor for Year {year} Sec {section}"}

# 2. Advisor Logic: Fetch ONLY the students belonging to this Advisor
@router.get("/my-class/{faculty_id}")
def get_advisor_class(faculty_id: str, db: Session = Depends(database.get_db)):
    mapping = db.query(models.ClassAdvisor).filter(models.ClassAdvisor.faculty_id == faculty_id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="You are not assigned as a Class Advisor")

    students = db.query(models.Student).filter(
        models.Student.year == mapping.year,
        models.Student.section == mapping.section
    ).all()
    
    return {
        "class_info": mapping,
        "students": students
    }

# 3. Advisor Logic: Update Student CGPA and Attendance
@router.put("/update-student-stats")
def update_student_stats(
    roll_no: str = Form(...),
    cgpa: float = Form(...),
    attendance: float = Form(...),
    db: Session = Depends(database.get_db)
):
    student = db.query(models.Student).filter(models.Student.roll_no == roll_no).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student.cgpa = cgpa
    student.attendance_percentage = attendance
    db.commit()
    return {"message": "Student records updated successfully"}

# 4. FINAL ROBUST Advisor Logic: Upload Timetable, Academic Planner, or Exam Timetable
@router.post("/upload-docs")
async def upload_advisor_docs(
    year: int = Form(...),
    section: str = Form(...),
    type: str = Form(...), 
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    try:
        # Create directory path
        class_folder = os.path.join(UPLOAD_DIR, str(year), section)
        os.makedirs(class_folder, exist_ok=True)
        
        # Sanitize filename and add timestamp to prevent file collision/overwrite errors
        timestamp = int(time.time())
        safe_filename = f"{timestamp}_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(class_folder, safe_filename)
        
        # Save actual file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Format path for DB (Web-friendly slashes)
        db_file_link = file_path.replace("\\", "/")
        
        # FIXED: Removed 'content' keyword because it caused 500 Internal Server Error
        new_doc = models.Material(
            title=f"{type} - Year {year} ({section})",
            type=type,
            file_link=db_file_link,
            posted_by="Class Advisor",
            course_code="Global"
        )
        
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        
        logger.info(f"File uploaded successfully: {db_file_link}")
        return {"message": f"{type} published successfully", "link": db_file_link}
        
    except Exception as e:
        db.rollback() # Important to clean up the DB session on error
        logger.error(f"Upload Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# 5. Fetch uploaded advisor documents for management
@router.get("/my-docs/{section}")
def get_my_advisor_docs(section: str, db: Session = Depends(database.get_db)):
    # Finds "Global" materials that contain the specific section tag in the title
    section_tag = f"({section})"
    docs = db.query(models.Material).filter(
        models.Material.course_code == "Global",
        models.Material.title.contains(section_tag)
    ).all()
    return docs

# 6. Delete advisor document
@router.delete("/delete-doc/{doc_id}")
def delete_advisor_doc(doc_id: int, db: Session = Depends(database.get_db)):
    doc = db.query(models.Material).filter(models.Material.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Remove actual file from the local storage
    if os.path.exists(doc.file_link):
        try:
            os.remove(doc.file_link)
        except Exception as e:
            logger.warning(f"Could not delete physical file: {str(e)}")
        
    db.delete(doc)
    db.commit()
    return {"message": "Document removed successfully"}