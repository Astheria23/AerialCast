"""Checklist persistence helpers."""

from __future__ import annotations

from typing import Iterable, Optional, Sequence

from sqlalchemy import select

from ..models.master import Checklist
from .base import Repository


class ChecklistRepository(Repository[Checklist]):
    model = Checklist

    @classmethod
    def find_by_id(cls, checklist_id) -> Optional[Checklist]:
        return super().get(checklist_id)

    @classmethod
    def list_all(cls) -> Sequence[Checklist]:  # type: ignore[override]
        stmt = select(Checklist).order_by(Checklist.title.asc())
        return list(cls.session().execute(stmt).scalars())

    @classmethod
    def find_by_ids(cls, checklist_ids) -> Iterable[Checklist]:
        if not checklist_ids:
            return []
        stmt = select(Checklist).filter(Checklist.checklist_id.in_(checklist_ids))
        return cls.session().execute(stmt).scalars().all()


__all__ = ["ChecklistRepository"]
