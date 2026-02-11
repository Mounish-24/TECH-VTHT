# backend/routers/placements.py
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import os, time, shutil
from .. import models, database

router = APIRouter(prefix="/placements", tags=["Placements"])

UPLOAD_DIR = "uploaded_files"

# 1. SEND TARGETED ANNOUNCEMENTS (Requirement 1)
@router.post("/announcements")
def create_placement_announcement(
    title: str = Form(...),
    description: str = Form(...),
    link: Optional[str] = Form(None),
    year: int = Form(...),
    posted_by: str = Form(...),
    db: Session = Depends(database.get_db)
):
    new_ann = models.Announcement(
        title=title,
        content=description,
        external_link=link,
        target_year=year,
        type="Placement",
        posted_by=posted_by
    )
    db.add(new_ann)
    db.commit()
    return {"message": "Placement notice broadcasted successfully"}

# 2. UPLOAD PLACED STUDENT + LINKEDIN (Requirement 2)
@router.post("/student")
async def add_placed_student(
    name: str = Form(...),
    company: str = Form(...),
    lpa: float = Form(...),
    linkedin: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    filename = f"placed_{int(time.time())}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
            
    new_placement = models.PlacedStudent(
        name=name, 
        company_name=company, 
        lpa=lpa,
        linkedin_url=linkedin,
        photo_url=f"http://localhost:8000/static/{filename}"
    )
    db.add(new_placement)
    db.commit()
    return {"message": "Student record added"}

# 3. ADD COMPANY LOGO (For Home Page Marquee)
@router.post("/companies")
async def add_company(name: str = Form(...), file: UploadFile = File(...), db: Session = Depends(database.get_db)):
    filename = f"logo_{int(time.time())}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    new_company = models.Company(name=name, logo_url=f"http://localhost:8000/static/{filename}")
    db.add(new_company)
    db.commit()
    return {"message": "Logo added to homepage marquee"}

# 4. DELETE OPTION (Requirement 3)
@router.delete("/announcements/{ann_id}")
def delete_announcement(ann_id: int, db: Session = Depends(database.get_db)):
    ann = db.query(models.Announcement).filter(models.Announcement.id == ann_id).first()
    if ann:
        db.delete(ann)
        db.commit()
        return {"message": "Notice deleted"}
    raise HTTPException(status_code=404, detail="Not found")