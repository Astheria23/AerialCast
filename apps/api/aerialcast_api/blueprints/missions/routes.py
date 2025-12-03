"""Mission planning routes."""

from flask.views import MethodView
<<<<<<< HEAD
from flask_smorest import Blueprint
=======
from flask_smorest import Blueprint, abort
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)
from flask_jwt_extended import get_jwt_identity, jwt_required

from ...schemas import MissionSchema, MissionUpdateSchema
from ...services.mission_service import MissionService
<<<<<<< HEAD
from ..utils import abort_with_payload
=======
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)


blp = Blueprint(
	"Missions",
	"missions",
	description="Mission Planning",
	url_prefix="/api/v1/missions",
)


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
<<<<<<< HEAD
			abort_with_payload(status, result)
=======
			error = result.get("error") if isinstance(result, dict) else str(result)
			abort(status, message=error)
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)
		return result


@blp.route("/<uuid:mission_id>")
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
<<<<<<< HEAD
			abort_with_payload(status, result)
=======
			error = result.get("error") if isinstance(result, dict) else str(result)
			abort(status, message=error)
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)
		return result

	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	@blp.response(200)
	def delete(self, mission_id):
		result, status = MissionService.delete_mission(mission_id)
		if status != 200:
<<<<<<< HEAD
			abort_with_payload(status, result)
=======
			error = result.get("error") if isinstance(result, dict) else str(result)
			abort(status, message=error)
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)
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
<<<<<<< HEAD
			abort_with_payload(status, result)
=======
			error = result.get("error") if isinstance(result, dict) else str(result)
			abort(status, message=error)
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)
		return result


__all__ = ["blp"]
