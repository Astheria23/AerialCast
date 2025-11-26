from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required
from ..schemas import GeofenceSchema, GeofenceUpdateSchema
from ..services.geofence_service import GeofenceService

blp = Blueprint("Geofences", "geofences", description="Geofence Area Management", url_prefix="/api/geofences")

@blp.route("/")
class GeofenceList(MethodView):
    
    @jwt_required()
    @blp.response(200, GeofenceSchema(many=True))
    def get(self):
        """Get all geofence areas"""
        return GeofenceService.get_all_geofences()

    @jwt_required() 
    @blp.arguments(GeofenceSchema)
    @blp.response(201, GeofenceSchema)
    def post(self, geofence_data):
        """Create new geofence area"""
        result, status = GeofenceService.create_geofence(geofence_data)
        if status not in (200, 201):
            abort(status, message=result.get("error"))
        return result
@blp.route("/<uuid:geofence_id>")
class GeofenceDetail(MethodView):
    
    @jwt_required()
    @blp.response(200, GeofenceSchema)
    def get(self, geofence_id):
        """Get detail geofence"""
        return GeofenceService.get_geofence_by_id(geofence_id)

    @jwt_required()
    def delete(self, geofence_id):
        """Delete geofence"""
        result, status = GeofenceService.delete_geofence(geofence_id)
        if status != 200:
            abort(status, message=result.get("error"))
        return result

    @jwt_required()
    @blp.arguments(GeofenceUpdateSchema)
    @blp.response(200, GeofenceSchema)
    def put(self, geofence_data, geofence_id):
        """Update geofence area (full/partial)."""
        result, status = GeofenceService.update_geofence(geofence_id, geofence_data)
        if status != 200:
            abort(status, message=result.get("error"))
        return result