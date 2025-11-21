import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'secret_key')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATION = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'secret_jwt')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)
    