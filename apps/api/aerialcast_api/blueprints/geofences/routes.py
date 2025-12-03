"""Geofence management routes."""

from flask.views import MethodView
<<<<<<< HEAD
from flask_smorest import Blueprint
=======
from flask_smorest import Blueprint, abort
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)
from flask_jwt_extended import jwt_required

from ...schemas import GeofenceSchema, GeofenceUpdateSchema
from ...services.geofence_service import GeofenceService
<<<<<<< HEAD
from ..utils import abort_with_payload
=======
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)


blp = Blueprint(
	"Geofences",
	"geofences",
	description="Geofence Area Management",
	url_prefix="/api/v1/geofences",
)


@blp.route("/")
class GeofenceList(MethodView):
	@jwt_required()
	@blp.response(200, GeofenceSchema(many=True))
	def get(self):
		"""Get all geofence areas."""

		return GeofenceService.get_all_geofences()

	@jwt_required()
	@blp.arguments(GeofenceSchema)
	@blp.response(201, GeofenceSchema)
	def post(self, geofence_data):
		"""Create a new geofence area."""

		result, status = GeofenceService.create_geofence(geofence_data)
		if status not in (200, 201):
<<<<<<< HEAD
			abort_with_payload(status, result)
=======
			abort(status, message=result.get("error"))
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)
		return result


@blp.route("/<uuid:geofence_id>")
class GeofenceDetail(MethodView):
	@jwt_required()
	@blp.response(200, GeofenceSchema)
	def get(self, geofence_id):
		"""Get geofence details."""

		return GeofenceService.get_geofence_by_id(geofence_id)

	@jwt_required()
	def delete(self, geofence_id):
		"""Delete a geofence."""

		result, status = GeofenceService.delete_geofence(geofence_id)
		if status != 200:
<<<<<<< HEAD
			abort_with_payload(status, result)
=======
			abort(status, message=result.get("error"))
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)
		return result

	@jwt_required()
	@blp.arguments(GeofenceUpdateSchema)
	@blp.response(200, GeofenceSchema)
	def put(self, geofence_data, geofence_id):
		"""Update a geofence."""

		result, status = GeofenceService.update_geofence(geofence_id, geofence_data)
		if status != 200:
<<<<<<< HEAD
			abort_with_payload(status, result)
=======
			abort(status, message=result.get("error"))
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)
		return result


__all__ = ["blp"]
