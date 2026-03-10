import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

# PostgreSQL connection configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres.uwsckiidzqbfizrqnjjz:8590529494%40%23@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
