"""Socket.IO namespace handlers and auth middleware."""

from __future__ import annotations

from typing import Any, Dict, Optional

from flask_socketio import emit, join_room, leave_room

from flask import request
from flask_jwt_extended import decode_token

from ..extensions import socketio
from .events import TELEMETRY_NAMESPACE, session_room


def _emit_to_self(event: str, payload: Dict[str, Any]) -> None:
	sid = getattr(request, "sid", None)
	if sid is None:
		return
	emit(event, payload, to=sid)


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


@socketio.on("join_session", namespace=TELEMETRY_NAMESPACE)
def handle_join_session(data):
	if not isinstance(data, dict):
		_emit_to_self("join_session_error", {"error": "payload_must_be_object"})
		return
	session_id = data.get("session_id")
	if not session_id:
		_emit_to_self("join_session_error", {"error": "session_id_required"})
		return

	room = session_room(session_id)
	join_room(room)
	_emit_to_self("joined_session", {"session_id": session_id})


@socketio.on("leave_session", namespace=TELEMETRY_NAMESPACE)
def handle_leave_session(data):
	if not isinstance(data, dict):
		_emit_to_self("leave_session_error", {"error": "payload_must_be_object"})
		return
	session_id = data.get("session_id")
	if not session_id:
		_emit_to_self("leave_session_error", {"error": "session_id_required"})
		return

	room = session_room(session_id)
	leave_room(room)
	_emit_to_self("left_session", {"session_id": session_id})