"""Mission planning routes."""

import base64
import binascii
import io

from flask import request, send_file
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required

from ...schemas import (
	MissionPostflightSchema,
	MissionPostflightUpdateSchema,
	MissionPreflightSchema,
	MissionPreflightUpdateSchema,
	MissionSchema,
	MissionUpdateSchema,
)
from ...services.mission_service import (
	MissionPostflightService,
	MissionPreflightService,
	MissionService,
)
from ...services.mission_export_service import MissionExportService
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


@blp.route("/<uuid:mission_id>/preflight", strict_slashes=False)
class MissionPreflight(MethodView):
	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	@blp.response(200, MissionPreflightSchema)
	def get(self, mission_id):
		user_id = get_jwt_identity()
		return MissionPreflightService.get_preflight(mission_id, user_id)

	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	@blp.arguments(MissionPreflightUpdateSchema)
	@blp.response(200, MissionPreflightSchema)
	def put(self, payload, mission_id):
		user_id = get_jwt_identity()
		result, status = MissionPreflightService.update_preflight(mission_id, payload, user_id)
		if status != 200:
			abort_with_payload(status, result)
		return result


@blp.route("/<uuid:mission_id>/postflight", strict_slashes=False)
class MissionPostflight(MethodView):
	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	@blp.response(200, MissionPostflightSchema)
	def get(self, mission_id):
		user_id = get_jwt_identity()
		return MissionPostflightService.get_postflight(mission_id, user_id)

	@blp.doc(security=[{"BearerAuth": []}])
	@jwt_required()
	@blp.arguments(MissionPostflightUpdateSchema)
	@blp.response(200, MissionPostflightSchema)
	def put(self, payload, mission_id):
		user_id = get_jwt_identity()
		result, status = MissionPostflightService.update_postflight(mission_id, payload, user_id)
		if status != 200:
			abort_with_payload(status, result)
		return result


@blp.route("/<uuid:mission_id>/export", strict_slashes=False)
class MissionExport(MethodView):
	@blp.doc(security=[{"BearerAuth": []}], description="Download mission flight log PDF")
	@jwt_required()
	def get(self, mission_id):
		payload = MissionExportService.build_pdf(mission_id)
		return self._as_attachment(payload, mission_id)

	@blp.doc(
		security=[{"BearerAuth": []}],
		description="Generate mission PDF using client-provided map imagery",
	)
	@jwt_required()
	def post(self, mission_id):
		body = request.get_json(silent=True) or {}
		map_image_field = body.get("map_image")
		map_bytes = None
		if isinstance(map_image_field, str):
			try:
				encoded = map_image_field.split(",", 1)[-1]
				map_bytes = base64.b64decode(encoded, validate=True)
			except (binascii.Error, ValueError):
				abort_with_payload(400, {"message": "map_image must be base64 encoded"})
		elif map_image_field is not None:
			abort_with_payload(400, {"message": "map_image must be a base64 string"})

		payload = MissionExportService.build_pdf(mission_id, map_image_bytes=map_bytes)
		return self._as_attachment(payload, mission_id)

	@staticmethod
	def _as_attachment(payload: bytes, mission_id):
		filename = f"mission-{mission_id}.pdf"
		return send_file(
			io.BytesIO(payload),
			mimetype="application/pdf",
			as_attachment=True,
			download_name=filename,
		)


__all__ = ["blp"]
