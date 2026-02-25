from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# --- 1. DATABASE CONNECTION ---
# Replace [YOUR-PASSWORD] and [YOUR-PROJECT-REF] with your actual Supabase details
# You can find this URI in Supabase under Settings > Database
# Use YOUR real password and YOUR real reference ID
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
# Depending on your SQLAlchemy version, this import might be slightly different. 
# Keep whatever declarative_base import you already have at the top of your file!

# 🌟 1. Change to offline SQLite database URL
SQLALCHEMY_DATABASE_URL = "sqlite:///./weboops.db"

# 🌟 2. Create the engine with the special SQLite argument
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False} # Required for SQLite with FastAPI
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- 3. SESSION FACTORY ---
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- 4. BASE CLASS ---
# This is the base for your "syllabus_topics" model
Base = declarative_base()

# --- 5. DATABASE DEPENDENCY ---
def get_db():
    """
    Creates a new SQLAlchemy session for a single request 
    and closes it once the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()