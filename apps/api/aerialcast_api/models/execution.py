"""Execution and logging domain models."""

from datetime import datetime, date
import uuid
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..extensions import db
from .enums import AlertType, MaintenanceStatus, SessionStatus

if TYPE_CHECKING:  # pragma: no cover
    from .master import Drone, User
    from .planning import Mission


class FlightSession(db.Model):
    __tablename__ = "flight_sessions"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    mission_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("missions.mission_id"), nullable=True
    )
    drone_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("drones.drone_id"))
    pilot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id"))

    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    end_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus), default=SessionStatus.LIVE
    )

    mission: Mapped[Optional["Mission"]] = relationship(back_populates="flight_sessions")
    drone: Mapped["Drone"] = relationship(back_populates="flight_sessions")
    pilot: Mapped["User"] = relationship(back_populates="flight_sessions")

    telemetry_logs: Mapped[List["TelemetryData"]] = relationship(
        back_populates="session", lazy="dynamic"
    )
    alerts: Mapped[List["Alert"]] = relationship(back_populates="session", lazy="dynamic")

    def to_dict(self) -> dict:
        return {
            "session_id": str(self.session_id),
            "mission_id": str(self.mission_id) if self.mission_id else None,
            "drone_id": str(self.drone_id),
            "pilot_id": str(self.pilot_id),
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "status": self.status.value,
        }


class TelemetryData(db.Model):
    __tablename__ = "telemetry_data"

    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("flight_sessions.session_id"), primary_key=True
    )

    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    altitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    battery_voltage: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rssi: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    snr: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    session: Mapped["FlightSession"] = relationship(back_populates="telemetry_logs")

    def to_dict(self) -> dict:
        return {
            "time": self.time.isoformat(),
            "session_id": str(self.session_id),
            "latitude": self.latitude,
            "longitude": self.longitude,
            "altitude": self.altitude,
            "battery_voltage": self.battery_voltage,
            "rssi": self.rssi,
            "snr": self.snr,
            "speed": getattr(self, "speed", None),
        }


class Alert(db.Model):
    __tablename__ = "alerts"

    alert_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("flight_sessions.session_id"), nullable=True
    )
    alert_type: Mapped[AlertType] = mapped_column(Enum(AlertType))
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    session: Mapped[Optional["FlightSession"]] = relationship(back_populates="alerts")

    def to_dict(self) -> dict:
        return {
            "alert_id": str(self.alert_id),
            "session_id": str(self.session_id) if self.session_id else None,
            "alert_type": self.alert_type.value,
            "message": self.message,
            "timestamp": self.timestamp.isoformat(),
        }


class MaintenanceLog(db.Model):
    __tablename__ = "maintenance_logs"

    log_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    drone_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("drones.drone_id"))
    created_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id"), nullable=True
    )
    assigned_pilot_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        "serviced_by_user_id", ForeignKey("users.user_id"), nullable=True
    )
    scheduled_for: Mapped[date] = mapped_column("log_date", Date, default=datetime.utcnow)
    status: Mapped[MaintenanceStatus] = mapped_column(
        Enum(MaintenanceStatus), default=MaintenanceStatus.SCHEDULED
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[str] = mapped_column(Text)

    drone: Mapped["Drone"] = relationship(back_populates="maintenance_logs")
    assigned_pilot: Mapped[Optional["User"]] = relationship(
        back_populates="maintenance_logs",
        foreign_keys=[assigned_pilot_id],
    )
    created_by: Mapped[Optional["User"]] = relationship(
        back_populates="created_maintenance_logs",
        foreign_keys=[created_by_user_id],
    )

    def to_dict(self) -> dict:
        return {
            "log_id": str(self.log_id),
            "drone_id": str(self.drone_id),
            "created_by_user_id": str(self.created_by_user_id)
            if self.created_by_user_id
            else None,
            "assigned_pilot_id": str(self.assigned_pilot_id)
            if self.assigned_pilot_id
            else None,
            "scheduled_for": self.scheduled_for.isoformat(),
            "status": self.status.value,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at":
                self.completed_at.isoformat() if self.completed_at else None,
            "notes": self.notes,
            "assigned_pilot_name": getattr(
                getattr(self, "assigned_pilot", None), "full_name", None
            ),
            "created_by_name": getattr(
                getattr(self, "created_by", None), "full_name", None
            ),
        }


__all__ = ["FlightSession", "TelemetryData", "Alert", "MaintenanceLog"]
