from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# --- 1. DATABASE CONNECTION ---
# Replace [YOUR-PASSWORD] and [YOUR-PROJECT-REF] with your actual Supabase details
# You can find this URI in Supabase under Settings > Database
# Use YOUR real password and YOUR real reference ID
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:VMOUNISH123456@db.hwxypsgyczekbhfkgakl.supabase.co:5432/postgres"

# --- 2. ENGINE CONFIGURATION ---
# We remove SQLite-specific 'check_same_thread' as it's not needed for PostgreSQL
engine = create_engine(SQLALCHEMY_DATABASE_URL)

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