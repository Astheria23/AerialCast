"""Mission planning routes."""

from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required

from ...schemas import MissionSchema, MissionUpdateSchema
from ...services.mission_service import MissionService
from ..utils import abort_with_payload


blp = Blueprint(
	"Missions",
	"missions",
	description="Mission Planning",
	url_prefix="/api/v1/missions",
)


@blp.route("/", strict_slashes=False)
class MissionList(MethodView):
	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	@blp.response(200, MissionSchema(many=True))
	def get(self):
		user_id = get_jwt_identity()
		return MissionService.get_all_missions(user_id=user_id)

	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	@blp.arguments(MissionSchema)
	@blp.response(201, MissionSchema)
	def post(self, mission_data):
		user_id = get_jwt_identity()
		result, status = MissionService.create_mission(mission_data, user_id)

		if status != 201:
			abort_with_payload(status, result)
		return result


@blp.route("/<uuid:mission_id>", strict_slashes=False)
class MissionDetail(MethodView):
	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	@blp.response(200, MissionSchema)
	def get(self, mission_id):
		return MissionService.get_mission_by_id(mission_id)

	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	@blp.arguments(MissionUpdateSchema(partial=True))
	@blp.response(200, MissionSchema)
	def put(self, update_data, mission_id):
		user_id = get_jwt_identity()
		result, status = MissionService.update_mission(mission_id, update_data, user_id)
		if status != 200:
			abort_with_payload(status, result)
		return result

	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	@blp.response(200)
	def delete(self, mission_id):
		result, status = MissionService.delete_mission(mission_id)
		if status != 200:
			abort_with_payload(status, result)
		return result


@blp.route("/<uuid:mission_id>/status/<string:action>")
class MissionStatusAction(MethodView):
	@blp.doc(
		security=[{"BearerAuth": []}],
		description="Change mission status using an action. Allowed actions: submit, approve, reject, start, complete, cancel.",
	)
	@jwt_required()
	@blp.response(200, MissionSchema)
	def post(self, mission_id, action):
		user_id = get_jwt_identity()
		result, status = MissionService.change_status(mission_id, action, user_id)
		if status != 200:
			abort_with_payload(status, result)
		return result


__all__ = ["blp"]
