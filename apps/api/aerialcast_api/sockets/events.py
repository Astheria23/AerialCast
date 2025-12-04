"""Socket.IO emission helpers for realtime updates."""

from __future__ import annotations

import threading
import time
from typing import Any, Dict, Mapping, Optional

from ..extensions import socketio
from ..models.execution import FlightSession, TelemetryData
from ..models.master import Drone, User
from ..models.planning import Mission

TELEMETRY_NAMESPACE = "/telemetry"
SESSION_ROOM_PREFIX = "session:"
TELEMETRY_THROTTLE_SECONDS = 0.2

_telemetry_emit_tracker: Dict[str, float] = {}
_telemetry_tracker_lock = threading.Lock()


def _iso(value):
    return value.isoformat() if value else None


def _drone_payload(drone: Drone | None, drone_id) -> Dict[str, Any]:
    if drone is None:
        return {"drone_id": str(drone_id)}
    return {
        "drone_id": str(drone.drone_id),
        "name": drone.name,
        "model": drone.model,
        "lora_id": drone.lora_id,
        "status": drone.status.value,
    }


def _user_payload(user: User | None, user_id) -> Dict[str, Any] | None:
    if user is None and user_id is None:
        return None
    if user is None:
        return {"user_id": str(user_id)}
    return {
        "user_id": str(user.user_id),
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role.value,
    }


def _mission_payload(mission: Mission | None) -> Dict[str, Any] | None:
    if mission is None:
        return None
    return {
        "mission_id": str(mission.mission_id),
        "mission_name": mission.mission_name,
        "status": mission.status.value,
        "drone_id": str(mission.drone_id),
        "created_by_user_id": str(mission.created_by_user_id),
    }


def _session_payload(session: FlightSession) -> Dict[str, Any]:
    payload = {
        "session_id": str(session.session_id),
        "status": session.status.value,
        "start_time": _iso(session.start_time),
        "end_time": _iso(session.end_time),
        "drone": _drone_payload(getattr(session, "drone", None), session.drone_id),
        "mission": _mission_payload(getattr(session, "mission", None)),
        "pilot": _user_payload(getattr(session, "pilot", None), session.pilot_id),
    }
    return payload


def _telemetry_payload(session: FlightSession, telemetry: TelemetryData) -> Dict[str, Any]:
    data = telemetry.to_dict()
    data["drone_id"] = str(session.drone_id)
    data["mission_id"] = str(session.mission_id) if session.mission_id else None
    return data


def _emit(
    event: str,
    payload: Mapping[str, Any],
    namespace: str = TELEMETRY_NAMESPACE,
    room: Optional[str] = None,
) -> None:
    if room is not None:
        socketio.emit(event, payload, namespace=namespace, to=room)
    else:
        socketio.emit(event, payload, namespace=namespace)


def session_room(session_id) -> str:
    return f"{SESSION_ROOM_PREFIX}{session_id}"


def emit_session_started(session: FlightSession) -> None:
    """Broadcast that a new session has started."""

    payload = _session_payload(session)
    _emit("session_started", payload)
    _emit("session_started", payload, room=session_room(session.session_id))


def emit_session_resumed(session: FlightSession) -> None:
    """Broadcast that telemetry resumed for an existing active session."""

    payload = _session_payload(session)
    _emit("session_resumed", payload)
    _emit("session_resumed", payload, room=session_room(session.session_id))


def emit_session_ended(session: FlightSession) -> None:
    """Broadcast that a session has ended or been closed."""

    payload = _session_payload(session)
    _emit("session_ended", payload)
    _emit("session_ended", payload, room=session_room(session.session_id))


def emit_telemetry_update(session: FlightSession, telemetry: TelemetryData) -> None:
    """Broadcast a live telemetry update for an active session."""

    room = session_room(session.session_id)

    now = time.monotonic()
    with _telemetry_tracker_lock:
        last_emit = _telemetry_emit_tracker.get(room)
        if last_emit is not None and now - last_emit < TELEMETRY_THROTTLE_SECONDS:
            return
        _telemetry_emit_tracker[room] = now

    _emit("telemetry_update", _telemetry_payload(session, telemetry), room=room)


def emit_mission_status_changed(mission: Mission) -> None:
    """Broadcast mission status changes to connected clients."""

    _emit(
        "mission_status_changed",
        {
            "mission_id": str(mission.mission_id),
            "mission_name": mission.mission_name,
            "status": mission.status.value,
            "drone_id": str(mission.drone_id),
        },
    )


def emit_mqtt_status(event: str, detail: Mapping[str, Any]) -> None:
    """Emit MQTT connectivity status updates."""

    _emit("mqtt_status", {"event": event, **detail})


__all__ = [
    "emit_session_started",
    "emit_session_resumed",
    "emit_session_ended",
    "emit_telemetry_update",
    "emit_mission_status_changed",
    "emit_mqtt_status",
    "TELEMETRY_NAMESPACE",
    "SESSION_ROOM_PREFIX",
    "TELEMETRY_THROTTLE_SECONDS",
    "session_room",
]
