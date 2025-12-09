"""Marshmallow schemas shared across the AerialCast API."""

from datetime import datetime

from marshmallow import Schema, ValidationError, fields, validate

from .models.enums import ChecklistType, GeofenceType


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
    pilot_name = fields.Method("_dump_pilot_name", dump_only=True)
    drone_name = fields.Method("_dump_drone_name", dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    waypoints = fields.List(fields.Nested(MissionWaywpointSchema), required=True)
    status = fields.Method("_dump_status", dump_only=True)
    save_as_draft = fields.Boolean(load_default=False)
    checklist_ids = fields.List(fields.UUID(), load_default=list)
    required_checklists = fields.List(fields.Nested(lambda: ChecklistRefSchema()), dump_only=True)
    geofence_ids = fields.List(fields.UUID(), load_default=list)
    active_geofences = fields.List(fields.Nested(lambda: GeofenceRefSchema()), dump_only=True)

    def _dump_status(self, obj):
        return obj.status.name if getattr(obj, "status", None) else None

    def _dump_pilot_name(self, obj):
        creator = getattr(obj, "creator", None)
        if creator and getattr(creator, "full_name", None):
            return creator.full_name
        return None

    def _dump_drone_name(self, obj):
        drone = getattr(obj, "drone", None)
        if drone and getattr(drone, "name", None):
            return drone.name
        return None


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
    email = 1


class DroneSchema(Schema):
    drone_id = fields.UUID(dump_only=True)
    name = fields.String(required=True)
    model = fields.String(required=True)
    lora_id = fields.String(required=True)
    status = fields.Method("_dump_status", load_default="READY", dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    specs = fields.Nested(lambda: DroneSpecsSchema(), load_default=None, allow_none=True)

    def _dump_status(self, obj):
        return obj.status.value if getattr(obj, "status", None) else None


class DroneSpecsSchema(Schema):
    spec_id = fields.UUID(dump_only=True)
    drone_id = fields.UUID(dump_only=True)
    flight_controller = fields.String()
    motor = fields.String()
    esc = fields.String()
    propeller = fields.String()
    battery = fields.String()
    gps_module = fields.String()
    weight_g = fields.Integer()
    max_flight_time_min = fields.Integer()
    additional_info = fields.String()
    image_url = fields.String()
    image_base64 = fields.String(load_only=True)


class MissionUpdateSchema(Schema):
    mission_name = fields.String()
    notes = fields.String()
    drone_id = fields.UUID()
    status = fields.String()
    waypoints = fields.List(fields.Nested(MissionWaywpointSchema))
    checklist_ids = fields.List(fields.UUID())
    geofence_ids = fields.List(fields.UUID())


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


class MaintenanceLogSchema(Schema):
    log_id = fields.UUID(dump_only=True)
    drone_id = fields.UUID(required=True)
    notes = fields.String(required=True)
    log_date = fields.Date(load_default=lambda: datetime.utcnow().date())
    serviced_by_user_id = fields.UUID(required=True)
    serviced_by_name = fields.String(dump_only=True)
    serviced_by_name = fields.String(dump_only=True)


class ChecklistItemSchema(Schema):
    item_id = fields.UUID(dump_only=True)
    item_text = fields.String(required=True)
    order = fields.Integer(required=True)


class ChecklistSchema(Schema):
    checklist_id = fields.UUID(dump_only=True)
    title = fields.String(required=True)
    type = fields.String(validate=validate.OneOf([e.name for e in ChecklistType]), required=True)
    items = fields.List(fields.Nested(ChecklistItemSchema), required=True)


class ChecklistUpdateSchema(Schema):
    title = fields.String()
    type = fields.String(validate=validate.OneOf([e.name for e in ChecklistType]))
    items = fields.List(fields.Nested(ChecklistItemSchema))


class ChecklistRefSchema(Schema):
    checklist_id = fields.UUID(dump_only=True)
    title = fields.String(dump_only=True)
    type = fields.String(dump_only=True)


class GeofenceRefSchema(Schema):
    geofence_id = fields.UUID(dump_only=True)
    area_name = fields.String(dump_only=True)
    type = fields.Method("_dump_type", dump_only=True)
    points = fields.Method("_dump_points", dump_only=True)

    def _dump_type(self, obj):
        value = getattr(obj, "type", None)
        return value.name if value else None

    def _dump_points(self, obj):
        points = getattr(obj, "points", None)
        if not points:
            return []

        ordered = sorted(points, key=lambda point: getattr(point, "order", 0) or 0)
        return GeofencePointSchema(many=True).dump(ordered)


class GeofencePointSchema(Schema):
    point_id = fields.UUID(dump_only=True)
    latitude = fields.Float(required=True)
    longitude = fields.Float(required=True)
    order = fields.Integer(required=True)


class GeofenceSchema(Schema):
    geofence_id = fields.UUID(dump_only=True)
    area_name = fields.String(required=True)
    type = fields.Method("_dump_type", deserialize="_load_type", required=True)
    created_at = fields.DateTime(dump_only=True)
    points = fields.List(fields.Nested(GeofencePointSchema), required=True)

    def _dump_type(self, obj):
        value = getattr(obj, "type", None)
        return value.name if value else None

    def _load_type(self, value):
        if not isinstance(value, str):
            raise ValidationError("type must be a string")
        candidate = value.strip().upper()
        allowed = [e.name for e in GeofenceType]
        if candidate not in allowed:
            raise ValidationError(f"Invalid geofence type. Allowed: {allowed}")
        return candidate


class GeofenceUpdateSchema(Schema):
    area_name = fields.String()
    type = fields.String(validate=validate.OneOf([e.name for e in GeofenceType]))
    points = fields.List(fields.Nested(GeofencePointSchema))


__all__ = [
    "MissionWaywpointSchema",
    "MissionSchema",
    "UserRegisterSchema",
    "UserLoginSchema",
    "UserResponseSchema",
    "DroneSchema",
    "DroneSpecsSchema",
    "MissionUpdateSchema",
    "TelemetryDataSchema",
    "FlightSessionSchema",
    "MaintenanceLogSchema",
    "ChecklistItemSchema",
    "ChecklistSchema",
    "ChecklistUpdateSchema",
    "ChecklistRefSchema",
    "GeofenceRefSchema",
    "GeofencePointSchema",
    "GeofenceSchema",
    "GeofenceUpdateSchema",
]
