from ..extensions import db
from ..models.execution import FlightSession, TelemetryData
from ..models.master import Drone
from ..models.enums import SessionStatus
from datetime import datetime
from .alert_service import AlertService
class TelemetryService:

    @staticmethod

    def process_telemetry_data(payload):
        lora_id = payload.get('lora_id')

        drone = Drone.query.filter_by(lora_id=lora_id).first()

        if not drone:
            print(f"Drone with {lora_id} cannot be found")
            return False
        
        session = FlightSession.query.filter_by(
            drone_id = drone.drone_id,
            status = SessionStatus.LIVE
        ).first()

        if not session:
            print(f"No LIVE session for drone {lora_id}; telemetry ignored")
            return False
        
        try:
            new_telemetry = TelemetryData()
            new_telemetry.time = datetime.utcnow()
            new_telemetry.session_id = session.session_id
            new_telemetry.latitude = payload.get('lat')
            new_telemetry.longitude = payload.get('lon')
            new_telemetry.altitude = payload.get('alt')
            new_telemetry.battery_voltage = payload.get('vbat')
            new_telemetry.rssi = payload.get('rssi')
            
            db.session.add(new_telemetry)
            db.session.commit()
            print(f"Data saved for session:{session.session_id}")

            AlertService.check_all_alerts(
                session = session,
                lat = payload.get('lat'),
                lon = payload.get('lon'),
                vbat = payload.get('vbat')

            )

            print(f"Alerts checked for session:{session.session_id}")
            return True
        
        except Exception as e:
            print(f"Error saving telemetry: {e}")
            db.session.rollback()
            return False
        
        