"""Shared repository helpers built on top of SQLAlchemy."""

from __future__ import annotations

from typing import Any, Generic, Iterable, Optional, Sequence, Type, TypeVar

from ..extensions import db

ModelT = TypeVar("ModelT")


class Repository(Generic[ModelT]):
    """Lightweight helper exposing common persistence operations."""

    model: Type[ModelT]

    @staticmethod
    def session():
        return db.session

    @classmethod
    def add(cls, entity: ModelT) -> ModelT:
        cls.session().add(entity)
        return entity

    @classmethod
    def add_all(cls, entities: Iterable[ModelT]) -> Iterable[ModelT]:
        cls.session().add_all(list(entities))
        return entities

    @classmethod
    def delete(cls, entity: ModelT) -> None:
        cls.session().delete(entity)

    @classmethod
    def commit(cls) -> None:
        cls.session().commit()

    @classmethod
    def rollback(cls) -> None:
        cls.session().rollback()

    @classmethod
    def get(cls, entity_id) -> Optional[ModelT]:
        # Prefer SQLAlchemy 2.0 style `Session.get` to avoid legacy warnings.
        return cls.session().get(cls.model, entity_id)

    @classmethod
    def first_by(cls, **filters: Any) -> Optional[ModelT]:
        return cls.session().query(cls.model).filter_by(**filters).first()

    @classmethod
    def list_all(cls) -> Sequence[ModelT]:
        return cls.session().query(cls.model).all()


__all__ = ["Repository"]
