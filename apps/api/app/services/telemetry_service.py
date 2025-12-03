from ..extensions import db
from ..models.execution import FlightSession, TelemetryData
from ..models.master import Drone
from ..models.enums import SessionStatus
from datetime import datetime
from .flight_session_service import FlightSessionService

class TelemetryService:

    @staticmethod
    def process_telemetry_data(payload):
        """
        Process incoming telemetry payload.

        Strict behavior: a LIVE session must exist or be auto-created based on an APPROVED mission
        for the drone identified by lora_id. If no APPROVED mission is found, telemetry is ignored.

        Expected payload fields:
        - lora_id: str (required)
        - lat: float (required)
        - lon: float (required)
        - alt: float (optional)
        - vbat: float (optional)
        - rssi: int (optional)
        - time: ISO string or epoch (optional; if absent, server time is used)
        """

        lora_id = payload.get('lora_id')
        lat = payload.get('lat')
        lon = payload.get('lon')

        # Basic validation
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
        
        # Try to find an existing LIVE session
        session = FlightSession.query.filter_by(
            drone_id=drone.drone_id,
            status=SessionStatus.LIVE
        ).first()

        # If not found, attempt to auto-create based on APPROVED mission
        if not session:
            session, msg = FlightSessionService.get_active_mission_for_drone(lora_id)
            if not session:
                # Strict mode: do not create ad-hoc sessions when no APPROVED mission exists
                print(f"Telemetry ignored for {lora_id}: {msg}")
                return False

        try:
            new_telemetry = TelemetryData()
            # Use provided time if present, else server time
            provided_time = payload.get('time')
            if provided_time:
                try:
                    # Try to parse ISO8601; fallback to epoch seconds
                    if isinstance(provided_time, str):
                        new_telemetry.time = datetime.fromisoformat(provided_time)
                    else:
                        new_telemetry.time = datetime.utcfromtimestamp(float(provided_time))
                except Exception:
                    new_telemetry.time = datetime.utcnow()
            else:
                new_telemetry.time = datetime.utcnow()

            new_telemetry.session_id = session.session_id
            new_telemetry.latitude = float(lat)
            new_telemetry.longitude = float(lon)
            new_telemetry.altitude = payload.get('alt')
            new_telemetry.battery_voltage = payload.get('vbat')
            new_telemetry.rssi = payload.get('rssi')
            
            db.session.add(new_telemetry)
            db.session.commit()
            print(f"Telemetry saved for session: {session.session_id}")
            return True
        except Exception as e:
            print(f"Error saving telemetry: {e}")
            db.session.rollback()
            return False
        
        