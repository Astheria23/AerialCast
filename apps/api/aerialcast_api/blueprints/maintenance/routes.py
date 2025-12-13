"""Maintenance log routes."""

from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from ...schemas import (
	MaintenanceAssigneeSchema,
	MaintenanceLogCreateSchema,
	MaintenanceLogSchema,
	MaintenanceLogUpdateSchema,
)
from ...services.maintenance_service import MaintenanceService
from ..utils import abort_with_payload


blp = Blueprint(
	"Maintenance",
	"maintenance",
	description="Drone Maintenance Logs",
	url_prefix="/api/v1",
)


@blp.route("/drones/<uuid:drone_id>/maintenance", strict_slashes=False)
class DroneMaintenanceList(MethodView):
	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	@blp.response(200, MaintenanceLogSchema(many=True))
	def get(self, drone_id):
		"""Get maintenance history for a drone."""

		return MaintenanceService.get_logs_by_drone(drone_id)

	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	@blp.arguments(MaintenanceLogCreateSchema)
	@blp.response(201, MaintenanceLogSchema)
	def post(self, log_data, drone_id):
		"""Add a maintenance log entry."""

		user_id = get_jwt_identity()
		claims = get_jwt()
		role = claims.get("role")
		if role != "ADMIN":
			abort_with_payload(403, {"error": "Only admins can schedule maintenance"})

		result, status = MaintenanceService.create_log(drone_id, log_data, user_id)

		if status != 201:
			abort_with_payload(status, result)
		return result


@blp.route("/maintenance/<uuid:log_id>", strict_slashes=False)
class MaintenanceDetail(MethodView):
	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	@blp.arguments(MaintenanceLogUpdateSchema)
	@blp.response(200, MaintenanceLogSchema)
	def put(self, log_data, log_id):
		"""Update a maintenance log."""

		user_id = get_jwt_identity()
		claims = get_jwt()
		role = claims.get("role")

		result, status = MaintenanceService.update_log(log_id, log_data, user_id, role)
		if status != 200:
			abort_with_payload(status, result)
		return result

	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	def delete(self, log_id):
		"""Delete a maintenance log."""

		user_id = get_jwt_identity()
		claims = get_jwt()
		role = claims.get("role")

		result, status = MaintenanceService.delete_log(log_id, user_id, role)
		if status != 200:
			abort_with_payload(status, result)
		return result


@blp.route("/maintenance/assignees", strict_slashes=False)
class MaintenanceAssignees(MethodView):
	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	@blp.response(200, MaintenanceAssigneeSchema(many=True))
	def get(self):
		"""List available maintenance assignees (pilots)."""

		return MaintenanceService.list_assignees()


__all__ = ["blp"]
