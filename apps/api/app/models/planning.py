from ..extensions import db
from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, DateTime, Float, SmallInteger, Enum, Text
from typing import List, Optional, TYPE_CHECKING
from .enums import MissionStatus
from .master import Drone
from .associations import mission_checklists, mission_geofences

if TYPE_CHECKING:
    from .master import User, Checklist, Geofence
    from .execution import FlightSession

class Mission(db.Model):
    __tablename__ = 'missions'
    
    mission_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id"))
    drone_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("drones.drone_id"))
    mission_name: Mapped[str] = mapped_column(String(255))
    status: Mapped[MissionStatus] = mapped_column(Enum(MissionStatus), default=MissionStatus.DRAFT)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    creator: Mapped["User"] = relationship(back_populates="created_missions")
    drone: Mapped["Drone"] = relationship(back_populates="missions")
    waypoints: Mapped[List["MissionWaypoint"]] = relationship(back_populates="mission", cascade="all, delete-orphan")
    flight_sessions: Mapped[List["FlightSession"]] = relationship(back_populates="mission")
    
    required_checklists: Mapped[List["Checklist"]] = relationship(secondary=mission_checklists, back_populates="missions")
    active_geofences: Mapped[List["Geofence"]] = relationship(secondary=mission_geofences, back_populates="missions")

    def to_dict(self):
        return {
            "mission_id": str(self.mission_id),
            "mission_name": self.mission_name,
            "status": self.status.name,
            "notes": self.notes,
            "drone_id": str(self.drone_id),
            "created_by_user_id": str(self.created_by_user_id),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "waypoints": [wp.to_dict() for wp in self.waypoints]
        }

class MissionWaypoint(db.Model):
    __tablename__ = 'mission_waypoints'
    
    waypoint_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("missions.mission_id"))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    altitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    order: Mapped[int] = mapped_column(SmallInteger)
    
    mission: Mapped["Mission"] = relationship(back_populates="waypoints")

    def to_dict(self):
        return {
            "waypoint_id": str(self.waypoint_id),
            "latitude": self.latitude,
            "longitude": self.longitude,
            "altitude": self.altitude,
            "order": self.order
        }