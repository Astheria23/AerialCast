# apps/api/app/resources/flight_session.py

from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required
from ..schemas import FlightSessionSchema, TelemetryDataSchema
from ..services.flight_session_service import FlightSessionService

blp = Blueprint("FlightSessions", "flight_sessions", description="Flight Execution & Logs", url_prefix="/api/v1/sessions")

@blp.route("/")
class SessionList(MethodView):
    @jwt_required()
    @blp.response(200, FlightSessionSchema(many=True))
    def get(self):
        """List all flight history (Logbook)"""
        return FlightSessionService.get_all_sessions()

@blp.route("/<uuid:session_id>")
class SessionDetail(MethodView):
    @jwt_required()
    @blp.response(200, FlightSessionSchema)
    def get(self, session_id):
        """Get session details"""
        return FlightSessionService.get_session_by_id(session_id)

@blp.route("/<uuid:session_id>/replay")
class SessionReplay(MethodView):
    @jwt_required()
    @blp.response(200, TelemetryDataSchema(many=True))
    def get(self, session_id):
        """Get ALL telemetry data for replay (Heavy!)"""
        return FlightSessionService.get_telemetry_replay(session_id)

@blp.route("/<uuid:session_id>/end")
class SessionEnd(MethodView):
    @jwt_required()
    @blp.response(200, FlightSessionSchema)
    def post(self, session_id):
        """Force end a session"""
        return FlightSessionService.end_session(session_id)