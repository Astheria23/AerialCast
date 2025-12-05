"""Mission domain services."""

from datetime import datetime

from flask_smorest import abort

from ..models.enums import MissionStatus, SessionStatus, UserRole
from ..models.execution import FlightSession
from ..models.planning import Mission, MissionWaypoint
from ..repositories import (
	ChecklistRepository,
	DroneRepository,
	MissionRepository,
	UserRepository,
)


class MissionService:
    mission_repository = MissionRepository
    drone_repository = DroneRepository
    checklist_repository = ChecklistRepository
    user_repository = UserRepository

    @classmethod
    def _get_mission_or_404(cls, mission_id):
        mission = cls.mission_repository.find_by_id(mission_id)
        if mission is None:
            abort(404, message="Mission not found")
        return mission

    @staticmethod
    def _close_active_sessions(mission):
        """Mark any live flight sessions for a mission as completed."""

        if not mission or not mission.mission_id:
            return 0

        live_sessions = FlightSession.query.filter_by(
            mission_id=mission.mission_id, status=SessionStatus.LIVE
        ).all()
        now = datetime.utcnow()
        for session in live_sessions:
            session.status = SessionStatus.COMPLETED
            session.end_time = now
        return len(live_sessions)

    @classmethod
    def _resolve_checklists(cls, checklist_ids):
        if checklist_ids is not None and not isinstance(checklist_ids, list):
            return [], {"error": "checklist_ids harus berupa list UUID"}, 400
        checklist_ids = checklist_ids or []
        if len(checklist_ids) != len(set(checklist_ids)):
            return [], {"error": "Duplikat checklist_ids tidak diperbolehkan"}, 400
        if not checklist_ids:
            return [], None, None

        found = list(cls.checklist_repository.find_by_ids(checklist_ids))
        found_ids = {checklist.checklist_id for checklist in found}
        missing = [str(cid) for cid in checklist_ids if cid not in found_ids]
        if missing:
            return [], {
                "error": "Checklist tidak ditemukan",
                "missing_ids": missing,
            }, 400
        return found, None, None

    @classmethod
    def create_mission(cls, data: dict, user_id):
        drone = cls.drone_repository.get(data["drone_id"])

        if not drone:
            return {"error": "Drone not found"}, 404

        new_mission = Mission()
        new_mission.mission_name = data["mission_name"]
        new_mission.notes = data.get("notes")
        new_mission.drone_id = data["drone_id"]
        new_mission.created_by_user_id = user_id

        if data.get("save_as_draft"):
            new_mission.status = MissionStatus.DRAFT
        else:
            new_mission.status = MissionStatus.PENDING_APPROVAL

        waypoints_data = data.get("waypoints", [])
        orders = [wp["order"] for wp in waypoints_data if "order" in wp]
        if len(orders) != len(set(orders)):
            return {"error": "Duplicate waypoint order values are not allowed"}, 400

        for wp in waypoints_data:
            new_wp = MissionWaypoint()
            new_wp.latitude = wp["latitude"]
            new_wp.longitude = wp["longitude"]
            new_wp.altitude = wp.get("altitude", 15.0)
            new_wp.order = wp["order"]
            new_mission.waypoints.append(new_wp)

        checklist_ids = data.get("checklist_ids", [])
        resolved_checklists, error_payload, error_status = cls._resolve_checklists(checklist_ids)
        if error_payload:
            return error_payload, error_status
        for checklist in resolved_checklists:
            new_mission.required_checklists.append(checklist)

        repo = cls.mission_repository

        try:
            repo.add(new_mission)
            repo.commit()
            return new_mission, 201
        except Exception as exc:  # pragma: no cover - defensive fallback
            repo.rollback()
            return {"error": str(exc)}, 500

    @classmethod
    def get_all_missions(cls):
        return cls.mission_repository.list_all()

    @classmethod
    def get_mission_by_id(cls, mission_id):
        return cls._get_mission_or_404(mission_id)

    @classmethod
    def update_mission(cls, mission_id, data: dict, user_id):
        mission = cls._get_mission_or_404(mission_id)
        repo = cls.mission_repository

        if "mission_name" in data:
            mission.mission_name = data["mission_name"]
        if "notes" in data:
            mission.notes = data["notes"]
        if "drone_id" in data:
            drone = cls.drone_repository.get(data["drone_id"])
            if not drone:
                return {"error": "Drone not found"}, 404
            mission.drone_id = data["drone_id"]

        if "status" in data:
            return {"error": "Use status action endpoint to change mission status"}, 400

        if "waypoints" in data and isinstance(data["waypoints"], list):
            incoming_wps = data["waypoints"]
            orders = [wp["order"] for wp in incoming_wps if "order" in wp]
            if len(orders) != len(set(orders)):
                return {"error": "Duplicate waypoint order values are not allowed"}, 400
            mission.waypoints.clear()
            for wp in incoming_wps:
                required = {"latitude", "longitude", "order"}
                if not required.issubset(wp.keys()):
                    return {"error": "Waypoint missing required fields"}, 400
                new_wp = MissionWaypoint()
                new_wp.latitude = wp["latitude"]
                new_wp.longitude = wp["longitude"]
                new_wp.altitude = wp.get("altitude", 15.0)
                new_wp.order = wp["order"]
                mission.waypoints.append(new_wp)

        if "checklist_ids" in data:
            checklist_ids = data.get("checklist_ids")
            resolved_checklists, error_payload, error_status = cls._resolve_checklists(checklist_ids)
            if error_payload:
                return error_payload, error_status
            mission.required_checklists.clear()
            for checklist in resolved_checklists:
                mission.required_checklists.append(checklist)
        try:
            repo.commit()
            return mission, 200
        except Exception as exc:  # pragma: no cover - defensive fallback
            repo.rollback()
            return {"error": str(exc)}, 500

    @classmethod
    def change_status(cls, mission_id, action: str, user_id):
        mission = cls._get_mission_or_404(mission_id)
        user = cls.user_repository.get(user_id)

        if not user or user.role != UserRole.ADMIN:
            return {"error": "Only ADMIN can change mission status"}, 403

        action_map = {
            "submit": MissionStatus.PENDING_APPROVAL,
            "approve": MissionStatus.APPROVED,
            "reject": MissionStatus.REJECTED,
            "start": MissionStatus.IN_PROGRESS,
            "complete": MissionStatus.COMPLETED,
            "cancel": MissionStatus.CANCELED,
        }
        if action not in action_map:
            return {"error": "Unknown status action"}, 400

        target = action_map[action]
        current = mission.status
        allowed_transitions = {
            MissionStatus.DRAFT: {
                MissionStatus.PENDING_APPROVAL,
                MissionStatus.CANCELED,
            },
            MissionStatus.PENDING_APPROVAL: {
                MissionStatus.APPROVED,
                MissionStatus.REJECTED,
                MissionStatus.CANCELED,
            },
            MissionStatus.APPROVED: {MissionStatus.IN_PROGRESS, MissionStatus.CANCELED},
            MissionStatus.IN_PROGRESS: {MissionStatus.COMPLETED, MissionStatus.CANCELED},
            MissionStatus.REJECTED: set(),
            MissionStatus.COMPLETED: set(),
            MissionStatus.CANCELED: set(),
        }
        if target == current:
            return mission, 200
        if target not in allowed_transitions.get(current, set()):
            return {
                "error": f"Invalid transition from {current.name} to {target.name}"
            }, 400

        mission.status = target

        if target in {MissionStatus.COMPLETED, MissionStatus.CANCELED}:
            cls._close_active_sessions(mission)
        try:
            cls.mission_repository.commit()
            return mission, 200
        except Exception as exc:  # pragma: no cover - defensive fallback
            cls.mission_repository.rollback()
            return {"error": str(exc)}, 500

    @classmethod
    def delete_mission(cls, mission_id):
        mission = cls._get_mission_or_404(mission_id)
        try:
            cls.mission_repository.delete(mission)
            cls.mission_repository.commit()
            return {"message": "Mission deleted successfully"}, 200
        except Exception as exc:  # pragma: no cover - defensive fallback
            cls.mission_repository.rollback()
            return {"error": str(exc)}, 500


__all__ = ["MissionService"]
