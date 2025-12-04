"""Socket.IO emission helpers for realtime updates."""

from __future__ import annotations

from typing import Any, Dict, Mapping

from ..extensions import socketio
from ..models.execution import FlightSession, TelemetryData
from ..models.master import Drone, User
from ..models.planning import Mission

_DEFAULT_NAMESPACE = "/telemetry"


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


def _emit(event: str, payload: Mapping[str, Any], namespace: str = _DEFAULT_NAMESPACE) -> None:
    socketio.emit(event, payload, namespace=namespace)


def emit_session_started(session: FlightSession) -> None:
    """Broadcast that a new session has started."""

    _emit("session_started", _session_payload(session))


def emit_session_resumed(session: FlightSession) -> None:
    """Broadcast that telemetry resumed for an existing active session."""

    _emit("session_resumed", _session_payload(session))


def emit_session_ended(session: FlightSession) -> None:
    """Broadcast that a session has ended or been closed."""

    _emit("session_ended", _session_payload(session))


def emit_telemetry_update(session: FlightSession, telemetry: TelemetryData) -> None:
    """Broadcast a live telemetry update for an active session."""

    _emit("telemetry_update", _telemetry_payload(session, telemetry))


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


__all__ = [
    "emit_session_started",
    "emit_session_resumed",
    "emit_session_ended",
    "emit_telemetry_update",
    "emit_mission_status_changed",
]
