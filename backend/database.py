from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# The database file path
SQLALCHEMY_DATABASE_URL = "sqlite:///./college_app.db"

# Engine configuration for SQLite
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models - DO NOT import this, define it here once.
Base = declarative_base()

# --- Dependency for API Routers ---
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