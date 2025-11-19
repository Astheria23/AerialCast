import enum

class UserRole(enum.Enum):
    ADMIN = "ADMIN"
    PILOT = "PILOT"

class DroneStatus(enum.Enum):
    READY = "READY"
    MAINTENANCE = "MAINTENANCE"
    FLYING = "FLYING"
    RETIRED = "RETIRED"

class GeofenceType(enum.Enum):
    SAFE_ZONE = "SAFE_ZONE"
    NO_FLY_ZONE = "NO_FLY_ZONE"

class ChecklistType(enum.Enum):
    PRE_FLIGHT = "PRE_FLIGHT"
    POST_FLIGHT = "POST_FLIGHT"

class MissionStatus(enum.Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELED = "CANCELED"

class SessionStatus(enum.Enum):
    LIVE = "LIVE"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class AlertType(enum.Enum):
    LOW_BATTERY = "LOW_BATTERY"
    GEOFENCE_BREACH = "GEOFENCE_BREACH"
    SIGNAL_LOST = "SIGNAL_LOST"
    MISSION_ERROR = "MISSION_ERROR"