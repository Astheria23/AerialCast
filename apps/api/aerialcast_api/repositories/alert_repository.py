"""Persistence helpers for alert records."""

from __future__ import annotations

from datetime import datetime
from typing import Iterable, Optional, Sequence

from sqlalchemy import desc, select

from ..models.enums import AlertType
from ..models.execution import Alert
from .base import Repository


class AlertRepository(Repository[Alert]):
    """CRUD conveniences for :class:`~aerialcast_api.models.execution.Alert`."""

    model = Alert

    @classmethod
    def record(
        cls,
        *,
        session_id,
        alert_type: AlertType,
        message: str,
        timestamp: Optional[datetime] = None,
    ) -> Alert:
        alert = Alert(
            session_id=session_id,
            alert_type=alert_type,
            message=message,
            timestamp=timestamp or datetime.utcnow(),
        )
        cls.session().add(alert)
        return alert

    @classmethod
    def find_latest_for_session(
        cls,
        session_id,
        alert_type: Optional[AlertType] = None,
    ) -> Optional[Alert]:
        stmt = select(Alert).filter(Alert.session_id == session_id)
        if alert_type is not None:
            stmt = stmt.filter(Alert.alert_type == alert_type)
        stmt = stmt.order_by(desc(Alert.timestamp)).limit(1)
        return cls.session().execute(stmt).scalar_one_or_none()

    @classmethod
    def list_for_session(
        cls,
        session_id,
        alert_type: Optional[AlertType] = None,
        limit: Optional[int] = None,
    ) -> Sequence[Alert]:
        stmt = (
            select(Alert)
            .filter(Alert.session_id == session_id)
            .order_by(desc(Alert.timestamp))
        )
        if alert_type is not None:
            stmt = stmt.filter(Alert.alert_type == alert_type)
        if limit is not None:
            stmt = stmt.limit(limit)
        return list(cls.session().execute(stmt).scalars())

    @classmethod
    def list_for_sessions(
        cls,
        session_ids: Iterable,
        limit: Optional[int] = None,
    ) -> Sequence[Alert]:
        ids = list(session_ids)
        if not ids:
            return []
        stmt = (
            select(Alert)
            .filter(Alert.session_id.in_(ids))
            .order_by(desc(Alert.timestamp))
        )
        if limit is not None:
            stmt = stmt.limit(limit)
        return list(cls.session().execute(stmt).scalars())


__all__ = ["AlertRepository"]
