"""Data access helpers for drone entities."""

from __future__ import annotations

from typing import Optional, Sequence

from sqlalchemy import select

from ..models.master import Drone, DroneSpecs
from .base import Repository


class DroneRepository(Repository[Drone]):
    model = Drone
    specs_model = DroneSpecs

    @classmethod
    def find_by_lora_id(cls, lora_id: str) -> Optional[Drone]:
        stmt = select(Drone).filter_by(lora_id=lora_id)
        return cls.session().execute(stmt).scalar_one_or_none()

    @classmethod
    def list_all(cls) -> Sequence[Drone]:  # type: ignore[override]
        stmt = select(Drone).order_by(Drone.created_at.asc())
        return list(cls.session().execute(stmt).scalars())

    @classmethod
    def set_specs(cls, drone: Drone, specs_payload: dict | None) -> Optional[DroneSpecs]:
        if not specs_payload:
            return None

        specs = drone.specs
        if specs is None:
            specs = cls.specs_model()
            specs.drone = drone
            cls.session().add(specs)

        for key, value in specs_payload.items():
            setattr(specs, key, value)

        return specs


__all__ = ["DroneRepository"]
