from ..extensions import db
from ..models.master import User
from passlib.hash import pbkdf2_sha256
from flask_jwt_extended import create_access_token
from sqlalchemy.exc import IntegrityError


class AuthService:

    @staticmethod

    def register_user(data):
        email = data["email"]
        password = data["password"]
        full_name = data["full_name"]
        role = data.get("role", "PILOT")

        if User.query.filter_by(email=email).first():
            return {"error": "Email already registered"}, 409

        password_hash = pbkdf2_sha256.hash(password)

        new_user = User()
        new_user.email = email
        new_user.password_hash = password_hash
        new_user.full_name = full_name
        new_user.role = role

        try:
            db.session.add(new_user)
            db.session.commit()
            access_token = create_access_token(identity=str(new_user.user_id), additional_claims={"role":role})

            return{
                "message": "User Registered Sucessfully",
                "user" : new_user.to_dict(), 
                "access_token" : access_token
            },201
        
        except IntegrityError:
            db.session.rollback()
            return {"Error" : "Database error"},500
        
    
    @staticmethod
    def login_user(data):
        email = data['email']
        password = data['password']

        user =User.query.filter_by(email=email).first()

        if user and pbkdf2_sha256.verify(password, user.password_hash):
            access_token = create_access_token(identity=str(user.user_id), additional_claims={"role":user.role.value})

            return{
                "message" : "Login successful",
                "access_token" : access_token,
                "user" : user.to_dict()
            },200
        return {
            "error" : "invalid credetials"
        } , 401
        




        
