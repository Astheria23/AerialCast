"""Checklist template management routes."""

from flask.views import MethodView
<<<<<<< HEAD
from flask_smorest import Blueprint
=======
from flask_smorest import Blueprint, abort
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)
from flask_jwt_extended import jwt_required

from ...schemas import ChecklistSchema, ChecklistUpdateSchema
from ...services.checklist_service import ChecklistService
<<<<<<< HEAD
from ..utils import abort_with_payload
=======
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)


blp = Blueprint(
	"Checklists",
	"checklists",
	description="Checklist Templates Management",
	url_prefix="/api/v1/checklists",
)


@blp.route("/")
class ChecklistList(MethodView):
	@jwt_required()
	@blp.response(200, ChecklistSchema(many=True))
	def get(self):
		"""Get all checklist templates."""

		return ChecklistService.get_all_checklists()

	@jwt_required()
	@blp.arguments(ChecklistSchema)
	@blp.response(201, ChecklistSchema)
	def post(self, checklist_data):
		"""Create a new checklist template."""

		result, status = ChecklistService.create_checklist(checklist_data)
		if status != 201:
<<<<<<< HEAD
			abort_with_payload(status, result)
=======
			error = result.get("error") if isinstance(result, dict) else str(result)
			abort(status, message=error)
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)
		return result


@blp.route("/<uuid:checklist_id>")
class ChecklistDetail(MethodView):
	@jwt_required()
	@blp.response(200, ChecklistSchema)
	def get(self, checklist_id):
		"""Get checklist details."""

		return ChecklistService.get_checklist_by_id(checklist_id)

	@jwt_required()
	def delete(self, checklist_id):
		"""Delete a checklist template."""

		result, status = ChecklistService.delete_checklist(checklist_id)
		if status != 200:
<<<<<<< HEAD
			abort_with_payload(status, result)
=======
			abort(status, message=result.get("error"))
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)
		return result

	@jwt_required()
	@blp.arguments(ChecklistUpdateSchema)
	@blp.response(200, ChecklistSchema)
	def put(self, checklist_data, checklist_id):
		"""Update a checklist template."""

		result, status = ChecklistService.update_checklist(checklist_id, checklist_data)
		if status != 200:
<<<<<<< HEAD
			abort_with_payload(status, result)
=======
			abort(status, message=result.get("error"))
>>>>>>> 75c9208 (feat: AerialCast API refactor and schema definitions)
		return result


__all__ = ["blp"]
