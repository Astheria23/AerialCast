from ..extensions import db
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import ForeignKey

mission_checklists = db.Table(
    "mission_checklists",
    db.Column(
        "mission_id",
        UUID(as_uuid=True),
        ForeignKey("missions.mission_id"),
        primary_key=True,
    ),
    db.Column(
        "checklist_id",
        UUID(as_uuid=True),
        ForeignKey("checklists.checklist_id"),
        primary_key=True,
    ),
)

mission_geofences = db.Table(
    "mission_geofences",
    db.Column(
        "mission_id",
        UUID(as_uuid=True),
        ForeignKey("missions.mission_id"),
        primary_key=True,
    ),
    db.Column(
        "geofence_id",
        UUID(as_uuid=True),
        ForeignKey("geofences.geofence_id"),
        primary_key=True,
    ),
)
