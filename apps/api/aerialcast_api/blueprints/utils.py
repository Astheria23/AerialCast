from functools import wraps
import hashlib
import os

from flask import request, current_app
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
            client_ip = request.headers.get("X-Forwarded-For", request.remote_addr)
            path = request.path
            method = request.method

            if auth.startswith("Bearer "):
                token = auth.split(" ", 1)[1].strip()
                rig_bearer = os.getenv("RIG_AUTH_BEARER", "").strip()
                if rig_bearer:
                    if token == rig_bearer:
                        try:
                            masked = f"{token[:6]}...{token[-6:]}" if len(token) > 12 else token
                        except Exception:
                            masked = "<unreadable>"
                        current_app.logger.info(
                            "ext-auth accepted (rig bearer): ip=%s path=%s client=%s",
                            client_ip,
                            path,
                            masked,
                        )
                        return fn(*args, **kwargs)
                
                try:
                    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
                except Exception:
                    token_hash = None
                try:
                    if len(token) > 12:
                        masked = f"{token[:6]}...{token[-6:]}"
                    else:
                        masked = token
                except Exception:
                    masked = "<unreadable>"

                current_app.logger.info(
                    "ext-auth attempt: ip=%s method=%s path=%s token_mask=%s token_hash=%s",
                    client_ip,
                    method,
                    path,
                    masked,
                    token_hash,
                )

                hashes = os.getenv("EXTERNAL_SERVICE_TOKEN_HASHES", "")
                allowed = [h.strip() for h in hashes.split(",") if h.strip()]
                if token_hash and token_hash in allowed:
                    current_app.logger.info(
                        "ext-auth accepted: ip=%s path=%s client=%s",
                        client_ip,
                        path,
                        masked,
                    )
                    return fn(*args, **kwargs)
                else:
                    current_app.logger.warning(
                        "ext-auth rejected: ip=%s path=%s token_hash=%s not in allowed",
                        client_ip,
                        path,
                        token_hash,
                    )

            try:
                verify_jwt_in_request()
            except Exception as exc:
                current_app.logger.warning(
                    "jwt verification failed: ip=%s path=%s error=%s",
                    client_ip,
                    path,
                    str(exc),
                )
                abort(401, message="Missing or invalid authentication")
            return fn(*args, **kwargs)

        return wrapper

    return decorator


__all__ = ["abort_with_payload", "ext_api_or_jwt_required"]

