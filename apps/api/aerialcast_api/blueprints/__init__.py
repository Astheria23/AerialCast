"""Blueprint package collecting all REST endpoints."""

from importlib import import_module
from pkgutil import iter_modules
from pathlib import Path
from typing import Iterable

from flask import Blueprint


_BLUEPRINT_PACKAGE = Path(__file__).resolve().parent


def discover_blueprints() -> Iterable[Blueprint]:
    """Dynamically import blueprint modules and yield their Flask blueprints.

    Each subpackage is expected to expose a module-level variable named
    ``blp`` (mirroring the current Flask-Smorest pattern) or a function
    ``register_blueprint(api)``. Discovery remains optional until modules
    are migrated.
    """

    for module_info in iter_modules([str(_BLUEPRINT_PACKAGE)]):
        if not module_info.ispkg:
            continue
        module = import_module(f"{__name__}.{module_info.name}.routes")
        blueprint = getattr(module, "blp", None)
        if blueprint is not None:
            yield blueprint


__all__ = ["discover_blueprints"]
