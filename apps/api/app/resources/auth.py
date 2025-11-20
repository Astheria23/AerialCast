from flask.views import MethodView
from flask_smorest import Blueprint, abort
from ..schemas import UserLoginSchema,UserRegisterSchema
from ..services.auth_service import AuthService

blp = Blueprint("Auth", "auth", description="Authentication Operations",url_prefix="/auth")

@blp.route("/register")
class UserRegister(MethodView):
    
    @blp.arguments(UserRegisterSchema)
    def post (self, user_data):
        result, status_code = AuthService.register_user(user_data)

        if status_code != 201:
            abort(status_code, message=result.get("error"))

        return result, status_code
    

@blp.route("/login")
class UserLogin(MethodView):

    @blp.arguments(UserLoginSchema)
    def post (self, user_data):
        result, status_code = AuthService.login_user(user_data)

        if status_code != 200:
            abort(status_code, message=result.get("error"))
            
        return result, status_code
        
