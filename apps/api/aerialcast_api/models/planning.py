"""Planning domain models covering missions and waypoints."""

from datetime import datetime
import uuid
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import DateTime, Enum, Float, ForeignKey, SmallInteger, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..extensions import db
from .associations import mission_checklists, mission_geofences
from .enums import MissionStatus

if TYPE_CHECKING:  # pragma: no cover
    from .execution import FlightSession
    from .master import Checklist, Drone, Geofence, User


class Mission(db.Model):
    __tablename__ = "missions"

    mission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id"))
    drone_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("drones.drone_id"))
    mission_name: Mapped[str] = mapped_column(String(255))
    status: Mapped[MissionStatus] = mapped_column(
        Enum(MissionStatus), default=MissionStatus.DRAFT
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    creator: Mapped["User"] = relationship(back_populates="created_missions")
    drone: Mapped["Drone"] = relationship(back_populates="missions")
    waypoints: Mapped[List["MissionWaypoint"]] = relationship(
        back_populates="mission", cascade="all, delete-orphan"
    )
    flight_sessions: Mapped[List["FlightSession"]] = relationship(
        back_populates="mission"
    )

    required_checklists: Mapped[List["Checklist"]] = relationship(
        secondary=mission_checklists, back_populates="missions"
    )
    active_geofences: Mapped[List["Geofence"]] = relationship(
        secondary=mission_geofences, back_populates="missions"
    )

    def to_dict(self) -> dict:
        return {
            "mission_id": str(self.mission_id),
            "mission_name": self.mission_name,
            "status": self.status.name,
            "notes": self.notes,
            "drone_id": str(self.drone_id),
            "created_by_user_id": str(self.created_by_user_id),
            "pilot_name": self.creator.full_name if getattr(self, "creator", None) else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "waypoints": [wp.to_dict() for wp in self.waypoints],
            "checklist_ids": [str(ch.checklist_id) for ch in self.required_checklists],
            "geofence_ids": [str(gf.geofence_id) for gf in self.active_geofences],
            "required_checklists": [
                {
                    "checklist_id": str(ch.checklist_id),
                    "title": ch.title,
                    "type": ch.type.value,
                }
                for ch in self.required_checklists
            ],
            "active_geofences": [
                {
                    "geofence_id": str(gf.geofence_id),
                    "area_name": gf.area_name,
                    "type": gf.type.value,
                }
                for gf in self.active_geofences
            ],
        }

    @property
    def checklist_ids(self):
        return [checklist.checklist_id for checklist in self.required_checklists]

    @property
    def geofence_ids(self):
        return [geofence.geofence_id for geofence in self.active_geofences]


class MissionWaypoint(db.Model):
    __tablename__ = "mission_waypoints"
    __table_args__ = (
        UniqueConstraint(
            "mission_id", "order", name="uq_mission_waypoint_order_per_mission"
        ),
    )

    waypoint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    mission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("missions.mission_id"))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    altitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    order: Mapped[int] = mapped_column(SmallInteger)

    mission: Mapped["Mission"] = relationship(back_populates="waypoints")

    def to_dict(self) -> dict:
        return {
            "waypoint_id": str(self.waypoint_id),
            "latitude": self.latitude,
            "longitude": self.longitude,
            "altitude": self.altitude,
            "order": self.order,
        }


__all__ = ["Mission", "MissionWaypoint"]
