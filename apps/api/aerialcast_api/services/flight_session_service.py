"""Flight session management services."""

from datetime import datetime

from ..extensions import db
from ..models.enums import MissionStatus, SessionStatus, UserRole
from ..models.execution import FlightSession, TelemetryData
from ..models.master import Drone, User
from ..models.planning import Mission
from ..sockets import (
    emit_mission_status_changed,
    emit_session_ended,
    emit_session_resumed,
    emit_session_started,
)


class FlightSessionService:
    @staticmethod
    def get_active_mission_for_drone(lora_id):
        drone = Drone.query.filter_by(lora_id=lora_id).first()
        if not drone:
            return None, "Drone not found"

        active_mission = FlightSession.query.filter_by(
            drone_id=drone.drone_id, status=SessionStatus.LIVE
        ).first()

        if active_mission:
            emit_session_resumed(active_mission)
            return active_mission, "Existing session found"

        mission = Mission.query.filter_by(
            drone_id=drone.drone_id, status=MissionStatus.APPROVED
        ).first()

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

        if mission:
            mission.status = MissionStatus.IN_PROGRESS

        try:
            db.session.add(new_session)
            db.session.commit()
            emit_session_started(new_session)
            if mission:
                emit_mission_status_changed(mission)
            return new_session, "New session created"
        except Exception as exc:  # pragma: no cover - defensive fallback
            db.session.rollback()
            return None, str(exc)

    @staticmethod
    def get_all_sessions():
        return FlightSession.query.order_by(FlightSession.start_time.desc()).all()

    @staticmethod
    def get_session_by_id(session_id):
        return FlightSession.query.get_or_404(session_id)

    @staticmethod
    def get_telemetry_replay(session_id):
        """Return telemetry replay for a session."""

        return (
            TelemetryData.query.filter_by(session_id=session_id)
            .order_by(TelemetryData.time.asc())
            .all()
        )

    @staticmethod
    def end_session(session_id):
        """Manually end a LIVE session."""

        session = FlightSession.query.get_or_404(session_id)
        session.status = SessionStatus.COMPLETED
        session.end_time = datetime.utcnow()

        mission = session.mission
        if mission:
            mission.status = MissionStatus.COMPLETED

        db.session.commit()
        emit_session_ended(session)
        if mission:
            emit_mission_status_changed(mission)
        return session


__all__ = ["FlightSessionService"]
