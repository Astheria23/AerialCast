from functools import wraps
import hashlib
import os

from flask import request
from flask_smorest import abort
from flask_jwt_extended import verify_jwt_in_request


def abort_with_payload(status_code, payload):
    """Abort a request preserving any structured error payload."""
    if isinstance(payload, dict):
        abort(status_code, **payload)
    abort(status_code, message=str(payload))


def ext_api_or_jwt_required():
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth = request.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                token = auth.split(" ", 1)[1].strip()
                try:
                    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
                except Exception:
                    token_hash = None

                hashes = os.getenv("EXTERNAL_SERVICE_TOKEN_HASHES", "")
                allowed = [h.strip() for h in hashes.split(",") if h.strip()]
                if token_hash and token_hash in allowed:
                    # External service token matched — allow request.
                    return fn(*args, **kwargs)

            # Fallback to normal JWT verification used by the app.
            try:
                verify_jwt_in_request()
            except Exception:
                abort(401, message="Missing or invalid authentication")
            return fn(*args, **kwargs)

        return wrapper

    return decorator


__all__ = ["abort_with_payload", "ext_api_or_jwt_required"]

