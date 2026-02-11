from sqlalchemy import Column, Integer, String, ForeignKey, Float, Text, DateTime
from sqlalchemy.orm import relationship
from .database import Base
import datetime

# ==========================================
# 1. CORE USER & AUTHENTICATION
# ==========================================
class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True) # Staff_No or Roll_No or 'admin'
    role = Column(String) # Student, Faculty, HOD, Admin
    password = Column(String) 

    # Relationships
    faculty = relationship("Faculty", back_populates="user", uselist=False)
    student = relationship("Student", back_populates="user", uselist=False)

# ==========================================
# 2. FACULTY & STAFF
# ==========================================
class Faculty(Base):
    __tablename__ = "faculties"
    staff_no = Column(String, ForeignKey("users.id"), primary_key=True)
    name = Column(String)
    designation = Column(String)
    doj = Column(String)
    profile_pic = Column(String, nullable=True) 

    # Relationships
    user = relationship("User", back_populates="faculty")
    courses = relationship("Course", back_populates="assigned_faculty")
    advisor_role = relationship("ClassAdvisor", back_populates="faculty_member", uselist=False)

# ==========================================
# 3. STUDENTS
# ==========================================
class Student(Base):
    __tablename__ = "students"
    roll_no = Column(String, ForeignKey("users.id"), primary_key=True)
    name = Column(String)
    year = Column(Integer)
    semester = Column(Integer)
    section = Column(String, default="A") 
    cgpa = Column(Float, default=0.0)
    attendance_percentage = Column(Float, default=0.0) 
    profile_pic = Column(String, nullable=True) 

    # Relationships
    user = relationship("User", back_populates="student")
    academic_data = relationship("AcademicData", back_populates="student")

# ==========================================
# 4. ACADEMIC STRUCTURE (Courses, Marks, Materials)
# ==========================================
class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, index=True) 
    title = Column(String)
    semester = Column(Integer)
    credits = Column(Integer)
    category = Column(String, nullable=True)
    section = Column(String, default="A") 
    faculty_id = Column(String, ForeignKey("faculties.staff_no"), nullable=True) 

    assigned_faculty = relationship("Faculty", back_populates="courses")
    academic_data = relationship("AcademicData", back_populates="course")
    materials = relationship("Material", back_populates="course")

class AcademicData(Base):
    __tablename__ = "academic_data"
    id = Column(Integer, primary_key=True, index=True)
    student_roll_no = Column(String, ForeignKey("students.roll_no"))
    course_id = Column(Integer, ForeignKey("courses.id")) 
    course_code = Column(String) 
    subject = Column(String) 
    section = Column(String, default="A") 
    
    # Marks
    cia1_marks = Column(Float, default=0.0)
    cia1_retest = Column(Float, default=0.0) 
    cia2_marks = Column(Float, default=0.0)
    cia2_retest = Column(Float, default=0.0)
    ia1_marks = Column(Float, default=0.0) 
    ia2_marks = Column(Float, default=0.0) 
    
    subject_attendance = Column(Float, default=0.0)
    innovative_assignment_marks = Column(Float, default=0.0) 
    status = Column(String, default="Pursuing") 

    student = relationship("Student", back_populates="academic_data")
    course = relationship("Course", back_populates="academic_data")

class Material(Base):
    __tablename__ = "materials"
    id = Column(Integer, primary_key=True, index=True)
    
    # nullable=True allows "Global" advisory docs (Timetable, Planner, Exams)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True) 
    
    course_code = Column(String, nullable=True) # Will be "Global" for advisor docs
    type = Column(String) # Exam Timetable, Timetable, Academic Planner, etc.
    title = Column(String)
    file_link = Column(String)
    posted_by = Column(String) 
    created_at = Column(DateTime, default=datetime.datetime.utcnow) # Added for sorting

    course = relationship("Course", back_populates="materials")

# ==========================================
# 5. CLASS ADVISOR MAPPING
# ==========================================
class ClassAdvisor(Base):
    __tablename__ = "class_advisors"

    id = Column(Integer, primary_key=True, index=True)
    advisor_no = Column(String, unique=True, index=True) 
    faculty_id = Column(String, ForeignKey("faculties.staff_no", ondelete="CASCADE"))
    year = Column(Integer)
    semester = Column(Integer)
    section = Column(String)
    assigned_at = Column(DateTime, default=datetime.datetime.utcnow)

    faculty_member = relationship("Faculty", back_populates="advisor_role")

# ==========================================
# 6. ANNOUNCEMENTS & PLACEMENTS
# ==========================================
class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(Text)
    type = Column(String) 
    target_year = Column(Integer, nullable=True) 
    external_link = Column(String, nullable=True) 
    course_code = Column(String, nullable=True) 
    section = Column(String, default="All") 
    posted_by = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    logo_url = Column(String, nullable=False)

class PlacedStudent(Base):
    __tablename__ = "placed_students"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    dept = Column(String, default="AI & DS")
    lpa = Column(Float, nullable=False)
    company_name = Column(String, nullable=False)
    photo_url = Column(String, nullable=False)
    linkedin_url = Column(String, nullable=True)

# Add this to models.py if not already there
class Arrear(Base):
    __tablename__ = "arrears"
    id = Column(Integer, primary_key=True, index=True)
    roll_no = Column(String, index=True)  # This maps to VH NO
    name = Column(String)
    batch = Column(String)
    semester = Column(String)
    subject_code = Column(String)
    subject_name = Column(String)