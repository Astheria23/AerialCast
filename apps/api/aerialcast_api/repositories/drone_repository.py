"""Data access helpers for drone entities."""

from __future__ import annotations

from typing import Optional, Sequence

from sqlalchemy import select

from ..models.master import Drone
from .base import Repository


class DroneRepository(Repository[Drone]):
    model = Drone

    @classmethod
    def find_by_lora_id(cls, lora_id: str) -> Optional[Drone]:
        stmt = select(Drone).filter_by(lora_id=lora_id)
        return cls.session().execute(stmt).scalar_one_or_none()

    @classmethod
    def list_all(cls) -> Sequence[Drone]:  # type: ignore[override]
        stmt = select(Drone).order_by(Drone.created_at.asc())
        return list(cls.session().execute(stmt).scalars())


__all__ = ["DroneRepository"]
