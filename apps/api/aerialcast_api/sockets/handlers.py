"""Socket.IO namespace handlers and auth middleware."""

from __future__ import annotations

from typing import Any, Dict, Optional

from flask import request
from flask_jwt_extended import decode_token

from ..extensions import socketio
from .events import TELEMETRY_NAMESPACE


def _extract_token(auth_payload: Optional[Dict[str, Any]]) -> Optional[str]:
	"""Return JWT from auth payload, query string, or Authorization header."""

	if auth_payload and isinstance(auth_payload, dict):
		token = auth_payload.get("token")
		if token:
			return token
	token = request.args.get("token")
	if token:
		return token
	header = request.headers.get("Authorization")
	if header and header.lower().startswith("bearer "):
		return header.split(" ", 1)[1]
	return None


def _verify_token(token: str) -> Dict[str, Any]:
	try:
		decoded = decode_token(token)
	except Exception as exc:  # pragma: no cover - surface to client
		raise ConnectionRefusedError("invalid_token") from exc
	if decoded.get("type") != "access":
		raise ConnectionRefusedError("invalid_token_type")
	return decoded


@socketio.on("connect", namespace=TELEMETRY_NAMESPACE)
def handle_connect(auth):
	token = _extract_token(auth)
	if not token:
		raise ConnectionRefusedError("missing_token")

	decoded = _verify_token(token)

	# Stash useful context on the Socket.IO session for downstream handlers.
	request.environ["aerialcast.socket.identity"] = decoded.get("sub")
	request.environ["aerialcast.socket.claims"] = decoded.get("claims", {})


@socketio.on("disconnect", namespace=TELEMETRY_NAMESPACE)
def handle_disconnect():  # pragma: no cover - simple cleanup
	request.environ.pop("aerialcast.socket.identity", None)
	request.environ.pop("aerialcast.socket.claims", None)