"""Geofence persistence helpers."""

from __future__ import annotations

from typing import Iterable, Optional, Sequence

from sqlalchemy import select

from ..models.master import Geofence
from .base import Repository


class GeofenceRepository(Repository[Geofence]):
    model = Geofence

    @classmethod
    def find_by_id(cls, geofence_id) -> Optional[Geofence]:
        return super().get(geofence_id)

    @classmethod
    def list_all(cls) -> Sequence[Geofence]:  # type: ignore[override]
        stmt = select(Geofence).order_by(Geofence.created_at.desc())
        return list(cls.session().execute(stmt).scalars())

    @classmethod
    def find_by_ids(cls, geofence_ids) -> Iterable[Geofence]:
        if not geofence_ids:
            return []
        stmt = select(Geofence).filter(Geofence.geofence_id.in_(geofence_ids))
        return cls.session().execute(stmt).scalars().all()


__all__ = ["GeofenceRepository"]
