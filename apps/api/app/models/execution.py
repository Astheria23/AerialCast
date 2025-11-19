from ..extensions import db
from datetime import datetime, date
import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, DateTime, Float, Integer, Enum, Text, Date
from typing import List, Optional, TYPE_CHECKING
from .enums import SessionStatus, AlertType

if TYPE_CHECKING:
    from .planning import Mission
    from .master import Drone,User

class FlightSession(db.Model):
    __tablename__ = 'flight_sessions'
    
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("missions.mission_id"), nullable=True)
    drone_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("drones.drone_id"))
    pilot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id"))
    
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[SessionStatus] = mapped_column(Enum(SessionStatus), default=SessionStatus.LIVE)
    
    mission: Mapped[Optional["Mission"]] = relationship(back_populates="flight_sessions")
    drone: Mapped["Drone"] = relationship(back_populates="flight_sessions")
    pilot: Mapped["User"] = relationship(back_populates="flight_sessions")
    
    telemetry_logs: Mapped[List["TelemetryData"]] = relationship(back_populates="session", lazy="dynamic")
    alerts: Mapped[List["Alert"]] = relationship(back_populates="session", lazy="dynamic")

class TelemetryData(db.Model):
    __tablename__ = 'telemetry_data'
    
    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("flight_sessions.session_id"), primary_key=True)
    
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    altitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    battery_voltage: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rssi: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    session: Mapped["FlightSession"] = relationship(back_populates="telemetry_logs")

class Alert(db.Model):
    __tablename__ = 'alerts'
    
    alert_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("flight_sessions.session_id"), nullable=True)
    alert_type: Mapped[AlertType] = mapped_column(Enum(AlertType))
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    session: Mapped[Optional["FlightSession"]] = relationship(back_populates="alerts")

class MaintenanceLog(db.Model):
    __tablename__ = 'maintenance_logs'
    
    log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    drone_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("drones.drone_id"))
    serviced_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id"), nullable=True)
    log_date: Mapped[date] = mapped_column(Date, default=datetime.utcnow)
    notes: Mapped[str] = mapped_column(Text)
    
    drone: Mapped["Drone"] = relationship(back_populates="maintenance_logs")
    serviced_by: Mapped[Optional["User"]] = relationship(back_populates="maintenance_logs")