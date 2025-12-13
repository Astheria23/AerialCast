"""AerialCast backend package."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable

from flask import Flask
from flask_smorest import Api

from .blueprints import discover_blueprints
from .config.settings import get_config
from .extensions import cors, db, jwt, migrate


PACKAGE_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = PACKAGE_ROOT.parent


def _register_blueprints(api: Api, blueprints: Iterable) -> None:
	for blueprint in blueprints:
		if blueprint is None:
			continue
		api.register_blueprint(blueprint)


def create_app(env: str | None = None) -> Flask:
	"""Application factory used by both API and background tasks."""

	app = Flask(__name__)

	config_class = get_config(env or os.getenv("AERIALCAST_ENV") or os.getenv("FLASK_ENV"))
	app.config.from_object(config_class)

	allowed_origins = app.config.get("CORS_ALLOWED_ORIGINS")
	if isinstance(allowed_origins, str):
		allowed_origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]
	default_origins = [
		"http://localhost:3000",
		"http://127.0.0.1:3000",
	]
	if isinstance(allowed_origins, (list, tuple, set)):
		default_origins.extend(str(origin).strip() for origin in allowed_origins if str(origin).strip())
	# Deduplicate while preserving order for deterministic configs
	deduped_origins: list[str] = []
	for origin in default_origins:
		if origin not in deduped_origins:
			deduped_origins.append(origin)

	cors.init_app(
		app,
		resources={r"/api/*": {"origins": deduped_origins}},
		supports_credentials=True,
	)

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

	migrations_dir = PROJECT_ROOT / "db" / "migrations"

	db.init_app(app)
	migrate.init_app(app, db, directory=str(migrations_dir))
	jwt.init_app(app)

	api = Api(app)
	_register_blueprints(api, discover_blueprints())

	return app


__all__ = ["create_app"]
