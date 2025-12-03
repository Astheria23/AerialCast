"""Authentication business logic."""

from flask_jwt_extended import create_access_token
from passlib.hash import pbkdf2_sha256
from sqlalchemy.exc import IntegrityError

from ..models.master import User
from ..repositories import UserRepository


class AuthService:
    user_repository = UserRepository

    @classmethod
    def register_user(cls, data: dict):
        email = data["email"]
        password = data["password"]
        full_name = data["full_name"]
        role = data.get("role", "PILOT")

        repo = cls.user_repository

        if repo.find_by_email(email):
            return {"error": "Email already registered"}, 409

        password_hash = pbkdf2_sha256.hash(password)

        new_user = User()
        new_user.email = email
        new_user.password_hash = password_hash
        new_user.full_name = full_name
        new_user.role = role

        try:
            repo.add(new_user)
            repo.commit()
            access_token = create_access_token(
                identity=str(new_user.user_id), additional_claims={"role": role}
            )

            return {
                "message": "User registered successfully",
                "user": new_user.to_dict(),
                "access_token": access_token,
            }, 201
        except IntegrityError:
            repo.rollback()
            return {"error": "Database integrity error"}, 500

    @classmethod
    def login_user(cls, data: dict):
        email = data["email"]
        password = data["password"]

        user = cls.user_repository.find_by_email(email)

        if user and pbkdf2_sha256.verify(password, user.password_hash):
            access_token = create_access_token(
                identity=str(user.user_id), additional_claims={"role": user.role.value}
            )
            return {
                "message": "Login successful",
                "access_token": access_token,
                "user": user.to_dict(),
            }, 200

        return {"error": "Invalid credentials"}, 401


__all__ = ["AuthService"]
