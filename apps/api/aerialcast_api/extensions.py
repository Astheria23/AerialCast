"""Shared Flask extensions instantiated once per application."""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS


db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()

__all__ = ["db", "migrate", "jwt", "cors"]
