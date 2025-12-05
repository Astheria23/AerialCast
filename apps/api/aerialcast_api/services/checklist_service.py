"""Checklist CRUD operations and validation helpers."""

from flask_smorest import abort
from sqlalchemy.exc import IntegrityError

from ..models.enums import ChecklistType
from ..models.master import Checklist, ChecklistItem
from ..repositories import ChecklistRepository


def _parse_checklist_type(value):
    """Normalize incoming checklist type to a ChecklistType enum."""

    if isinstance(value, ChecklistType):
        return value
    if isinstance(value, str):
        candidate = value.strip().upper()
        try:
            return ChecklistType[candidate]
        except KeyError:
            for checklist_type in ChecklistType:
                if checklist_type.value.upper() == candidate:
                    return checklist_type
    raise ValueError(f"Invalid checklist type: {value}")


class ChecklistService:
    checklist_repository = ChecklistRepository

    @classmethod
    def _get_or_404(cls, checklist_id):
        checklist = cls.checklist_repository.find_by_id(checklist_id)
        if checklist is None:
            abort(404, message="Checklist not found")
        return checklist

    @classmethod
    def create_checklist(cls, data: dict):
        title = data.get("title")
        if not title or not isinstance(title, str):
            return {"error": "title must be a non-empty string"}, 400

        raw_type = data.get("type")
        try:
            checklist_type = _parse_checklist_type(raw_type)
        except ValueError as exc:
            return {
                "error": str(exc),
                "allowed_types": [ct.value for ct in ChecklistType],
            }, 400

        new_checklist = Checklist()
        new_checklist.title = title
        new_checklist.type = checklist_type

        items_data = data.get("items", [])
        if not isinstance(items_data, list):
            return {"error": "items must be a list"}, 400

        seen_orders = set()
        for idx, item in enumerate(items_data):
            if not isinstance(item, dict):
                return {"error": f"Item at index {idx} must be an object"}, 400
            if "item_text" not in item or "order" not in item:
                return {
                    "error": f"Item at index {idx} must include fields item_text and order"
                }, 400
            item_text = item["item_text"]
            order = item["order"]
            if not isinstance(item_text, str) or not item_text.strip():
                return {"error": f"Item at index {idx} item_text is invalid"}, 400
            if not isinstance(order, int):
                return {"error": f"Item at index {idx} order must be an integer"}, 400
            if order in seen_orders:
                return {"error": f"Duplicate order at item index {idx}: {order}"}, 400
            seen_orders.add(order)
            new_item = ChecklistItem()
            new_item.item_text = item_text.strip()
            new_item.order = order
            new_checklist.items.append(new_item)

        repo = cls.checklist_repository

        try:
            repo.add(new_checklist)
            repo.commit()
            return new_checklist, 201
        except IntegrityError as err:
            repo.rollback()
            return {
                "error": "Integrity error: possible constraint violation or duplicate",
                "detail": str(err),
            }, 400
        except Exception as exc:  # pragma: no cover - defensive fallback
            repo.rollback()
            return {"error": str(exc)}, 500

    @classmethod
    def get_all_checklists(cls):
        return cls.checklist_repository.list_all()

    @classmethod
    def get_checklist_by_id(cls, checklist_id):
        return cls._get_or_404(checklist_id)

    @classmethod
    def delete_checklist(cls, checklist_id):
        checklist = cls._get_or_404(checklist_id)
        repo = cls.checklist_repository
        try:
            repo.delete(checklist)
            repo.commit()
            return {"message": "Checklist deleted"}, 200
        except Exception as exc:  # pragma: no cover - defensive fallback
            repo.rollback()
            return {"error": str(exc)}, 500

    @classmethod
    def update_checklist(cls, checklist_id, data: dict):
        checklist = cls._get_or_404(checklist_id)
        repo = cls.checklist_repository

        if "title" in data:
            title = data.get("title")
            if title is not None:
                if not isinstance(title, str) or not title.strip():
                    return {"error": "title must be a non-empty string"}, 400
                checklist.title = title.strip()

        if "type" in data:
            raw_type = data.get("type")
            if raw_type is not None:
                try:
                    checklist.type = _parse_checklist_type(raw_type)
                except ValueError as exc:
                    return {
                        "error": str(exc),
                        "allowed_types": [ct.value for ct in ChecklistType],
                    }, 400

        if "items" in data:
            items_data = data.get("items")
            if items_data is None:
                checklist.items.clear()
            else:
                if not isinstance(items_data, list):
                    return {"error": "items must be a list"}, 400
                checklist.items.clear()
                seen_orders = set()
                for idx, item in enumerate(items_data):
                    if not isinstance(item, dict):
                        return {"error": f"Item at index {idx} must be an object"}, 400
                    if "item_text" not in item or "order" not in item:
                        return {
                            "error": f"Item at index {idx} must include fields item_text and order"
                        }, 400
                    item_text = item["item_text"]
                    order = item["order"]
                    if not isinstance(item_text, str) or not item_text.strip():
                        return {"error": f"Item at index {idx} item_text is invalid"}, 400
                    if not isinstance(order, int):
                        return {"error": f"Item at index {idx} order must be an integer"}, 400
                    if order in seen_orders:
                        return {"error": f"Duplicate order at item index {idx}: {order}"}, 400
                    seen_orders.add(order)
                    new_item = ChecklistItem()
                    new_item.item_text = item_text.strip()
                    new_item.order = order
                    checklist.items.append(new_item)

        try:
            repo.commit()
            return checklist, 200
        except IntegrityError as err:
            repo.rollback()
            return {
                "error": "Integrity error during update",
                "detail": str(err),
            }, 400
        except Exception as exc:  # pragma: no cover - defensive fallback
            repo.rollback()
            return {"error": str(exc)}, 500


__all__ = ["ChecklistService"]
