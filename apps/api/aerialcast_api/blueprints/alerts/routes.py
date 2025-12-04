"""Flight alert retrieval routes."""

from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required

from ...schemas import AlertSchema
from ...services.alert_service import AlertService


blp = Blueprint(
    "Alerts",
    "alerts",
    description="Flight Alerts",
    url_prefix="/api/v1/alerts",
)


@blp.route("/")
class AlertList(MethodView):
    @jwt_required()
    @blp.response(200, AlertSchema(many=True))
    def get(self):
        """Return all alerts stored in the system."""

        return AlertService.get_all_alerts()


@blp.route("/<uuid:alert_id>")
class AlertDetail(MethodView):
    @jwt_required()
    @blp.response(200, AlertSchema)
    def get(self, alert_id):
        """Fetch a single alert by identifier."""

        return AlertService.get_alert_by_id(alert_id)


@blp.route("/session/<uuid:session_id>")
class SessionAlertList(MethodView):
    @jwt_required()
    @blp.response(200, AlertSchema(many=True))
    def get(self, session_id):
        """List alerts scoped to a specific flight session."""

        return AlertService.get_alerts_for_session(session_id)


__all__ = ["blp"]
