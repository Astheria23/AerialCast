"""Maintenance log persistence helpers."""

from __future__ import annotations

from typing import Sequence

from sqlalchemy import select

from ..models.execution import MaintenanceLog
from .base import Repository


class MaintenanceRepository(Repository[MaintenanceLog]):
    model = MaintenanceLog

    @classmethod
    def list_by_drone(cls, drone_id) -> Sequence[MaintenanceLog]:
        stmt = (
            select(MaintenanceLog)
            .filter_by(drone_id=drone_id)
            .order_by(MaintenanceLog.log_date.desc())
        )
        return list(cls.session().execute(stmt).scalars())


__all__ = ["MaintenanceRepository"]
