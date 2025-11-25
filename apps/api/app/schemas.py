from marshmallow import Schema,fields,validate

class MissionWaywpointSchema(Schema):
    waypoint_id = fields.UUID(dump_only=True)
    latitude = fields.Float(required=True)
    longitude = fields.Float(required=True)
    altitude = fields.Float(load_default=15.0) 
    order = fields.Integer(required=True)

class MissionSchema(Schema):
    mission_id = fields.UUID(dump_only=True)
    mission_name = fields.String(required=True)
    notes = fields.String()
    drone_id = fields.UUID(required=True)
    created_by_user_id = fields.UUID(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    waypoints = fields.List(fields.Nested(MissionWaywpointSchema), required=True)
    status = fields.Method("_dump_status", dump_only=True)
    save_as_draft = fields.Boolean(load_default=False)  

    def _dump_status(self, obj):
        return obj.status.name if getattr(obj, 'status', None) else None
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
    status = fields.Method("_dump_status", load_default="READY", dump_only=True)
    created_at = fields.DateTime(dump_only=True)

    def _dump_status(self, obj):
        return obj.status.value if getattr(obj, 'status', None) else None

class MissionUpdateSchema(Schema):
    mission_name = fields.String()
    notes = fields.String()
    drone_id = fields.UUID()
    status = fields.String()  
    waypoints = fields.List(fields.Nested(MissionWaywpointSchema))


class TelemetryDataSchema(Schema):
    telemetry_id = fields.UUID(dump_only=True)
    latitude = fields.Float()
    longitude = fields.Float()
    altitude = fields.Float()
    battery_voltage = fields.Float()
    rssi = fields.Integer()
    

class FlightSessionSchema(Schema):
    session_id = fields.UUID(dump_only=True)
    status = fields.String(dump_only=True)
    start_time = fields.DateTime(dump_only=True)
    end_time = fields.DateTime(dump_only=True)

    mission_id = fields.UUID(dump_only=True)
    drone_id = fields.UUID(dump_only=True)
    pilot_id = fields.UUID(dump_only=True)

    mission_name = fields.String(dump_only=True)
    drone_name = fields.String(dump_only=True)
    pilot_name = fields.String(dump_only=True)





