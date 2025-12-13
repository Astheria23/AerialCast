"""Enum definitions used by SQLAlchemy models."""

import enum


class UserRole(enum.Enum):
    ADMIN = "ADMIN"
    PILOT = "PILOT"


class DroneStatus(enum.Enum):
    READY = "READY"
    MAINTENANCE = "MAINTENANCE"
    FLYING = "FLYING"
    RETIRED = "RETIRED"


class MaintenanceStatus(enum.Enum):
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


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
    READY_FOR_FLIGHT = "READY_FOR_FLIGHT"
    REJECTED = "REJECTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELED = "CANCELED"


class PreflightStatus(enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class SessionStatus(enum.Enum):
    LIVE = "LIVE"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class AlertType(enum.Enum):
    LOW_BATTERY = "LOW_BATTERY"
    GEOFENCE_BREACH = "GEOFENCE_BREACH"
    SIGNAL_LOST = "SIGNAL_LOST"
    MISSION_ERROR = "MISSION_ERROR"


__all__ = [
    "UserRole",
    "DroneStatus",
    "MaintenanceStatus",
    "GeofenceType",
    "ChecklistType",
    "MissionStatus",
    "PreflightStatus",
    "SessionStatus",
    "AlertType",
]
