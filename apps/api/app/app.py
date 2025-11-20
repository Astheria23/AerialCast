from flask import Flask
from .config import Config
from .extensions import db, migrate, jwt
from .models import master # Import models to be detected by Flask-Migrate

def create_app(config_class=Config):

    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    @app.route('/test')
    def test_page():
        return '<h1>Server Running</h1>'

    return app
    



