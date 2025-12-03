"""Maintenance log routes."""

from flask.views import MethodView
<<<<<<< HEAD
from flask_smorest import Blueprint
=======
from flask_smorest import Blueprint, abort
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from ...schemas import MaintenanceLogSchema
from ...services.maintenance_service import MaintenanceService
<<<<<<< HEAD
from ..utils import abort_with_payload
=======
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)


blp = Blueprint(
	"Maintenance",
	"maintenance",
	description="Drone Maintenance Logs",
	url_prefix="/api/v1",
)


@blp.route("/drones/<uuid:drone_id>/maintenance")
class DroneMaintenanceList(MethodView):
	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	@blp.response(200, MaintenanceLogSchema(many=True))
	def get(self, drone_id):
		"""Get maintenance history for a drone."""

		return MaintenanceService.get_logs_by_drone(drone_id)

	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	@blp.arguments(MaintenanceLogSchema)
	@blp.response(201, MaintenanceLogSchema)
	def post(self, log_data, drone_id):
		"""Add a maintenance log entry."""

		user_id = get_jwt_identity()
		result, status = MaintenanceService.create_log(drone_id, log_data, user_id)

		if status != 201:
<<<<<<< HEAD
			abort_with_payload(status, result)
=======
			error = result.get("error") if isinstance(result, dict) else str(result)
			abort(status, message=error)
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)
		return result


@blp.route("/maintenance/<uuid:log_id>")
class MaintenanceDetail(MethodView):
	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	@blp.arguments(MaintenanceLogSchema(partial=True))
	@blp.response(200, MaintenanceLogSchema)
	def put(self, log_data, log_id):
		"""Update a maintenance log."""

		user_id = get_jwt_identity()
		claims = get_jwt()
		role = claims.get("role")

		result, status = MaintenanceService.update_log(log_id, log_data, user_id, role)
		if status != 200:
<<<<<<< HEAD
			abort_with_payload(status, result)
=======
			abort(status, message=result.get("error"))
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)
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
<<<<<<< HEAD
			abort_with_payload(status, result)
=======
			abort(status, message=result.get("error"))
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)
		return result


__all__ = ["blp"]
