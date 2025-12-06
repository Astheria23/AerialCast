"""Flight session management services."""

from datetime import datetime

from ..extensions import db
from ..models.enums import DroneStatus, MissionStatus, SessionStatus, UserRole
from ..models.execution import FlightSession
from ..models.master import Drone, User
from ..models.planning import Mission
from ..repositories import FlightSessionRepository, TelemetryRepository


class FlightSessionService:
    session_repository = FlightSessionRepository
    telemetry_repository = TelemetryRepository
    @staticmethod
    def get_active_mission_for_drone(lora_id):
        drone = Drone.query.filter_by(lora_id=lora_id).first()
        if not drone:
            return None, "Drone not found"

        active_mission = FlightSession.query.filter_by(
            drone_id=drone.drone_id, status=SessionStatus.LIVE
        ).first()

        if active_mission:
            return active_mission, "Existing session found"

        mission = (
            Mission.query.filter(
                Mission.drone_id == drone.drone_id,
                Mission.status == MissionStatus.IN_PROGRESS,
            )
            .order_by(Mission.created_at.desc())
            .first()
        )

        if mission is None:
            return None, "No in-progress mission available for this drone"

        pilot_id = None
        if mission and mission.created_by_user_id:
            pilot_id = mission.created_by_user_id
        else:
            admin = User.query.filter_by(role=UserRole.ADMIN).first()
            if not admin:
                return None, "No ADMIN user found to assign as pilot"
            pilot_id = admin.user_id

        new_session = FlightSession()
        new_session.drone_id = drone.drone_id
        new_session.mission_id = mission.mission_id if mission else None
        new_session.pilot_id = pilot_id
        new_session.status = SessionStatus.LIVE
        new_session.start_time = datetime.utcnow()

        drone.status = DroneStatus.FLYING

        try:
            db.session.add(new_session)
            db.session.commit()
            return new_session, "New session created"
        except Exception as exc:  # pragma: no cover - defensive fallback
            db.session.rollback()
            return None, str(exc)

    @classmethod
    def get_all_sessions(cls):
        return cls.session_repository.list_all()

    @classmethod
    def get_sessions(cls, mission_id=None, statuses=None, limit=None):
        return cls.session_repository.list_filtered(mission_id=mission_id, statuses=statuses, limit=limit)

    @staticmethod
    def get_session_by_id(session_id):
        return FlightSession.query.get_or_404(session_id)

    @classmethod
    def get_telemetry_replay(cls, session_id, since=None, until=None, limit=None, sample_every=None):
        """Return telemetry replay for a session with optional windowing."""

        return cls.telemetry_repository.list_for_session(
            session_id,
            since=since,
            until=until,
            limit=limit,
            sample_every=sample_every,
        )

    @staticmethod
    def end_session(session_id):
        """Manually end a LIVE session."""

        session = FlightSession.query.get_or_404(session_id)
        session.status = SessionStatus.COMPLETED
        session.end_time = datetime.utcnow()
        if session.drone:
            session.drone.status = DroneStatus.READY

        if session.mission:
            session.mission.status = MissionStatus.COMPLETED

        db.session.commit()
        return session


__all__ = ["FlightSessionService"]
