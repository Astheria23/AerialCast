"""Flight session persistence helpers."""

from __future__ import annotations

from typing import Optional, Sequence

from sqlalchemy import select

from ..models.enums import SessionStatus
from ..models.execution import FlightSession
from .base import Repository


class FlightSessionRepository(Repository[FlightSession]):
    model = FlightSession

    @classmethod
    def find_live_by_drone(cls, drone_id) -> Optional[FlightSession]:
        stmt = select(FlightSession).filter_by(drone_id=drone_id, status=SessionStatus.LIVE)
        return cls.session().execute(stmt).scalar_one_or_none()

    @classmethod
    def list_all(cls) -> Sequence[FlightSession]:  # type: ignore[override]
        stmt = select(FlightSession).order_by(FlightSession.start_time.desc())
        return list(cls.session().execute(stmt).scalars())

    @classmethod
    def find_by_id(cls, session_id) -> Optional[FlightSession]:
        return super().get(session_id)


__all__ = ["FlightSessionRepository"]
