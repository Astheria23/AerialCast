"""Drone fleet CRUD services."""

from flask_smorest import abort

from ..models.master import Drone
from ..repositories import DroneRepository


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
    def _extract_specs(cls, payload: dict) -> dict:
        specs_data = payload.pop("specs", None)
        if not isinstance(specs_data, dict):
            return {}
        return {k: v for k, v in specs_data.items() if k in cls._allowed_specs_keys}

    @classmethod
    def _get_or_404(cls, drone_id):
        drone = cls.drone_repository.get(drone_id)
        if drone is None:
            abort(404, message="Drone not found")
        return drone

    @classmethod
    def create_drone(cls, data: dict):
        repo = cls.drone_repository
        specs_payload = cls._extract_specs(data)

        if repo.find_by_lora_id(data["lora_id"]):
            return {"error": "LoRa ID already registered"}, 409

        new_drone = Drone(**data)

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
        specs_payload = cls._extract_specs(data)

        for key, value in data.items():
            setattr(drone, key, value)

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
        repo.delete(drone)
        repo.commit()
        return {"message": "Drone deleted successfully"}, 200


__all__ = ["FleetService"]
