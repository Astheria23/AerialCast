"""Telemetry ingestion service."""

from datetime import datetime
from typing import Optional

try:  # pragma: no cover - shapely is an optional runtime dependency in tests
    from shapely.geometry import Point, Polygon
except Exception:  # pragma: no cover - safeguard if shapely missing
    Point = Polygon = None  # type: ignore[assignment]

from ..extensions import db
from ..models.enums import AlertType, DroneStatus, GeofenceType, MissionStatus, SessionStatus
from ..models.execution import FlightSession, TelemetryData
from ..models.master import Drone
from ..repositories import AlertRepository
from .flight_session_service import FlightSessionService


def _coerce_float(value):
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _coerce_int(value):
    if value is None:
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


class TelemetryService:
    """Application service coordinating telemetry ingestion and alerting."""

    LOW_BATTERY_THRESHOLD = 10.8  # volts
    CRITICAL_RSSI_THRESHOLD = -92  # dBm — configurable based on hardware profile
    CRITICAL_SNR_THRESHOLD = 1.5  # dB — very noisy link
    ALERT_SUPPRESSION_SECONDS = {
        AlertType.LOW_BATTERY: 180,
        AlertType.SIGNAL_LOST: 120,
        AlertType.GEOFENCE_BREACH: 300,
    }

    alert_repository = AlertRepository

    @classmethod
    def process_telemetry_data(cls, payload: dict):
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

        if cls._session_should_close(session):
            cls._close_session(session, reason="Mission not active")
            print(
                f"Telemetry ignored for session {session.session_id}: mission {session.mission_id} no longer active"
            )
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
            new_telemetry.altitude = _coerce_float(payload.get("alt"))
            new_telemetry.battery_voltage = _coerce_float(payload.get("vbat"))
            new_telemetry.rssi = _coerce_int(payload.get("rssi"))
            new_telemetry.snr = _coerce_float(payload.get("snr"))

            db.session.add(new_telemetry)
            for alert in cls._evaluate_alerts(session, new_telemetry):
                db.session.add(alert)

            db.session.commit()
            print(f"Telemetry saved for session: {session.session_id}")
            return True
        except Exception as exc:  # pragma: no cover - defensive fallback
            print(f"Error saving telemetry: {exc}")
            db.session.rollback()
            return False

    @staticmethod
    def _session_should_close(session: FlightSession) -> bool:
        if session.status != SessionStatus.LIVE:
            return True
        mission = session.mission
        if mission is None:
            return False
        return mission.status != MissionStatus.IN_PROGRESS

    @staticmethod
    def _close_session(session: FlightSession, reason: Optional[str] = None):
        session.status = SessionStatus.COMPLETED
        session.end_time = datetime.utcnow()
        if session.drone:
            session.drone.status = DroneStatus.READY
        db.session.commit()
        if reason:
            print(f"Session {session.session_id} closed: {reason}")
        else:
            print(f"Session {session.session_id} closed")

    @classmethod
    def _evaluate_alerts(cls, session: FlightSession, telemetry: TelemetryData):
        """Generate alert records for the provided telemetry sample."""

        results = []
        event_time = cls._coerce_event_time(telemetry)

        battery_voltage = telemetry.battery_voltage
        if battery_voltage is not None and battery_voltage <= cls.LOW_BATTERY_THRESHOLD:
            message = f"Battery critically low ({battery_voltage:.2f} V)"
            if cls._should_emit_alert(session.session_id, AlertType.LOW_BATTERY, message, event_time):
                results.append(
                    cls.alert_repository.record(
                        session_id=session.session_id,
                        alert_type=AlertType.LOW_BATTERY,
                        message=message,
                        timestamp=event_time,
                    )
                )

        signal_details = []
        if telemetry.rssi is not None and telemetry.rssi <= cls.CRITICAL_RSSI_THRESHOLD:
            signal_details.append(f"RSSI {telemetry.rssi} dBm")
        if telemetry.snr is not None and telemetry.snr <= cls.CRITICAL_SNR_THRESHOLD:
            signal_details.append(f"SNR {telemetry.snr:.1f} dB")
        if signal_details:
            message = "Signal degradation detected: " + ", ".join(signal_details)
            if cls._should_emit_alert(session.session_id, AlertType.SIGNAL_LOST, message, event_time):
                results.append(
                    cls.alert_repository.record(
                        session_id=session.session_id,
                        alert_type=AlertType.SIGNAL_LOST,
                        message=message,
                        timestamp=event_time,
                    )
                )

        for geofence_message in cls._detect_geofence_breaches(session, telemetry):
            if cls._should_emit_alert(session.session_id, AlertType.GEOFENCE_BREACH, geofence_message, event_time):
                results.append(
                    cls.alert_repository.record(
                        session_id=session.session_id,
                        alert_type=AlertType.GEOFENCE_BREACH,
                        message=geofence_message,
                        timestamp=event_time,
                    )
                )

        return results

    @staticmethod
    def _coerce_event_time(telemetry: TelemetryData) -> datetime:
        candidate = getattr(telemetry, "time", None)
        if candidate is None:
            return datetime.utcnow()
        if isinstance(candidate, datetime):
            return candidate
        return datetime.utcnow()

    @classmethod
    def _should_emit_alert(
        cls,
        session_id,
        alert_type: AlertType,
        message: str,
        event_time: datetime,
    ) -> bool:
        window = cls.ALERT_SUPPRESSION_SECONDS.get(alert_type, 0)
        latest = cls.alert_repository.find_latest_for_session(session_id, alert_type)
        if latest is None:
            return True

        try:
            delta = abs((event_time - latest.timestamp).total_seconds())
        except Exception:  # pragma: no cover - defensive fallback for naive tz math
            delta = 0

        if window and delta < window and (latest.message or "").strip() == message.strip():
            return False
        return True

    @classmethod
    def _detect_geofence_breaches(
        cls,
        session: FlightSession,
        telemetry: TelemetryData,
    ) -> list[str]:
        mission = session.mission
        if mission is None or Point is None or Polygon is None:
            return []

        point = Point(telemetry.longitude, telemetry.latitude)
        breaches: list[str] = []
        for geofence in getattr(mission, "active_geofences", []) or []:
            if getattr(geofence, "type", None) != GeofenceType.NO_FLY_ZONE:
                continue
            raw_points = sorted(getattr(geofence, "points", []) or [], key=lambda entry: getattr(entry, "order", 0) or 0)
            if len(raw_points) < 3:
                continue
            coordinates = [(point_entry.longitude, point_entry.latitude) for point_entry in raw_points]
            polygon = Polygon(coordinates)
            if not polygon.is_valid:
                polygon = polygon.buffer(0)
            if not polygon.is_valid:
                continue
            if polygon.contains(point) or polygon.intersects(point):
                area_name = getattr(geofence, "area_name", "Restricted zone")
                breaches.append(
                    f"Entered restricted geofence '{area_name}' at {telemetry.latitude:.5f}, {telemetry.longitude:.5f}"
                )
        return breaches


__all__ = ["TelemetryService"]
