import os
from datetime import timedelta

# Resolve base dir two levels up from this file: apps/api
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'secret_key')
    # Prefer DATABASE_URL if provided; fallback to a local SQLite file for dev
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL') or f"sqlite:///{os.path.join(BASE_DIR, 'aerialcast.db')}"
    # Correct config key is plural
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'secret_jwt')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    # Fix env var typo: SUPABASE_KEY
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')
    SUPABASE_STORAGE_BUCKET = os.getenv('SUPABASE_STORAGE_BUCKET', 'drone-image')
    
    