from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required
from ..schemas import DroneSchema
from ..services.fleet_service import FleetService

blp = Blueprint("Fleet", "fleet", description="Drone Fleet Management", url_prefix="/api/drones")

@blp.route("/")
class DroneList(MethodView):

    @blp.response(200, DroneSchema(many=True))
    def get(self):
        return FleetService.get_all_drones()

    @jwt_required()
    @blp.arguments(DroneSchema)
    @blp.response(201, DroneSchema)
    def post (self,drone_data):
        result, status = FleetService.create_drone(drone_data)
        if status != 201:
            error = result.get("error") if isinstance(result, dict) else str(result)
            abort(status, message=error)
        return result
    
@blp.route("/<uuid:drone_id>")
class DroneDetail (MethodView):

    @blp.response(200,DroneSchema)
    def get(self, drone_id):
        return FleetService.get_drone_by_id(drone_id)
    
    @jwt_required()
    @blp.arguments(DroneSchema(partial=True))
    @blp.response(200, DroneSchema)

    def put (self, drone_data, drone_id):
        return FleetService.update_drone(drone_id, drone_data)
    
    @jwt_required()
    def delete(self, drone_id):
        return FleetService.delete_drone(drone_id)
    
        

    