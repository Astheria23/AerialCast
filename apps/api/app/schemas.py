from marshmallow import Schema,fields,validate
from .models.enums import DroneStatus

class UserRegisterSchema(Schema):
    full_name = fields.String(required=True, validate=validate.Length(min=3))
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=6))
    role = fields.String(validate=validate.OneOf(["ADMIN", "PILOT"]), load_default="PILOT")

class UserLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)

class UserResponseSchema(Schema):
    user_id = fields.UUID(dump_only=True)
    email = fields.Email()
    full_name = fields.String()
    role = fields.String()
    created_at = fields.DateTime()

class DroneSchema(Schema):
    drone_id = fields.UUID(dump_only=True)
    name = fields.String(required=True)
    model = fields.String(required=True)
    lora_id = fields.String(required=True)
    status = fields.String(validate=validate.OneOf([e.name for e in DroneStatus]), load_default="READY")
    status = fields.String(validate=validate.OneOf([e.value for e in DroneStatus]), load_default="READY")
    created_at = fields.DateTime(dump_only=True)




