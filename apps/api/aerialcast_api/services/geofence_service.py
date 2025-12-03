"""Geofence CRUD operations and validation helpers."""

from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models.enums import GeofenceType
from ..models.master import Geofence, GeofencePoint


def _parse_geofence_type(value):
    if isinstance(value, GeofenceType):
        return value
    if isinstance(value, str):
        candidate = value.strip().upper()
        try:
            return GeofenceType[candidate]
        except KeyError:
            for gf_type in GeofenceType:
                if gf_type.value.upper() == candidate:
                    return gf_type
    raise ValueError(f"Invalid geofence type: {value}")


class GeofenceService:
    @staticmethod
    def create_geofence(data: dict):
        area_name = data.get("area_name")
        if not isinstance(area_name, str) or not area_name.strip():
            return {"error": "area_name must be a non-empty string"}, 400

        raw_type = data.get("type")
        try:
            geofence_type = _parse_geofence_type(raw_type)
        except ValueError as exc:
            return {
                "error": str(exc),
                "allowed_types": [gt.value for gt in GeofenceType],
            }, 400

        new_geofence = Geofence()
        new_geofence.area_name = area_name.strip()
        new_geofence.type = geofence_type

        points_data = data.get("points", [])
        if not isinstance(points_data, list):
            return {"error": "points must be a list"}, 400
        seen_orders = set()
        for idx, point in enumerate(points_data):
            if not isinstance(point, dict):
                return {"error": f"Point at index {idx} must be an object"}, 400
            for key in ("latitude", "longitude", "order"):
                if key not in point:
                    return {
                        "error": f"Point at index {idx} must include field '{key}'"
                    }, 400
            lat = point["latitude"]
            lon = point["longitude"]
            order = point["order"]
            if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
                return {
                    "error": f"Point at index {idx} latitude/longitude must be numeric"
                }, 400
            if not isinstance(order, int):
                return {"error": f"Point at index {idx} order must be an integer"}, 400
            if order in seen_orders:
                return {"error": f"Duplicate order at point index {idx}: {order}"}, 400
            seen_orders.add(order)

            new_point = GeofencePoint()
            new_point.latitude = float(lat)
            new_point.longitude = float(lon)
            new_point.order = order
            new_geofence.points.append(new_point)

        try:
            db.session.add(new_geofence)
            db.session.commit()
            return new_geofence, 201
        except IntegrityError as err:
            db.session.rollback()
            return {
                "error": "Integrity error: possible constraint violation",
                "detail": str(err),
            }, 400
        except Exception as exc:  # pragma: no cover - defensive fallback
            db.session.rollback()
            return {"error": str(exc)}, 500

    @staticmethod
    def get_all_geofences():
        return Geofence.query.order_by(Geofence.created_at.desc()).all()

    @staticmethod
    def get_geofence_by_id(geofence_id):
        return Geofence.query.get_or_404(geofence_id)

    @staticmethod
    def delete_geofence(geofence_id):
        geofence = Geofence.query.get_or_404(geofence_id)
        try:
            db.session.delete(geofence)
            db.session.commit()
            return {"message": "Geofence deleted"}, 200
        except Exception as exc:  # pragma: no cover - defensive fallback
            db.session.rollback()
            return {"error": str(exc)}, 500

    @staticmethod
    def update_geofence(geofence_id, data: dict):
        geofence = Geofence.query.get_or_404(geofence_id)

        if "area_name" in data:
            area_name = data.get("area_name")
            if area_name is not None:
                if not isinstance(area_name, str) or not area_name.strip():
                    return {"error": "area_name must be a non-empty string"}, 400
                geofence.area_name = area_name.strip()

        if "type" in data:
            raw_type = data.get("type")
            if raw_type is not None:
                try:
                    geofence.type = _parse_geofence_type(raw_type)
                except ValueError as exc:
                    return {
                        "error": str(exc),
                        "allowed_types": [gt.value for gt in GeofenceType],
                    }, 400

        if "points" in data:
            points_data = data.get("points")
            if not isinstance(points_data, list):
                return {"error": "points must be a list"}, 400
            geofence.points.clear()
            orders = [point["order"] for point in points_data if "order" in point]
            if len(orders) != len(set(orders)):
                return {
                    "error": "Duplicate point order values are not allowed"
                }, 400
            for point in points_data:
                new_point = GeofencePoint()
                new_point.latitude = point["latitude"]
                new_point.longitude = point["longitude"]
                new_point.order = point["order"]
                geofence.points.append(new_point)

        try:
            db.session.commit()
            return geofence, 200
        except Exception as exc:  # pragma: no cover - defensive fallback
            db.session.rollback()
            return {"error": str(exc)}, 500


__all__ = ["GeofenceService"]
