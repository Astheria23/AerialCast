"""Utility helpers shared across blueprint modules."""

from flask_smorest import abort


def abort_with_payload(status_code, payload):
    """Abort a request preserving any structured error payload."""
    if isinstance(payload, dict):
        abort(status_code, **payload)
    abort(status_code, message=str(payload))


__all__ = ["abort_with_payload"]
