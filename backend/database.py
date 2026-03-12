import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure .env is loaded from the project root
backend_dir = Path(__file__).parent.resolve()
project_root = backend_dir.parent.resolve()
dotenv_path = project_root / ".env"
load_dotenv(dotenv_path=dotenv_path)

# Get database type from environment: 'mysql' or 'postgres'
# AUTO-SWITCH: If on Render, default to 'postgres'
is_render = os.getenv("RENDER") == "true"
DB_TYPE = os.getenv("DB_TYPE", "postgres" if is_render else "mysql").lower()

if DB_TYPE in ["postgres", "postgresql", "psql"]:
    # PostgreSQL / Supabase Configuration
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        # Fallback to a default
        DATABASE_URL = "postgresql+psycopg2://postgres.uwsckiidzqbfizrqnjjz:8590529494%40%23@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
    
    # Ensure we use the correct driver prefix for SQLAlchemy
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
        
    print(f"Backend: Using PostgreSQL Engine (Supabase)")
else:
    # MySQL Configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASS = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "meetingai")
    
    DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}"
    print(f"Backend: Using Local MySQL Engine ({DB_HOST}/{DB_NAME})")

# Create engine based on the selected URL
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)