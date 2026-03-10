from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime
import os
import sys
from dotenv import load_dotenv

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True)
    email = Column(String(100), unique=True)
    password_hash = Column(String(255))

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(255))
    date = Column(DateTime, default=datetime.datetime.utcnow)
    duration = Column(Integer)
    transcript = Column(Text)
    summary = Column(Text)
    classification = Column(String(50))
    source_type = Column(String(50)) # upload, link, recording
    source_path = Column(String(255))

# Get engine and session from central database.py
# Add parent dir to path to ensure we can import database.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from database import engine, SessionLocal

def init_db():
    Base.metadata.create_all(bind=engine)
