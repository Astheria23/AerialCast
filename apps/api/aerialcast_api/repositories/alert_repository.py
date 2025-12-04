"""Alert persistence helpers."""

from __future__ import annotations

from typing import Sequence

from sqlalchemy import select

from ..models.execution import Alert
from .base import Repository


class AlertRepository(Repository[Alert]):
    model = Alert

    @classmethod
    def list_for_session(cls, session_id) -> Sequence[Alert]:
        stmt = select(Alert).filter_by(session_id=session_id).order_by(Alert.timestamp.desc())
        return list(cls.session().execute(stmt).scalars())

    @classmethod
    def list_recent(cls) -> Sequence[Alert]:
        stmt = select(Alert).order_by(Alert.timestamp.desc())
        return list(cls.session().execute(stmt).scalars())


__all__ = ["AlertRepository"]
