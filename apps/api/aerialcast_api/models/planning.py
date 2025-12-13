"""Planning domain models covering missions and waypoints."""

from datetime import datetime
import uuid
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, SmallInteger, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..extensions import db
from .associations import mission_geofences
from .enums import MissionStatus, PreflightStatus

if TYPE_CHECKING:  # pragma: no cover
    from .execution import FlightSession
    from .master import Drone, Geofence, User


class Mission(db.Model):
    __tablename__ = "missions"

    mission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id"))
    assigned_pilot_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id"), nullable=True
    )
    drone_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("drones.drone_id"))
    mission_name: Mapped[str] = mapped_column(String(255))
    status: Mapped[MissionStatus] = mapped_column(
        Enum(MissionStatus), default=MissionStatus.DRAFT
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approval_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    submitted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ready_for_flight_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    rejected_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    creator: Mapped["User"] = relationship(
        back_populates="created_missions", foreign_keys=[created_by_user_id]
    )
    assigned_pilot: Mapped[Optional["User"]] = relationship(
        back_populates="assigned_missions", foreign_keys=[assigned_pilot_id]
    )
    drone: Mapped["Drone"] = relationship(back_populates="missions")
    waypoints: Mapped[List["MissionWaypoint"]] = relationship(
        back_populates="mission", cascade="all, delete-orphan"
    )
    flight_sessions: Mapped[List["FlightSession"]] = relationship(
        back_populates="mission"
    )
    preflight_checklist: Mapped[Optional["MissionPreflightChecklist"]] = relationship(
        back_populates="mission", uselist=False, cascade="all, delete-orphan"
    )
    postflight_checklist: Mapped[Optional["MissionPostflightChecklist"]] = relationship(
        back_populates="mission", uselist=False, cascade="all, delete-orphan"
    )
    active_geofences: Mapped[List["Geofence"]] = relationship(
        secondary=mission_geofences, back_populates="missions"
    )

    def to_dict(self) -> dict:
        creator = getattr(self, "creator", None)
        assigned = getattr(self, "assigned_pilot", None)
        preflight_dict = (
            self.preflight_checklist.to_dict() if self.preflight_checklist else None
        )
        postflight_dict = (
            self.postflight_checklist.to_dict() if self.postflight_checklist else None
        )
        checklist_ids = (
            [str(cid) for cid in self.checklist_ids] if self.checklist_ids else []
        )
        return {
            "mission_id": str(self.mission_id),
            "mission_name": self.mission_name,
            "status": self.status.name,
            "notes": self.notes,
            "approval_notes": self.approval_notes,
            "drone_id": str(self.drone_id),
            "created_by_user_id": str(self.created_by_user_id),
            "assigned_pilot_id": str(self.assigned_pilot_id)
            if self.assigned_pilot_id
            else None,
            "pilot_name": creator.full_name if creator else None,
            "assigned_pilot_name": assigned.full_name if assigned else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "ready_for_flight_at": self.ready_for_flight_at.isoformat()
            if self.ready_for_flight_at
            else None,
            "rejected_at": self.rejected_at.isoformat() if self.rejected_at else None,
            "waypoints": [wp.to_dict() for wp in self.waypoints],
            "checklist_ids": checklist_ids,
            "geofence_ids": [str(gf.geofence_id) for gf in self.active_geofences],
            "required_checklists": self._legacy_required_checklists(),
            "active_geofences": [
                {
                    "geofence_id": str(gf.geofence_id),
                    "area_name": gf.area_name,
                    "type": gf.type.value,
                    "points": [
                        {
                            "point_id": str(point.point_id),
                            "latitude": point.latitude,
                            "longitude": point.longitude,
                            "order": point.order,
                        }
                        for point in sorted(getattr(gf, "points", []), key=lambda p: p.order)
                    ],
                }
                for gf in self.active_geofences
            ],
            "preflight_checklist": preflight_dict,
            "postflight_checklist": postflight_dict,
        }

    @property
    def checklist_ids(self):
        identifiers: List[uuid.UUID] = []
        if self.preflight_checklist:
            identifiers.extend(self.preflight_checklist.template_checklist_ids)
        if self.postflight_checklist:
            for identifier in self.postflight_checklist.template_checklist_ids:
                if identifier not in identifiers:
                    identifiers.append(identifier)
        return identifiers

    @property
    def geofence_ids(self):
        return [geofence.geofence_id for geofence in self.active_geofences]

    def _legacy_required_checklists(self) -> List[dict]:
        records: List[dict] = []

        def _collect(items: List, checklist_type: str):
            seen: set[uuid.UUID] = set()
            for entry in items:
                checklist_id = getattr(entry, "source_checklist_id", None)
                if not checklist_id or checklist_id in seen:
                    continue
                seen.add(checklist_id)
                records.append(
                    {
                        "checklist_id": str(checklist_id),
                        "title": getattr(entry, "section_title", None),
                        "type": checklist_type,
                    }
                )

        if self.preflight_checklist and self.preflight_checklist.items:
            _collect(self.preflight_checklist.items, "PRE_FLIGHT")

        if self.postflight_checklist and self.postflight_checklist.items:
            _collect(self.postflight_checklist.items, "POST_FLIGHT")

        return records


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


class MissionPreflightChecklist(db.Model):
    __tablename__ = "mission_preflight_checklists"

    preflight_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    mission_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("missions.mission_id"), unique=True, nullable=False
    )
    status: Mapped[PreflightStatus] = mapped_column(
        Enum(PreflightStatus), default=PreflightStatus.NOT_STARTED, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    mission: Mapped["Mission"] = relationship(back_populates="preflight_checklist")
    items: Mapped[List["MissionPreflightChecklistItem"]] = relationship(
        back_populates="preflight_checklist", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        sorted_items = sorted(
            self.items,
            key=lambda item: (
                item.section_order if item.section_order is not None else 0,
                item.order if item.order is not None else 0,
            ),
        )
        return {
            "preflight_id": str(self.preflight_id),
            "mission_id": str(self.mission_id),
            "status": self.status.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "items": [item.to_dict() for item in sorted_items],
            "template_checklist_ids": [
                str(cid) for cid in self.template_checklist_ids
            ],
        }

    @property
    def template_checklist_ids(self) -> List[uuid.UUID]:
        identifiers: List[uuid.UUID] = []
        for item in sorted(
            self.items,
            key=lambda entry: (
                entry.section_order if entry.section_order is not None else 0,
                entry.order if entry.order is not None else 0,
            ),
        ):
            if item.source_checklist_id and item.source_checklist_id not in identifiers:
                identifiers.append(item.source_checklist_id)
        return identifiers


class MissionPreflightChecklistItem(db.Model):
    __tablename__ = "mission_preflight_checklist_items"

    preflight_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    preflight_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("mission_preflight_checklists.preflight_id"), nullable=False
    )
    source_checklist_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("checklists.checklist_id"), nullable=True
    )
    source_checklist_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("checklist_items.item_id"), nullable=True
    )
    section_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    section_order: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    item_text: Mapped[str] = mapped_column(String(255))
    order: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id"), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    preflight_checklist: Mapped["MissionPreflightChecklist"] = relationship(
        back_populates="items"
    )
    completed_by: Mapped[Optional["User"]] = relationship(
        foreign_keys=[completed_by_user_id]
    )

    def to_dict(self) -> dict:
        completed_user = self.completed_by
        return {
            "preflight_item_id": str(self.preflight_item_id),
            "preflight_id": str(self.preflight_id),
            "source_checklist_id": str(self.source_checklist_id)
            if self.source_checklist_id
            else None,
            "source_checklist_item_id": str(self.source_checklist_item_id)
            if self.source_checklist_item_id
            else None,
            "section_title": self.section_title,
            "section_order": self.section_order,
            "item_text": self.item_text,
            "order": self.order,
            "is_completed": self.is_completed,
            "note": self.note,
            "completed_by_user_id": str(self.completed_by_user_id)
            if self.completed_by_user_id
            else None,
            "completed_by_name": completed_user.full_name
            if completed_user and getattr(completed_user, "full_name", None)
            else None,
            "completed_at": self.completed_at.isoformat()
            if self.completed_at
            else None,
        }


class MissionPostflightChecklist(db.Model):
    __tablename__ = "mission_postflight_checklists"

    postflight_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    mission_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("missions.mission_id"), unique=True, nullable=False
    )
    status: Mapped[PreflightStatus] = mapped_column(
        Enum(PreflightStatus), default=PreflightStatus.NOT_STARTED, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    mission: Mapped["Mission"] = relationship(back_populates="postflight_checklist")
    items: Mapped[List["MissionPostflightChecklistItem"]] = relationship(
        back_populates="postflight_checklist", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        sorted_items = sorted(
            self.items,
            key=lambda item: (
                item.section_order if item.section_order is not None else 0,
                item.order if item.order is not None else 0,
            ),
        )
        return {
            "postflight_id": str(self.postflight_id),
            "mission_id": str(self.mission_id),
            "status": self.status.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "items": [item.to_dict() for item in sorted_items],
            "template_checklist_ids": [
                str(cid) for cid in self.template_checklist_ids
            ],
        }

    @property
    def template_checklist_ids(self) -> List[uuid.UUID]:
        identifiers: List[uuid.UUID] = []
        for item in sorted(
            self.items,
            key=lambda entry: (
                entry.section_order if entry.section_order is not None else 0,
                entry.order if entry.order is not None else 0,
            ),
        ):
            if item.source_checklist_id and item.source_checklist_id not in identifiers:
                identifiers.append(item.source_checklist_id)
        return identifiers


class MissionPostflightChecklistItem(db.Model):
    __tablename__ = "mission_postflight_checklist_items"

    postflight_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    postflight_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("mission_postflight_checklists.postflight_id"), nullable=False
    )
    source_checklist_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("checklists.checklist_id"), nullable=True
    )
    source_checklist_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("checklist_items.item_id"), nullable=True
    )
    section_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    section_order: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    item_text: Mapped[str] = mapped_column(String(255))
    order: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id"), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    postflight_checklist: Mapped["MissionPostflightChecklist"] = relationship(
        back_populates="items"
    )
    completed_by: Mapped[Optional["User"]] = relationship(
        foreign_keys=[completed_by_user_id]
    )

    def to_dict(self) -> dict:
        completed_user = self.completed_by
        return {
            "postflight_item_id": str(self.postflight_item_id),
            "postflight_id": str(self.postflight_id),
            "source_checklist_id": str(self.source_checklist_id)
            if self.source_checklist_id
            else None,
            "source_checklist_item_id": str(self.source_checklist_item_id)
            if self.source_checklist_item_id
            else None,
            "section_title": self.section_title,
            "section_order": self.section_order,
            "item_text": self.item_text,
            "order": self.order,
            "is_completed": self.is_completed,
            "note": self.note,
            "completed_by_user_id": str(self.completed_by_user_id)
            if self.completed_by_user_id
            else None,
            "completed_by_name": completed_user.full_name
            if completed_user and getattr(completed_user, "full_name", None)
            else None,
            "completed_at": self.completed_at.isoformat()
            if self.completed_at
            else None,
        }


__all__ = [
    "Mission",
    "MissionWaypoint",
    "MissionPreflightChecklist",
    "MissionPreflightChecklistItem",
    "MissionPostflightChecklist",
    "MissionPostflightChecklistItem",
]
