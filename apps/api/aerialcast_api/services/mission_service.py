"""Mission domain services."""

from datetime import datetime
from typing import Iterable

from flask_smorest import abort

from ..models.enums import (
    DroneStatus,
    MissionStatus,
    PreflightStatus,
    SessionStatus,
    UserRole,
)
from ..models.execution import FlightSession
from ..models.planning import (
    Mission,
    MissionPreflightChecklist,
    MissionPreflightChecklistItem,
    MissionPostflightChecklist,
    MissionPostflightChecklistItem,
    MissionWaypoint,
)
from ..repositories import (
    ChecklistRepository,
    DroneRepository,
    GeofenceRepository,
    MissionRepository,
    UserRepository,
)


class MissionService:
    mission_repository = MissionRepository
    drone_repository = DroneRepository
    checklist_repository = ChecklistRepository
    geofence_repository = GeofenceRepository
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
            if session.drone:
                session.drone.status = DroneStatus.READY
        return len(live_sessions)

    @classmethod
    def _resolve_checklists(cls, checklist_ids):
        if checklist_ids is not None and not isinstance(checklist_ids, list):
            return {}, {"error": "checklist_ids harus berupa list UUID"}, 400
        checklist_ids = checklist_ids or []
        if len(checklist_ids) != len(set(checklist_ids)):
            return {}, {"error": "Duplikat checklist_ids tidak diperbolehkan"}, 400
        if not checklist_ids:
            return {"preflight": [], "postflight": []}, None, None

        found = list(cls.checklist_repository.find_by_ids(checklist_ids))
        found_ids = {checklist.checklist_id for checklist in found}
        missing = [str(cid) for cid in checklist_ids if cid not in found_ids]
        if missing:
            return {}, {
                "error": "Checklist tidak ditemukan",
                "missing_ids": missing,
            }, 400

        ordered: dict[str, list] = {"preflight": [], "postflight": []}
        invalid: list[str] = []
        lookup = {checklist.checklist_id: checklist for checklist in found}
        for cid in checklist_ids:
            checklist = lookup.get(cid)
            if not checklist:
                continue
            checklist_type = getattr(checklist.type, "name", None)
            if checklist_type == "PRE_FLIGHT":
                ordered["preflight"].append(checklist)
            elif checklist_type == "POST_FLIGHT":
                ordered["postflight"].append(checklist)
            else:
                invalid.append(str(checklist.checklist_id))

        if invalid:
            return {}, {
                "error": "Checklist harus bertipe PRE_FLIGHT atau POST_FLIGHT",
                "invalid_ids": invalid,
            }, 400

        return ordered, None, None

    @classmethod
    def _resolve_geofences(cls, geofence_ids):
        if geofence_ids is not None and not isinstance(geofence_ids, list):
            return [], {"error": "geofence_ids harus berupa list UUID"}, 400
        geofence_ids = geofence_ids or []
        if len(geofence_ids) != len(set(geofence_ids)):
            return [], {"error": "Duplikat geofence_ids tidak diperbolehkan"}, 400
        if not geofence_ids:
            return [], None, None

        found = list(cls.geofence_repository.find_by_ids(geofence_ids))
        found_ids = {geofence.geofence_id for geofence in found}
        missing = [str(gid) for gid in geofence_ids if gid not in found_ids]
        if missing:
            return [], {
                "error": "Geofence tidak ditemukan",
                "missing_ids": missing,
            }, 400
        return found, None, None

    @classmethod
    def _ensure_preflight(cls, mission: Mission) -> MissionPreflightChecklist:
        preflight = mission.preflight_checklist
        if preflight is None:
            preflight = MissionPreflightChecklist()
            mission.preflight_checklist = preflight
        return preflight

    @classmethod
    def _sync_preflight_from_templates(cls, mission: Mission, templates: Iterable) -> None:
        materialized = list(templates)
        preflight = cls._ensure_preflight(mission)
        preflight.items.clear()
        preflight.status = PreflightStatus.NOT_STARTED
        preflight.completed_at = None
        mission.ready_for_flight_at = None
        for section_order, checklist in enumerate(materialized):
            checklist_items = sorted(
                getattr(checklist, "items", []), key=lambda item: item.order or 0
            )
            for item in checklist_items:
                preflight_item = MissionPreflightChecklistItem()
                preflight_item.source_checklist_id = getattr(checklist, "checklist_id", None)
                preflight_item.source_checklist_item_id = getattr(item, "item_id", None)
                preflight_item.section_title = getattr(checklist, "title", None)
                preflight_item.section_order = section_order
                preflight_item.item_text = getattr(item, "item_text", "")
                preflight_item.order = item.order
                preflight.items.append(preflight_item)
        cls._refresh_preflight_auto_state(mission)

    @staticmethod
    def _refresh_preflight_auto_state(mission: Mission) -> None:
        preflight = mission.preflight_checklist
        if not preflight:
            return
        if not preflight.items:
            preflight.status = PreflightStatus.COMPLETED
            if not preflight.completed_at:
                preflight.completed_at = datetime.utcnow()
            if mission.status in {MissionStatus.APPROVED, MissionStatus.READY_FOR_FLIGHT}:
                mission.status = MissionStatus.READY_FOR_FLIGHT
                mission.ready_for_flight_at = datetime.utcnow()
            return

        completed_count = sum(1 for item in preflight.items if item.is_completed)
        total_items = len(preflight.items)
        if completed_count == 0:
            preflight.status = PreflightStatus.NOT_STARTED
            preflight.completed_at = None
            if mission.status == MissionStatus.READY_FOR_FLIGHT:
                mission.status = MissionStatus.APPROVED
                mission.ready_for_flight_at = None
            return

        if completed_count == total_items:
            preflight.status = PreflightStatus.COMPLETED
            if not preflight.completed_at:
                preflight.completed_at = datetime.utcnow()
            if mission.status == MissionStatus.APPROVED:
                mission.status = MissionStatus.READY_FOR_FLIGHT
                mission.ready_for_flight_at = datetime.utcnow()
            elif mission.status == MissionStatus.READY_FOR_FLIGHT:
                mission.ready_for_flight_at = mission.ready_for_flight_at or datetime.utcnow()
        else:
            preflight.status = PreflightStatus.IN_PROGRESS
            preflight.completed_at = None
            if mission.status == MissionStatus.READY_FOR_FLIGHT:
                mission.status = MissionStatus.APPROVED
                mission.ready_for_flight_at = None

    @classmethod
    def _ensure_postflight(cls, mission: Mission) -> MissionPostflightChecklist:
        postflight = mission.postflight_checklist
        if postflight is None:
            postflight = MissionPostflightChecklist()
            mission.postflight_checklist = postflight
        return postflight

    @classmethod
    def _sync_postflight_from_templates(cls, mission: Mission, templates: Iterable) -> None:
        materialized = list(templates)
        postflight = cls._ensure_postflight(mission)
        postflight.items.clear()
        postflight.status = PreflightStatus.NOT_STARTED
        postflight.completed_at = None
        for section_order, checklist in enumerate(materialized):
            checklist_items = sorted(
                getattr(checklist, "items", []), key=lambda item: item.order or 0
            )
            for item in checklist_items:
                postflight_item = MissionPostflightChecklistItem()
                postflight_item.source_checklist_id = getattr(
                    checklist, "checklist_id", None
                )
                postflight_item.source_checklist_item_id = getattr(item, "item_id", None)
                postflight_item.section_title = getattr(checklist, "title", None)
                postflight_item.section_order = section_order
                postflight_item.item_text = getattr(item, "item_text", "")
                postflight_item.order = item.order
                postflight.items.append(postflight_item)
        cls._refresh_postflight_auto_state(mission)

    @staticmethod
    def _refresh_postflight_auto_state(mission: Mission) -> None:
        postflight = mission.postflight_checklist
        if not postflight:
            return
        if not postflight.items:
            postflight.status = PreflightStatus.COMPLETED
            if not postflight.completed_at:
                postflight.completed_at = datetime.utcnow()
            return

        completed_count = sum(1 for item in postflight.items if item.is_completed)
        total_items = len(postflight.items)
        if completed_count == 0:
            postflight.status = PreflightStatus.NOT_STARTED
            postflight.completed_at = None
            return

        if completed_count == total_items:
            postflight.status = PreflightStatus.COMPLETED
            if not postflight.completed_at:
                postflight.completed_at = datetime.utcnow()
        else:
            postflight.status = PreflightStatus.IN_PROGRESS
            postflight.completed_at = None

    @classmethod
    def create_mission(cls, data: dict, user_id):
        creator = cls.user_repository.get(user_id)
        if not creator:
            return {"error": "User not found"}, 404
        drone = cls.drone_repository.get(data["drone_id"])

        if not drone:
            return {"error": "Drone not found"}, 404

        new_mission = Mission()
        new_mission.mission_name = data["mission_name"]
        new_mission.notes = data.get("notes")
        new_mission.approval_notes = data.get("approval_notes")
        new_mission.drone_id = data["drone_id"]
        new_mission.created_by_user_id = user_id
        new_mission.creator = creator
        new_mission.drone = drone

        if data.get("save_as_draft"):
            new_mission.status = MissionStatus.DRAFT
            new_mission.submitted_at = None
        else:
            new_mission.status = MissionStatus.PENDING_APPROVAL
            new_mission.submitted_at = datetime.utcnow()
        new_mission.approved_at = None
        new_mission.ready_for_flight_at = None
        new_mission.rejected_at = None
        new_mission.assigned_pilot_id = user_id
        new_mission.assigned_pilot = creator

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
        cls._sync_preflight_from_templates(new_mission, resolved_checklists.get("preflight", []))
        cls._sync_postflight_from_templates(new_mission, resolved_checklists.get("postflight", []))

        geofence_ids = data.get("geofence_ids", [])
        resolved_geofences, geo_error_payload, geo_error_status = cls._resolve_geofences(geofence_ids)
        if geo_error_payload:
            return geo_error_payload, geo_error_status
        for geofence in resolved_geofences:
            new_mission.active_geofences.append(geofence)

        repo = cls.mission_repository

        try:
            repo.add(new_mission)
            repo.commit()
            return new_mission, 201
        except Exception as exc:  # pragma: no cover - defensive fallback
            repo.rollback()
            return {"error": str(exc)}, 500

    @classmethod
    def get_all_missions(cls, user_id=None):
        if user_id is None:
            return cls.mission_repository.list_all()
        user = cls.user_repository.get(user_id)
        if user is None:
            abort(404, message="User not found")
        if user.role == UserRole.ADMIN:
            return cls.mission_repository.list_all()
        return cls.mission_repository.list_by_creator(user_id)

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
        if "approval_notes" in data:
            mission.approval_notes = data["approval_notes"]
        if "drone_id" in data:
            drone = cls.drone_repository.get(data["drone_id"])
            if not drone:
                return {"error": "Drone not found"}, 404
            mission.drone_id = data["drone_id"]
            mission.drone = drone

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
            if mission.status in {
                MissionStatus.IN_PROGRESS,
                MissionStatus.COMPLETED,
                MissionStatus.CANCELED,
            }:
                return {
                    "error": "Tidak dapat mengubah checklist pada status misi saat ini",
                }, 400
            checklist_ids = data.get("checklist_ids")
            resolved_checklists, error_payload, error_status = cls._resolve_checklists(checklist_ids)
            if error_payload:
                return error_payload, error_status
            cls._sync_preflight_from_templates(mission, resolved_checklists.get("preflight", []))
            cls._sync_postflight_from_templates(mission, resolved_checklists.get("postflight", []))
            preflight = mission.preflight_checklist
            if preflight and preflight.items:
                preflight.status = PreflightStatus.NOT_STARTED
                preflight.completed_at = None
            if mission.status == MissionStatus.READY_FOR_FLIGHT:
                mission.status = MissionStatus.APPROVED
                mission.ready_for_flight_at = None

        if "geofence_ids" in data:
            geofence_ids = data.get("geofence_ids")
            resolved_geofences, geo_error_payload, geo_error_status = cls._resolve_geofences(geofence_ids)
            if geo_error_payload:
                return geo_error_payload, geo_error_status
            mission.active_geofences.clear()
            for geofence in resolved_geofences:
                mission.active_geofences.append(geofence)
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

        if not user:
            return {"error": "User not found"}, 404

        requester_id = str(user_id)
        mission_creator_id = str(mission.created_by_user_id)
        assigned_pilot_id = (
            str(mission.assigned_pilot_id) if mission.assigned_pilot_id else None
        )

        is_admin = user.role == UserRole.ADMIN
        is_creator = mission_creator_id == requester_id
        is_assigned_pilot = assigned_pilot_id == requester_id
        is_allowed_pilot = is_creator or is_assigned_pilot

        admin_only_actions = {"approve", "reject", "cancel"}
        pilot_actions = {"submit", "start", "complete"}

        if action in admin_only_actions and not is_admin:
            return {"error": "Only ADMIN can perform this action"}, 403

        if action in pilot_actions and not (is_allowed_pilot or is_admin):
            return {"error": "Only the mission owner can perform this action"}, 403

        valid_actions = {
            "submit",
            "approve",
            "reject",
            "start",
            "complete",
            "cancel",
        }
        if action not in valid_actions:
            return {"error": "Unknown status action"}, 400

        current = mission.status
        now = datetime.utcnow()

        if action == "submit":
            if current != MissionStatus.DRAFT:
                return {
                    "error": f"Cannot submit mission from status {current.name}"
                }, 400
            mission.status = MissionStatus.PENDING_APPROVAL
            mission.submitted_at = now
            mission.approved_at = None
            mission.rejected_at = None
            mission.ready_for_flight_at = None
        elif action == "approve":
            if current != MissionStatus.PENDING_APPROVAL:
                return {
                    "error": "Mission must be pending approval before it can be approved",
                }, 400
            mission.status = MissionStatus.APPROVED
            mission.approved_at = now
            mission.rejected_at = None
            mission.ready_for_flight_at = None
            cls._ensure_preflight(mission)
            cls._refresh_preflight_auto_state(mission)
        elif action == "reject":
            if current != MissionStatus.PENDING_APPROVAL:
                return {
                    "error": "Mission must be pending approval before it can be rejected",
                }, 400
            mission.status = MissionStatus.REJECTED
            mission.rejected_at = now
            mission.ready_for_flight_at = None
        elif action == "start":
            if current != MissionStatus.READY_FOR_FLIGHT:
                return {
                    "error": "Mission must be READY_FOR_FLIGHT to start",
                }, 400
            preflight = mission.preflight_checklist
            if not preflight or preflight.status != PreflightStatus.COMPLETED:
                return {
                    "error": "Preflight checklist must be completed before starting mission",
                }, 400
            drone = mission.drone
            if not drone:
                return {"error": "Mission does not have an assigned drone"}, 400
            if drone.status != DroneStatus.READY:
                return {
                    "error": "Drone is not READY. Please pick an available drone before starting",
                }, 400
            existing_live = cls.mission_repository.find_live_for_drone(mission.drone_id)
            if existing_live and existing_live.mission_id != mission.mission_id:
                return {
                    "error": "This drone is already flying another mission",
                }, 400
            mission.status = MissionStatus.IN_PROGRESS
            drone.status = DroneStatus.FLYING
            cls._ensure_postflight(mission)
        elif action == "complete":
            if current != MissionStatus.IN_PROGRESS:
                return {
                    "error": "Mission must be in progress before it can be completed",
                }, 400
            mission.status = MissionStatus.COMPLETED
            cls._ensure_postflight(mission)
            cls._refresh_postflight_auto_state(mission)
        elif action == "cancel":
            if current in {MissionStatus.COMPLETED, MissionStatus.CANCELED}:
                return {
                    "error": f"Mission already {current.name.lower()}"
                }, 400
            mission.status = MissionStatus.CANCELED
            mission.ready_for_flight_at = None
        else:  # pragma: no cover - defensive fallback
            return {"error": "Unsupported action"}, 400

        drone = mission.drone
        if mission.status in {MissionStatus.COMPLETED, MissionStatus.CANCELED} and drone:
            drone.status = DroneStatus.READY
        if mission.status == MissionStatus.COMPLETED:
            mission.ready_for_flight_at = mission.ready_for_flight_at or now

        if mission.status in {MissionStatus.COMPLETED, MissionStatus.CANCELED}:
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


class MissionPreflightService:
    mission_repository = MissionRepository
    user_repository = UserRepository

    @staticmethod
    def _can_view(mission: Mission, user) -> bool:
        if not user:
            return False
        if user.role == UserRole.ADMIN:
            return True
        user_id = str(user.user_id)
        if user_id == str(mission.created_by_user_id):
            return True
        assigned = mission.assigned_pilot_id
        return assigned is not None and user_id == str(assigned)

    @classmethod
    def get_preflight(cls, mission_id, user_id):
        mission = MissionService._get_mission_or_404(mission_id)
        user = cls.user_repository.get(user_id)
        if not user:
            abort(404, message="User not found")
        if not cls._can_view(mission, user):
            abort(403, message="Anda tidak memiliki akses ke mission ini")
        return MissionService._ensure_preflight(mission)

    @classmethod
    def update_preflight(cls, mission_id, payload: dict, user_id):
        mission = MissionService._get_mission_or_404(mission_id)
        user = cls.user_repository.get(user_id)
        if not user:
            return {"error": "User not found"}, 404
        if not cls._can_view(mission, user):
            return {
                "error": "Hanya pilot yang ditugaskan atau admin yang dapat memperbarui preflight",
            }, 403
        if mission.status in {
            MissionStatus.REJECTED,
            MissionStatus.CANCELED,
            MissionStatus.COMPLETED,
            MissionStatus.IN_PROGRESS,
        }:
            return {
                "error": "Preflight checklist tidak dapat diperbarui pada status misi saat ini",
            }, 400
        if mission.status not in {MissionStatus.APPROVED, MissionStatus.READY_FOR_FLIGHT}:
            return {
                "error": "Preflight checklist hanya dapat diperbarui setelah misi disetujui",
            }, 400

        preflight = MissionService._ensure_preflight(mission)

        items_payload = payload.get("items", [])
        if items_payload is not None and not isinstance(items_payload, list):
            return {"error": "items harus berupa list"}, 400

        item_map = {
            str(item.preflight_item_id): item for item in getattr(preflight, "items", [])
        }
        missing_ids = []
        seen_updates = set()
        modified = False
        now = datetime.utcnow()

        for entry in items_payload or []:
            item_id = entry.get("preflight_item_id")
            if not item_id:
                return {"error": "Setiap item harus memiliki preflight_item_id"}, 400
            key = str(item_id)
            if key in seen_updates:
                return {"error": "Duplikat preflight_item_id tidak diperbolehkan"}, 400
            seen_updates.add(key)
            item = item_map.get(key)
            if not item:
                missing_ids.append(key)
                continue

            if "note" in entry and entry["note"] != item.note:
                item.note = entry.get("note")
                modified = True

            if "is_completed" in entry:
                desired_state = bool(entry.get("is_completed"))
                if desired_state and not item.is_completed:
                    item.is_completed = True
                    item.completed_at = now
                    item.completed_by_user_id = user.user_id
                    item.completed_by = user
                    modified = True
                elif not desired_state and item.is_completed:
                    item.is_completed = False
                    item.completed_at = None
                    item.completed_by_user_id = None
                    item.completed_by = None
                    modified = True

        if missing_ids:
            return {
                "error": "Beberapa item preflight tidak ditemukan",
                "missing_ids": missing_ids,
            }, 404

        previous_preflight_status = preflight.status
        previous_mission_status = mission.status
        MissionService._refresh_preflight_auto_state(mission)
        if preflight.status != previous_preflight_status or mission.status != previous_mission_status:
            modified = True

        if not modified:
            return preflight, 200

        try:
            cls.mission_repository.commit()
            return preflight, 200
        except Exception as exc:  # pragma: no cover - defensive fallback
            cls.mission_repository.rollback()
            return {"error": str(exc)}, 500


class MissionPostflightService:
    mission_repository = MissionRepository
    user_repository = UserRepository

    @staticmethod
    def _can_view(mission: Mission, user) -> bool:
        return MissionPreflightService._can_view(mission, user)

    @classmethod
    def get_postflight(cls, mission_id, user_id):
        mission = MissionService._get_mission_or_404(mission_id)
        user = cls.user_repository.get(user_id)
        if not user:
            abort(404, message="User not found")
        if not cls._can_view(mission, user):
            abort(403, message="Anda tidak memiliki akses ke mission ini")
        return MissionService._ensure_postflight(mission)

    @classmethod
    def update_postflight(cls, mission_id, payload: dict, user_id):
        mission = MissionService._get_mission_or_404(mission_id)
        user = cls.user_repository.get(user_id)
        if not user:
            return {"error": "User not found"}, 404
        if not cls._can_view(mission, user):
            return {
                "error": "Hanya pilot yang ditugaskan atau admin yang dapat memperbarui postflight",
            }, 403

        if mission.status in {
            MissionStatus.REJECTED,
            MissionStatus.CANCELED,
            MissionStatus.DRAFT,
            MissionStatus.PENDING_APPROVAL,
            MissionStatus.APPROVED,
            MissionStatus.READY_FOR_FLIGHT,
        }:
            return {
                "error": "Postflight checklist hanya dapat diperbarui setelah misi dimulai",
            }, 400

        if mission.status not in {MissionStatus.IN_PROGRESS, MissionStatus.COMPLETED}:
            return {
                "error": "Postflight checklist hanya dapat diperbarui saat atau setelah misi berlangsung",
            }, 400

        postflight = MissionService._ensure_postflight(mission)

        items_payload = payload.get("items", [])
        if items_payload is not None and not isinstance(items_payload, list):
            return {"error": "items harus berupa list"}, 400

        item_map = {
            str(item.postflight_item_id): item
            for item in getattr(postflight, "items", [])
        }
        missing_ids = []
        seen_updates = set()
        modified = False
        now = datetime.utcnow()

        for entry in items_payload or []:
            item_id = entry.get("postflight_item_id") or entry.get("preflight_item_id")
            if not item_id:
                return {"error": "Setiap item harus memiliki postflight_item_id"}, 400
            key = str(item_id)
            if key in seen_updates:
                return {"error": "Duplikat postflight_item_id tidak diperbolehkan"}, 400
            seen_updates.add(key)
            item = item_map.get(key)
            if not item:
                missing_ids.append(key)
                continue

            if "note" in entry and entry["note"] != item.note:
                item.note = entry.get("note")
                modified = True

            if "is_completed" in entry:
                desired_state = bool(entry.get("is_completed"))
                if desired_state and not item.is_completed:
                    item.is_completed = True
                    item.completed_at = now
                    item.completed_by_user_id = user.user_id
                    item.completed_by = user
                    modified = True
                elif not desired_state and item.is_completed:
                    item.is_completed = False
                    item.completed_at = None
                    item.completed_by_user_id = None
                    item.completed_by = None
                    modified = True

        if missing_ids:
            return {
                "error": "Beberapa item postflight tidak ditemukan",
                "missing_ids": missing_ids,
            }, 404

        previous_status = postflight.status
        MissionService._refresh_postflight_auto_state(mission)
        if postflight.status != previous_status:
            modified = True

        if not modified:
            return postflight, 200

        try:
            cls.mission_repository.commit()
            return postflight, 200
        except Exception as exc:  # pragma: no cover - defensive fallback
            cls.mission_repository.rollback()
            return {"error": str(exc)}, 500


__all__ = ["MissionService", "MissionPreflightService", "MissionPostflightService"]
