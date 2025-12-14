"""Configuration objects for different environments.

These classes will replace the legacy Config class once modules are moved
from the app/ package. For now they serve as placeholders so other parts of

the refactor can target a stable import path.
"""

from __future__ import annotations

from dataclasses import dataclass
import os
from datetime import timedelta
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class BaseConfig:
    """Common configuration values shared across environments."""

    SECRET_KEY: str = os.getenv("SECRET_KEY", "secret_key")
    DATABASE_URL: str | None = os.getenv("DATABASE_URL")
    SQLALCHEMY_DATABASE_URI: str = (
        DATABASE_URL
        or f"sqlite:///{BASE_DIR / 'aerialcast.db'}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "secret_jwt")
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(hours=12)
    SUPABASE_URL: str | None = os.getenv("SUPABASE_URL")
    SUPABASE_KEY: str | None = os.getenv("SUPABASE_KEY")
    SUPABASE_STORAGE_BUCKET: str = os.getenv("SUPABASE_STORAGE_BUCKET", "drone-image")
    CORS_ALLOWED_ORIGINS: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    )


@dataclass(frozen=True)
class DevelopmentConfig(BaseConfig):
    """Development-specific overrides."""

    DEBUG: bool = True


@dataclass(frozen=True)
class ProductionConfig(BaseConfig):
    """Production-specific configuration."""

    DEBUG: bool = False


def get_config(env: str | None) -> type[BaseConfig]:
    """Return a config class based on the requested environment."""

    normalized = (env or "development").lower()
    if normalized in {"prod", "production"}:
        return ProductionConfig
    return DevelopmentConfig
