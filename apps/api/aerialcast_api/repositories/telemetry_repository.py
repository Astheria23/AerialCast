"""Telemetry persistence helpers."""

from __future__ import annotations

from typing import Sequence

from sqlalchemy import select

from ..models.execution import TelemetryData
from .base import Repository


class TelemetryRepository(Repository[TelemetryData]):
    model = TelemetryData

    @classmethod
    def list_for_session(cls, session_id) -> Sequence[TelemetryData]:
        stmt = (
            select(TelemetryData)
            .filter_by(session_id=session_id)
            .order_by(TelemetryData.time.asc())
        )
        return list(cls.session().execute(stmt).scalars())


__all__ = ["TelemetryRepository"]
