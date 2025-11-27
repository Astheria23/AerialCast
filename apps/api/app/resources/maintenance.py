from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from ..schemas import MaintenanceLogSchema
from ..services.maintenance_service import MaintenanceService

blp = Blueprint("Maintenance", "maintenance", description="Drone Maintenance Logs", url_prefix="/api/v1")

@blp.route("/drones/<uuid:drone_id>/maintenance")
class DroneMaintenanceList(MethodView):

    @blp.doc(security=[{"BearerAuth": []}])
    @jwt_required()
    @blp.response(200, MaintenanceLogSchema(many=True))
    def get(self, drone_id):
        """Get maintenance history for a drone"""
        return MaintenanceService.get_logs_by_drone(drone_id)
    
    @blp.doc(security=[{"BearerAuth": []}])
    @jwt_required()
    @blp.arguments(MaintenanceLogSchema)
    @blp.response(201, MaintenanceLogSchema)
    def post(self, log_data, drone_id):
        """Add maintenance log entry"""
        user_id = get_jwt_identity()
        result, status = MaintenanceService.create_log(drone_id, log_data, user_id)
        
        if status != 201:
            error = result.get("error") if isinstance(result, dict) else str(result)
            abort(status, message=error)
        return result

@blp.route("/maintenance/<uuid:log_id>")
class MaintenanceDetail(MethodView):
    
    @blp.doc(security=[{"BearerAuth": []}])
    @jwt_required()
    @blp.arguments(MaintenanceLogSchema(partial=True))
    @blp.response(200, MaintenanceLogSchema)
    def put(self, log_data, log_id):
        """Update a log entry"""
        user_id = get_jwt_identity()
        claims = get_jwt()
        role = claims.get("role")
        
        result, status = MaintenanceService.update_log(log_id, log_data, user_id, role)
        if status != 200:
            abort(status, message=result.get("error"))
        return result
    
    @blp.doc(security=[{"BearerAuth": []}])
    @jwt_required()
    def delete(self, log_id):
        """Delete a log entry"""
        user_id = get_jwt_identity()
        claims = get_jwt()
        role = claims.get("role")
        
        result, status = MaintenanceService.delete_log(log_id, user_id, role)
        if status != 200:
            abort(status, message=result.get("error"))
        return result