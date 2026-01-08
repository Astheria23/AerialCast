"""Telemetry persistence helpers."""

from __future__ import annotations

from datetime import datetime
from typing import Optional, Sequence

from sqlalchemy import select

from ..models.execution import TelemetryData
from .base import Repository

    
class TelemetryRepository(Repository[TelemetryData]):
    model = TelemetryData

    @classmethod
    def list_for_session(
        cls,
        session_id,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        limit: Optional[int] = None,
        sample_every: Optional[int] = None,
    ) -> Sequence[TelemetryData]:
        stmt = select(TelemetryData).filter_by(session_id=session_id)
        if since is not None:
            stmt = stmt.filter(TelemetryData.time >= since)
        if until is not None:
            stmt = stmt.filter(TelemetryData.time <= until)
        stmt = stmt.order_by(TelemetryData.time.asc())
        if limit is not None:
            stmt = stmt.limit(limit)
        points = list(cls.session().execute(stmt).scalars())
        if sample_every and sample_every > 1:
            points = points[::sample_every]
        return points


__all__ = ["TelemetryRepository"]
