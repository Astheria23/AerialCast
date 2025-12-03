"""Maintenance log services."""

from ..extensions import db
from ..models.execution import MaintenanceLog
from ..models.master import Drone


class MaintenanceService:
    @staticmethod
    def create_log(drone_id, data: dict, user_id):
        drone = Drone.query.get(drone_id)
        if not drone:
            return {"error": "Drone not found"}, 404

        new_log = MaintenanceLog()
        new_log.drone_id = drone_id
        new_log.serviced_by_user_id = user_id
        new_log.notes = data["notes"]

        if "log_date" in data:
            new_log.log_date = data["log_date"]

        try:
            db.session.add(new_log)
            db.session.commit()
            return new_log, 201
        except Exception as exc:  # pragma: no cover - defensive fallback
            db.session.rollback()
            return {"error": str(exc)}, 500

    @staticmethod
    def get_logs_by_drone(drone_id):
        return (
            MaintenanceLog.query.filter_by(drone_id=drone_id)
            .order_by(MaintenanceLog.log_date.desc())
            .all()
        )

    @staticmethod
    def update_log(log_id, data: dict, user_id, role):
        log = MaintenanceLog.query.get_or_404(log_id)

        if role != "ADMIN" and str(log.serviced_by_user_id) != str(user_id):
            return {
                "error": "Unauthorized: you are not allowed to modify this log"
            }, 403

        if "notes" in data:
            log.notes = data["notes"]
        if "log_date" in data:
            log.log_date = data["log_date"]

        db.session.commit()
        return log, 200

    @staticmethod
    def delete_log(log_id, user_id, role):
        log = MaintenanceLog.query.get_or_404(log_id)
        if role != "ADMIN" and str(log.serviced_by_user_id) != str(user_id):
            return {
                "error": "Unauthorized: you are not allowed to delete this log"
            }, 403

        db.session.delete(log)
        db.session.commit()
        return {"message": "Log deleted"}, 200


__all__ = ["MaintenanceService"]
