"""Mission persistence helpers."""

from __future__ import annotations

from typing import Optional, Sequence

from sqlalchemy import select

from ..models.enums import MissionStatus
from ..models.master import Drone
from ..models.planning import Mission, MissionPreflightChecklist
from .base import Repository


class MissionRepository(Repository[Mission]):
    model = Mission

    @classmethod
    def find_by_id(cls, mission_id) -> Optional[Mission]:
        return super().get(mission_id)

    @classmethod
    def list_all(cls) -> Sequence[Mission]:  # type: ignore[override]
        stmt = select(Mission).order_by(Mission.created_at.desc())
        return list(cls.session().execute(stmt).scalars())

    @classmethod
    def list_by_creator(cls, user_id) -> Sequence[Mission]:
        stmt = (
            select(Mission)
            .filter(Mission.created_by_user_id == user_id)
            .order_by(Mission.created_at.desc())
        )
        return list(cls.session().execute(stmt).scalars())

    @classmethod
    def find_live_for_drone(cls, drone_id) -> Optional[Mission]:
        stmt = select(Mission).filter_by(drone_id=drone_id, status=MissionStatus.IN_PROGRESS)
        return cls.session().execute(stmt).scalar_one_or_none()

    @classmethod
    def find_approved_for_drone(cls, drone_id) -> Optional[Mission]:
        stmt = select(Mission).filter_by(drone_id=drone_id, status=MissionStatus.APPROVED)
        return cls.session().execute(stmt).scalar_one_or_none()

    @classmethod
    def drone_exists(cls, drone_id) -> bool:
        stmt = select(Drone.drone_id).filter(Drone.drone_id == drone_id)
        return cls.session().execute(stmt).scalar_one_or_none() is not None

    @classmethod
    def get_preflight(cls, mission_id) -> Optional[MissionPreflightChecklist]:
        stmt = select(MissionPreflightChecklist).filter_by(mission_id=mission_id)
        return cls.session().execute(stmt).scalar_one_or_none()


__all__ = ["MissionRepository"]
