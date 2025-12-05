"""Data access helpers for user entities."""

from __future__ import annotations

from typing import Optional

from ..models.master import User
from .base import Repository


class UserRepository(Repository[User]):
    model = User

    @classmethod
    def find_by_email(cls, email: str) -> Optional[User]:
        return cls.first_by(email=email)


__all__ = ["UserRepository"]
