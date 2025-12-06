"""Flight execution and telemetry routes."""

from datetime import datetime
from uuid import UUID

from flask import request
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required

from ...models.enums import SessionStatus
from ...schemas import FlightSessionSchema, TelemetryDataSchema
from ...services.flight_session_service import FlightSessionService


blp = Blueprint(
	"FlightSessions",
	"flight_sessions",
	description="Flight Execution & Logs",
	url_prefix="/api/v1/sessions",
)


@blp.route("/", strict_slashes=False)
class SessionList(MethodView):
	@jwt_required()
	@blp.response(200, FlightSessionSchema(many=True))
	def get(self):
		"""List flight history with optional mission/status filters."""

		mission_id = _parse_uuid(request.args.get("mission_id"))
		statuses = _parse_statuses(request.args.get("status"))
		limit = _parse_limit(request.args.get("limit"))
		return FlightSessionService.get_sessions(
			mission_id=mission_id,
			statuses=statuses,
			limit=limit,
		)


@blp.route("/<uuid:session_id>", strict_slashes=False)
class SessionDetail(MethodView):
	@jwt_required()
	@blp.response(200, FlightSessionSchema)
	def get(self, session_id):
		"""Get session details."""

		return FlightSessionService.get_session_by_id(session_id)


@blp.route("/<uuid:session_id>/replay", strict_slashes=False)
class SessionReplay(MethodView):
	@jwt_required()
	@blp.response(200, TelemetryDataSchema(many=True))
	def get(self, session_id):
		"""Get telemetry data for replay."""

		since = _parse_datetime(request.args.get("since"))
		until = _parse_datetime(request.args.get("until"))
		limit = _parse_limit(request.args.get("limit"))
		sample_every = _parse_limit(request.args.get("sample_every"))
		return FlightSessionService.get_telemetry_replay(
			session_id,
			since=since,
			until=until,
			limit=limit,
			sample_every=sample_every,
		)


@blp.route("/<uuid:session_id>/end", strict_slashes=False)
class SessionEnd(MethodView):
	@jwt_required()
	@blp.response(200, FlightSessionSchema)
	def post(self, session_id):
		"""Force end a session."""

		return FlightSessionService.end_session(session_id)


def _parse_uuid(value):
	if not value:
		return None
	try:
		return UUID(value)
	except (ValueError, TypeError):  # pragma: no cover - request validation
		abort(400, message="Invalid mission_id parameter")


def _parse_statuses(raw):
	if not raw:
		return None
	statuses = []
	for chunk in raw.split(","):
		name = chunk.strip().upper()
		if not name:
			continue
		try:
			statuses.append(SessionStatus[name])
		except KeyError:  # pragma: no cover - request validation
			abort(400, message=f"Unknown session status '{name}'")
	return statuses or None


def _parse_limit(raw):
	if raw is None:
		return None
	try:
		value = int(raw)
	except (TypeError, ValueError):  # pragma: no cover - request validation
		abort(400, message="Numeric parameters must be integers")
	if value <= 0:
		abort(400, message="Numeric parameters must be positive")
	return value


def _parse_datetime(raw):
	if not raw:
		return None
	text = raw.strip()
	if not text:
		return None
	try:
		if text.endswith("Z"):
			text = text[:-1] + "+00:00"
		return datetime.fromisoformat(text)
	except ValueError:  # pragma: no cover - request validation
		abort(400, message=f"Invalid datetime '{raw}'")


__all__ = ["blp"]
