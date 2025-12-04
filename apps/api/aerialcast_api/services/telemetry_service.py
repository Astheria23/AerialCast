"""Telemetry ingestion service."""

from datetime import datetime

from ..extensions import db
from ..models.enums import SessionStatus
from ..models.execution import FlightSession, TelemetryData
from ..models.master import Drone
from ..sockets import emit_telemetry_update
from .flight_session_service import FlightSessionService


class TelemetryService:
    @staticmethod
    def process_telemetry_data(payload: dict):
        """Process incoming telemetry payload."""

        lora_id = payload.get("lora_id")
        lat = payload.get("lat")
        lon = payload.get("lon")

        if not lora_id:
            print("Telemetry ignored: missing lora_id")
            return False
        if lat is None or lon is None:
            print(f"Telemetry ignored for {lora_id}: missing lat/lon")
            return False

        drone = Drone.query.filter_by(lora_id=lora_id).first()
        if not drone:
            print(f"Telemetry ignored: Drone with lora_id {lora_id} not found")
            return False

        session = FlightSession.query.filter_by(
            drone_id=drone.drone_id, status=SessionStatus.LIVE
        ).first()

        if not session:
            session, msg = FlightSessionService.get_active_mission_for_drone(lora_id)
            if not session:
                print(f"Telemetry ignored for {lora_id}: {msg}")
                return False

        try:
            new_telemetry = TelemetryData()
            provided_time = payload.get("time")
            if provided_time:
                try:
                    if isinstance(provided_time, str):
                        new_telemetry.time = datetime.fromisoformat(provided_time)
                    else:
                        new_telemetry.time = datetime.utcfromtimestamp(float(provided_time))
                except Exception:  # pragma: no cover - fallback to server time
                    new_telemetry.time = datetime.utcnow()
            else:
                new_telemetry.time = datetime.utcnow()

            new_telemetry.session_id = session.session_id
            new_telemetry.latitude = float(lat)
            new_telemetry.longitude = float(lon)
            new_telemetry.altitude = payload.get("alt")
            new_telemetry.battery_voltage = payload.get("vbat")
            new_telemetry.rssi = payload.get("rssi")

            db.session.add(new_telemetry)
            db.session.commit()
            emit_telemetry_update(session, new_telemetry)
            print(f"Telemetry saved for session: {session.session_id}")
            return True
        except Exception as exc:  # pragma: no cover - defensive fallback
            print(f"Error saving telemetry: {exc}")
            db.session.rollback()
            return False


__all__ = ["TelemetryService"]
