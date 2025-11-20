from marshmallow import Schema,fields,validate

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

