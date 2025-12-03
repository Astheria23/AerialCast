"""Authentication routes."""

from flask.views import MethodView
from flask_smorest import Blueprint

from ...schemas import UserLoginSchema, UserRegisterSchema
from ...services.auth_service import AuthService
from ..utils import abort_with_payload


blp = Blueprint(
	"Auth",
	"auth",
	description="Authentication Operations",
	url_prefix="/auth",
)


@blp.route("/register")
class UserRegister(MethodView):
	@blp.arguments(UserRegisterSchema)
	def post(self, user_data):
		result, status_code = AuthService.register_user(user_data)

		if status_code != 201:
			abort_with_payload(status_code, result)

		return result, status_code


@blp.route("/login")
class UserLogin(MethodView):
	@blp.arguments(UserLoginSchema)
	def post(self, user_data):
		result, status_code = AuthService.login_user(user_data)

		if status_code != 200:
			abort_with_payload(status_code, result)

		return result, status_code


__all__ = ["blp"]
