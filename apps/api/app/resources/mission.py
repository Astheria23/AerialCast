from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..schemas import MissionSchema
from ..services.mission_service import MissionService

blp = Blueprint("Missions", "missions", description="Mission Planning", url_prefix="/api/missions")

@blp.route("/")
class MissionList(MethodView):
    
    @blp.doc(security=[{"BearerAuth": []}])
    @jwt_required()
    @blp.response(200, MissionSchema(many=True))
    def get(self):
        return MissionService.get_all_missions()

    @blp.doc(security=[{"BearerAuth": []}])
    @jwt_required()
    @blp.arguments(MissionSchema)
    @blp.response(201, MissionSchema)
    def post(self, mission_data):
        user_id = get_jwt_identity() 
        result, status = MissionService.create_mission(mission_data, user_id)
    
        if status != 201:
            error = result.get("error") if isinstance(result, dict) else str(result)
            abort(status, message=error)
        return result

@blp.route("/<uuid:mission_id>")
class MissionDetail(MethodView):
    
    @blp.doc(security=[{"BearerAuth": []}])
    @jwt_required()
    @blp.response(200, MissionSchema)
    def get(self, mission_id):
        return MissionService.get_mission_by_id(mission_id)
    
