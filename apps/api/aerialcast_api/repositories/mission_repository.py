"""Mission persistence helpers."""

from __future__ import annotations

from typing import Iterable, Optional, Sequence

from sqlalchemy import select

from ..models.associations import mission_checklists
from ..models.enums import MissionStatus
from ..models.master import Checklist, Drone
from ..models.planning import Mission
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
    def get_checklists_by_ids(cls, checklist_ids) -> Iterable[Checklist]:
        if not checklist_ids:
            return []
        stmt = select(Checklist).filter(Checklist.checklist_id.in_(checklist_ids))
        return cls.session().execute(stmt).scalars().all()

    @classmethod
    def drone_exists(cls, drone_id) -> bool:
        stmt = select(Drone.drone_id).filter(Drone.drone_id == drone_id)
        return cls.session().execute(stmt).scalar_one_or_none() is not None

    @classmethod
    def clear_checklists(cls, mission: Mission) -> None:
        cls.session().execute(
            mission_checklists.delete().where(mission_checklists.c.mission_id == mission.mission_id)
        )


__all__ = ["MissionRepository"]
