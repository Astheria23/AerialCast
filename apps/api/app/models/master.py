from ..extensions import db
from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, DateTime, Float, SmallInteger, Enum
from typing import List, Optional, TYPE_CHECKING
from .enums import UserRole, DroneStatus, GeofenceType, ChecklistType


if TYPE_CHECKING:
    from .master import User, Checklist, Geofence
    from .execution import FlightSession, MaintenanceLog
    from .planning import Mission


class User(db.Model):
    __tablename__ = "users"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.PILOT)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    created_missions: Mapped[List["Mission"]] = relationship(back_populates="creator")
    flight_sessions: Mapped[List["FlightSession"]] = relationship(
        back_populates="pilot"
    )
    maintenance_logs: Mapped[List["MaintenanceLog"]] = relationship(
        back_populates="serviced_by"
    )


class Drone(db.Model):
    __tablename__ = "drones"

    drone_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255))
    model: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    lora_id: Mapped[str] = mapped_column(String(100), unique=True)
    status: Mapped[DroneStatus] = mapped_column(
        Enum(DroneStatus), default=DroneStatus.READY
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    flight_sessions: Mapped[List["FlightSession"]] = relationship(
        back_populates="drone"
    )
    maintenance_logs: Mapped[List["MaintenanceLog"]] = relationship(
        back_populates="drone"
    )


class Geofence(db.Model):
    __tablename__ = "geofences"

    geofence_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    area_name: Mapped[str] = mapped_column(String(255))
    type: Mapped[GeofenceType] = mapped_column(
        Enum(GeofenceType), default=GeofenceType.NO_FLY_ZONE
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    points: Mapped[List["GeofencePoint"]] = relationship(
        back_populates="geofence", cascade="all, delete-orphan"
    )
    missions: Mapped[List["Mission"]] = relationship(
        secondary="mission_geofences", back_populates="active_geofences"
    )


class GeofencePoint(db.Model):
    __tablename__ = "geofence_points"

    point_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    geofence_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("geofences.geofence_id"))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    order: Mapped[int] = mapped_column(SmallInteger)

    geofence: Mapped["Geofence"] = relationship(back_populates="points")


class Checklist(db.Model):
    __tablename__ = "checklists"

    checklist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255))
    type: Mapped[ChecklistType] = mapped_column(Enum(ChecklistType))

    items: Mapped[List["ChecklistItem"]] = relationship(
        back_populates="checklist", cascade="all, delete-orphan"
    )
    missions: Mapped[List["Mission"]] = relationship(
        secondary="mission_checklists", back_populates="required_checklists"
    )


class ChecklistItem(db.Model):
    __tablename__ = "checklist_items"

    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    checklist_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("checklists.checklist_id")
    )
    item_text: Mapped[str] = mapped_column(String(255))
    order: Mapped[int] = mapped_column(SmallInteger)

    checklist: Mapped["Checklist"] = relationship(back_populates="items")
