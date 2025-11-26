from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required
from ..schemas import AlertSchema
from ..models.execution import Alert

blp = Blueprint("Alerts", "alerts", description="Flight Alerts", url_prefix="/api/alerts")

@blp.route("/")
class AlertList(MethodView):
    @jwt_required()
    @blp.response(200, AlertSchema(many=True))
    def get(self):
        """Get recent alerts (Global)"""
        return Alert.query.order_by(Alert.timestamp.desc()).limit(50).all()

@blp.route("/session/<uuid:session_id>")
class SessionAlertList(MethodView):
    @jwt_required()
    @blp.response(200, AlertSchema(many=True))
    def get(self, session_id):
        """Get alerts for specific flight session"""
        return Alert.query.filter_by(session_id=session_id).order_by(Alert.timestamp.desc()).all()