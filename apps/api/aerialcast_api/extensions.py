"""Shared Flask extensions instantiated once per application."""

from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()
# Allow origins to be refined via ``app.config['SOCKETIO_CORS_ALLOWED_ORIGINS']``.
socketio = SocketIO(cors_allowed_origins="*")


__all__ = ["db", "migrate", "jwt", "cors", "socketio"]
