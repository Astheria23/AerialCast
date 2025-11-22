from flask import Flask
from flask_smorest import Api
from .config import Config
from .extensions import db,migrate,jwt

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    app.config["API_TITLE"] = "AerialCast API"
    app.config["API_VERSION"] = "v1"
    app.config["OPENAPI_VERSION"] = "3.0.3"
    app.config["OPENAPI_URL_PREFIX"] = "/"
    app.config["OPENAPI_SWAGGER_UI_PATH"] = "/docs" 
    app.config["OPENAPI_SWAGGER_UI_URL"] = "https://cdn.jsdelivr.net/npm/swagger-ui-dist/" 

    db.init_app(app)
    migrate.init_app(app,db)
    jwt.init_app(app)

    api = Api(app)

    from . import models

    from .resources.auth import blp as AuthBlueprint
    from .resources.fleet import blp as FleetBlueprint


    api.register_blueprint(AuthBlueprint)
    api.register_blueprint(FleetBlueprint)
    
    return app

    
