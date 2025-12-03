"""AerialCast backend package."""

from __future__ import annotations

import os
from typing import Iterable

from flask import Flask
from flask_smorest import Api

from .blueprints import discover_blueprints
from .config.settings import get_config
from .extensions import cors, db, jwt, migrate


def _register_blueprints(api: Api, blueprints: Iterable):
	for blueprint in blueprints:
		if blueprint is None:
			continue
		api.register_blueprint(blueprint)


def create_app(env: str | None = None) -> Flask:
	"""Application factory used by both API and background tasks."""

	app = Flask(__name__)
	cors.init_app(app)

	config_class = get_config(env or os.getenv("AERIALCAST_ENV") or os.getenv("FLASK_ENV"))
	app.config.from_object(config_class)

	app.config.setdefault("API_TITLE", "AerialCast API")
	app.config.setdefault("API_VERSION", "v1")
	app.config.setdefault("OPENAPI_VERSION", "3.0.3")
	app.config.setdefault("OPENAPI_URL_PREFIX", "/")
	app.config.setdefault("OPENAPI_SWAGGER_UI_PATH", "/docs")
	app.config.setdefault(
		"OPENAPI_SWAGGER_UI_URL", "https://cdn.jsdelivr.net/npm/swagger-ui-dist/"
	)
	app.config.setdefault(
		"API_SPEC_OPTIONS",
		{
			"components": {
				"securitySchemes": {
					"BearerAuth": {
						"type": "http",
						"scheme": "bearer",
						"bearerFormat": "JWT",
					}
				}
			},
			"security": [{"BearerAuth": []}],
		},
	)

	db.init_app(app)
	migrate.init_app(app, db)
	jwt.init_app(app)

	api = Api(app)
	_register_blueprints(api, discover_blueprints())

	return app


__all__ = ["create_app"]
