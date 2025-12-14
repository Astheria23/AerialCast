"""Alert feed endpoints."""

from uuid import UUID

from flask import request
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required

from ...models.enums import AlertType
from ...repositories import AlertRepository, FlightSessionRepository
from ...schemas import AlertSchema


blp = Blueprint(
    "Alerts",
    "alerts",
    description="Flight safety alert feed",
    url_prefix="/api/v1/alerts",
)


@blp.route("/", strict_slashes=False)
class AlertCollection(MethodView):
    @jwt_required()
    @blp.response(200, AlertSchema(many=True))
    def get(self):
        """List alerts scoped by session or mission."""

        session_id = _parse_uuid(request.args.get("session_id"), "session_id")
        mission_id = _parse_uuid(request.args.get("mission_id"), "mission_id")
        alert_type = _parse_alert_type(request.args.get("type"))
        limit = _parse_limit(request.args.get("limit"))

        if session_id:
            return AlertRepository.list_for_session(
                session_id, alert_type=alert_type, limit=limit
            )

        if mission_id:
            sessions = FlightSessionRepository.list_filtered(mission_id=mission_id)
            session_ids = [entry.session_id for entry in sessions]
            alerts = AlertRepository.list_for_sessions(session_ids, limit=None)
            if alert_type is not None:
                alerts = [entry for entry in alerts if entry.alert_type == alert_type]
            if limit is not None:
                alerts = alerts[:limit]
            return alerts

        abort(400, message="Provide either session_id or mission_id to query alerts")


def _parse_uuid(raw, param_name):
    if raw in (None, ""):
        return None
    try:
        return UUID(raw)
    except (ValueError, TypeError):
        abort(400, message=f"Invalid {param_name}")


def _parse_limit(raw):
    if raw in (None, ""):
        return None
    try:
        value = int(raw)
    except (TypeError, ValueError):
        abort(400, message="limit must be an integer")
    if value <= 0:
        abort(400, message="limit must be positive")
    return value


def _parse_alert_type(raw):
    if raw in (None, ""):
        return None
    candidate = raw.strip().upper()
    try:
        return AlertType[candidate]
    except KeyError:
        allowed = ", ".join(member.name for member in AlertType)
        abort(400, message=f"Unknown alert type '{raw}'. Allowed: {allowed}")


__all__ = ["blp"]
