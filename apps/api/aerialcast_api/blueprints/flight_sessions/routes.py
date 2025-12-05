"""Flight execution and telemetry routes."""

from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required

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
		"""List all flight history."""

		return FlightSessionService.get_all_sessions()


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

		return FlightSessionService.get_telemetry_replay(session_id)


@blp.route("/<uuid:session_id>/end", strict_slashes=False)
class SessionEnd(MethodView):
	@jwt_required()
	@blp.response(200, FlightSessionSchema)
	def post(self, session_id):
		"""Force end a session."""

		return FlightSessionService.end_session(session_id)


__all__ = ["blp"]
