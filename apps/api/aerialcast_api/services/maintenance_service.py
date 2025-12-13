"""Maintenance log services."""

from datetime import date, datetime

from sqlalchemy.orm import joinedload

from ..extensions import db
from ..models.enums import DroneStatus, MaintenanceStatus, UserRole
from ..models.execution import MaintenanceLog
from ..models.master import Drone, User


class MaintenanceService:
    @classmethod
    def create_log(cls, drone_id, data: dict, creator_id):
        drone = Drone.query.get(drone_id)
        if not drone:
            return {"error": "Drone not found"}, 404

        assigned_pilot_id = (
            data.get("assigned_pilot_id")
            or data.get("serviced_by_user_id")
            or data.get("pilot_id")
        )
        if not assigned_pilot_id:
            return {"error": "assigned_pilot_id is required"}, 400

        assigned_pilot = User.query.get(assigned_pilot_id)
        if not assigned_pilot or assigned_pilot.role != UserRole.PILOT:
            return {"error": "Assigned user must be a pilot"}, 400

        notes = data.get("notes", "").strip()
        if not notes:
            return {"error": "notes is required"}, 400

        try:
            scheduled_for = cls._parse_date(
                data.get("scheduled_for") or data.get("log_date")
            )
        except ValueError as exc:
            return {"error": str(exc)}, 400

        try:
            status = cls._parse_status(data.get("status"))
        except ValueError as exc:
            return {"error": str(exc)}, 400

        new_log = MaintenanceLog()
        new_log.drone_id = drone_id
        new_log.created_by_user_id = creator_id
        new_log.assigned_pilot_id = assigned_pilot.user_id
        new_log.notes = notes
        new_log.scheduled_for = scheduled_for or datetime.utcnow().date()
        new_log.status = status

        if status in {MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.COMPLETED}:
            new_log.started_at = datetime.utcnow()
        if status is MaintenanceStatus.COMPLETED:
            new_log.completed_at = datetime.utcnow()

        try:
            db.session.add(new_log)
            db.session.flush()
            cls._sync_drone_status(drone)
            db.session.commit()
            db.session.refresh(new_log)
            return new_log, 201
        except Exception as exc:  # pragma: no cover - defensive fallback
            db.session.rollback()
            return {"error": str(exc)}, 500

    @staticmethod
    def get_logs_by_drone(drone_id):
        return (
            MaintenanceLog.query.options(
                joinedload(MaintenanceLog.assigned_pilot),
                joinedload(MaintenanceLog.created_by),
            )
            .filter_by(drone_id=drone_id)
            .order_by(MaintenanceLog.scheduled_for.desc())
            .all()
        )

    @classmethod
    def update_log(cls, log_id, data: dict, user_id, role):
        log = MaintenanceLog.query.get_or_404(log_id)
        is_admin = role == "ADMIN"
        is_assigned = str(log.assigned_pilot_id) == str(user_id)

        if not is_admin and not is_assigned:
            return {
                "error": "Unauthorized: you are not allowed to modify this log"
            }, 403

        if "notes" in data and isinstance(data["notes"], str):
            log.notes = data["notes"].strip() or log.notes

        if "scheduled_for" in data or "log_date" in data:
            if not is_admin:
                return {"error": "Only admins can reschedule maintenance"}, 403
            try:
                parsed_date = cls._parse_date(
                    data.get("scheduled_for") or data.get("log_date")
                )
            except ValueError as exc:
                return {"error": str(exc)}, 400
            if parsed_date:
                log.scheduled_for = parsed_date

        if "assigned_pilot_id" in data:
            if not is_admin:
                return {"error": "Only admins can reassign maintenance"}, 403
            pilot_id = data.get("assigned_pilot_id")
            pilot = User.query.get(pilot_id) if pilot_id else None
            if not pilot or pilot.role != UserRole.PILOT:
                return {"error": "Assigned user must be a pilot"}, 400
            log.assigned_pilot_id = pilot.user_id

        if "status" in data:
            try:
                new_status = cls._parse_status(data.get("status"))
            except ValueError as exc:
                return {"error": str(exc)}, 400
            if new_status is not None:
                log.status = new_status
                if new_status is MaintenanceStatus.SCHEDULED:
                    log.started_at = None
                    log.completed_at = None
                elif new_status is MaintenanceStatus.IN_PROGRESS:
                    if log.started_at is None:
                        log.started_at = datetime.utcnow()
                    log.completed_at = None
                elif new_status is MaintenanceStatus.COMPLETED:
                    if log.started_at is None:
                        log.started_at = datetime.utcnow()
                    log.completed_at = datetime.utcnow()

        try:
            db.session.flush()
            cls._sync_drone_status(log.drone)
            db.session.commit()
            db.session.refresh(log)
            return log, 200
        except Exception as exc:  # pragma: no cover - defensive fallback
            db.session.rollback()
            return {"error": str(exc)}, 500

    @classmethod
    def delete_log(cls, log_id, user_id, role):
        if role != "ADMIN":
            return {"error": "Only admins can delete maintenance logs"}, 403

        log = MaintenanceLog.query.get_or_404(log_id)
        drone = log.drone

        try:
            db.session.delete(log)
            db.session.flush()
            cls._sync_drone_status(drone)
            db.session.commit()
            return {"message": "Log deleted"}, 200
        except Exception as exc:  # pragma: no cover - defensive fallback
            db.session.rollback()
            return {"error": str(exc)}, 500

    @staticmethod
    def list_assignees():
        pilots = (
            User.query.filter_by(role=UserRole.PILOT)
            .order_by(User.full_name.asc())
            .all()
        )
        return [
            {
                "user_id": str(pilot.user_id),
                "full_name": pilot.full_name,
                "email": pilot.email,
            }
            for pilot in pilots
        ]

    @staticmethod
    def _parse_date(value) -> date | None:
        if value is None:
            return None
        if isinstance(value, date) and not isinstance(value, datetime):
            return value
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, str):
            try:
                parsed = datetime.fromisoformat(value)
                return parsed.date()
            except ValueError:
                try:
                    return datetime.strptime(value, "%Y-%m-%d").date()
                except ValueError:
                    raise ValueError("Invalid date format")
        raise ValueError("Invalid date value")

    @staticmethod
    def _parse_status(value) -> MaintenanceStatus:
        if value is None:
            return MaintenanceStatus.SCHEDULED
        if isinstance(value, MaintenanceStatus):
            return value
        if isinstance(value, str):
            try:
                return MaintenanceStatus[value.upper()]
            except KeyError as exc:
                raise ValueError("Invalid maintenance status") from exc
        raise ValueError("Invalid maintenance status")

    @staticmethod
    def _sync_drone_status(drone: Drone | None):
        if not drone:
            return

        open_logs = [
            log
            for log in getattr(drone, "maintenance_logs", [])
            if log.status != MaintenanceStatus.COMPLETED
        ]

        if open_logs:
            drone.status = DroneStatus.MAINTENANCE
        else:
            if drone.status == DroneStatus.MAINTENANCE:
                drone.status = DroneStatus.READY


__all__ = ["MaintenanceService"]
