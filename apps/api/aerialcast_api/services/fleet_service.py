"""Drone fleet CRUD services."""

from __future__ import annotations

from flask import current_app
from flask_smorest import abort
from sqlalchemy.exc import IntegrityError

from ..models.master import Drone
from ..repositories import DroneRepository
from .storage_service import StorageService, StorageServiceError


class FleetService:
    drone_repository = DroneRepository
    _allowed_specs_keys = {
        "flight_controller",
        "motor",
        "esc",
        "propeller",
        "battery",
        "gps_module",
        "weight_g",
        "max_flight_time_min",
        "additional_info",
        "image_url",
    }

    @classmethod
    def _extract_specs(cls, payload: dict) -> tuple[dict, str | None]:
        specs_data = payload.pop("specs", None)
        if not isinstance(specs_data, dict):
            return {}, None
        image_payload = specs_data.pop("image_base64", None)
        filtered = {k: v for k, v in specs_data.items() if k in cls._allowed_specs_keys}
        return filtered, image_payload

    @classmethod
    def _get_or_404(cls, drone_id):
        drone = cls.drone_repository.get(drone_id)
        if drone is None:
            abort(404, message="Drone not found")
        return drone

    @classmethod
    def create_drone(cls, data: dict):
        repo = cls.drone_repository
        specs_payload, image_payload = cls._extract_specs(data)

        if repo.find_by_lora_id(data["lora_id"]):
            return {"error": "LoRa ID already registered"}, 409

        new_drone = Drone(**data)

        if image_payload:
            try:
                uploaded_url = StorageService.upload_drone_image(new_drone.drone_id, image_payload)
                specs_payload = {**specs_payload, "image_url": uploaded_url}
            except StorageServiceError as exc:
                current_app.logger.warning("Drone image upload failed: %s", exc)
                return {"error": str(exc)}, 500

        try:
            repo.add(new_drone)
            if specs_payload:
                repo.set_specs(new_drone, specs_payload)
            repo.commit()
            return new_drone, 201
        except Exception as exc:  # pragma: no cover - defensive fallback
            repo.rollback()
            return {"error": str(exc)}, 500

    @classmethod
    def get_all_drones(cls):
        return cls.drone_repository.list_all()

    @classmethod
    def get_drone_by_id(cls, drone_id):
        return cls._get_or_404(drone_id)

    @classmethod
    def update_drone(cls, drone_id, data: dict):
        drone = cls._get_or_404(drone_id)
        repo = cls.drone_repository
        specs_payload, image_payload = cls._extract_specs(data)

        for key, value in data.items():
            setattr(drone, key, value)

        if image_payload:
            try:
                uploaded_url = StorageService.upload_drone_image(drone.drone_id, image_payload)
                specs_payload = {**specs_payload, "image_url": uploaded_url}
            except StorageServiceError as exc:
                current_app.logger.warning("Drone image upload failed: %s", exc)
                return {"error": str(exc)}, 500

        if specs_payload:
            repo.set_specs(drone, specs_payload)

        try:
            repo.commit()
            return drone, 200
        except Exception as exc:  # pragma: no cover - defensive fallback
            repo.rollback()
            return {"error": str(exc)}, 500

    @classmethod
    def delete_drone(cls, drone_id):
        drone = cls._get_or_404(drone_id)
        repo = cls.drone_repository
        try:
            repo.delete(drone)
            repo.commit()
        except IntegrityError:
            repo.rollback()
            return {"error": "Drone is referenced by other records and cannot be deleted."}, 409
        except Exception as exc:  # pragma: no cover - defensive fallback
            repo.rollback()
            return {"error": str(exc)}, 500
        return None, 204


__all__ = ["FleetService"]
