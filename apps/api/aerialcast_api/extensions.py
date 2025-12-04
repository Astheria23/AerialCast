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
# Socket.IO options (cors, message queue, etc.) are provided at init_app time.
socketio = SocketIO()


__all__ = ["db", "migrate", "jwt", "cors", "socketio"]
