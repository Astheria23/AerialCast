from ..extensions import db
from ..models.master import Checklist, ChecklistItem
from ..models.enums import ChecklistType
from sqlalchemy.exc import IntegrityError


def _parse_checklist_type(value):
    """Normalize incoming checklist type (string or enum) to ChecklistType.

    Accepts either already a ChecklistType, or a string matching enum name/value
    case-insensitively. Raises ValueError if invalid.
    """
    if isinstance(value, ChecklistType):
        return value
    if isinstance(value, str):
        candidate = value.strip().upper()
        # Try name lookup
        try:
            return ChecklistType[candidate]
        except KeyError:
            # Fallback: match by value
            for ct in ChecklistType:
                if ct.value.upper() == candidate:
                    return ct
    raise ValueError(f"Invalid checklist type: {value}")

class ChecklistService:
    
    @staticmethod
    def create_checklist(data):
        """
        Membuat Template Checklist beserta Item-nya
        """
        # 1. Validasi & Buat Header Checklist
        title = data.get('title')
        if not title or not isinstance(title, str):
            return {"error": "title wajib berupa string"}, 400

        raw_type = data.get('type')
        try:
            checklist_type = _parse_checklist_type(raw_type)
        except ValueError as e:
            return {"error": str(e), "allowed_types": [ct.value for ct in ChecklistType]}, 400
        # 2. Instansiasi Checklist (tanpa kwargs sesuai pola model)
        new_checklist = Checklist()
        new_checklist.title = title
        new_checklist.type = checklist_type

        # 3. Validasi & Tambah Items
        items_data = data.get('items', [])
        if not isinstance(items_data, list):
            return {"error": "items harus berupa list"}, 400

        seen_orders = set()
        for idx, item in enumerate(items_data):
            if not isinstance(item, dict):
                return {"error": f"Item index {idx} harus object"}, 400
            if 'item_text' not in item or 'order' not in item:
                return {"error": f"Item index {idx} wajib punya field item_text dan order"}, 400
            item_text = item['item_text']
            order = item['order']
            if not isinstance(item_text, str) or not item_text.strip():
                return {"error": f"Item index {idx} item_text invalid"}, 400
            if not isinstance(order, int):
                return {"error": f"Item index {idx} order harus integer"}, 400
            if order in seen_orders:
                return {"error": f"Duplikat order pada item index {idx}: {order}"}, 400
            seen_orders.add(order)
            new_item = ChecklistItem()
            new_item.item_text = item_text.strip()
            new_item.order = order
            new_checklist.items.append(new_item)

        # 4. Simpan ke DB
        try:
            db.session.add(new_checklist)
            db.session.commit()
            return new_checklist, 201
        except IntegrityError as ie:
            db.session.rollback()
            return {"error": "Integrity error: kemungkinan duplikat atau constraint gagal", "detail": str(ie)}, 400
        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 500

    @staticmethod
    def get_all_checklists():
        return Checklist.query.all()

    @staticmethod
    def get_checklist_by_id(checklist_id):
        return Checklist.query.get_or_404(checklist_id)

    @staticmethod
    def delete_checklist(checklist_id):
        # Karena cascade="all, delete-orphan" di model, items otomatis kehapus
        checklist = Checklist.query.get_or_404(checklist_id)
        try:
            db.session.delete(checklist)
            db.session.commit()
            return {"message": "Checklist deleted"}, 200
        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 500