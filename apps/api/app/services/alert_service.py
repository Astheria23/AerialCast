from ..extensions import db
from ..models.execution import Alert
from ..models.enums import AlertType, GeofenceType
from datetime import datetime
from shapely.geometry import Point, Polygon 

class AlertService:
    
    BATTERY_THRESHOLD_LOW = 10.5 

    @staticmethod
    def check_all_alerts(session, lat, lon, vbat):
        """
        Main function invoked by TelemetryService whenever new telemetry arrives.
        """
        if vbat and vbat < AlertService.BATTERY_THRESHOLD_LOW:
            AlertService.create_alert(
                session, 
                AlertType.LOW_BATTERY, 
                f"Battery critical: {vbat}V"
            )

        if session.mission and session.mission.active_geofences:
            AlertService.check_geofences(session, lat, lon)

    @staticmethod
    def check_geofences(session, lat, lon):
        drone_point = Point(lon, lat)

        for geofence in session.mission.active_geofences:
            sorted_points = sorted(geofence.points, key=lambda p: p.order)
            
            poly_coords = [(p.longitude, p.latitude) for p in sorted_points]
            
            polygon = Polygon(poly_coords)

            is_inside = polygon.contains(drone_point)

            if geofence.type == GeofenceType.SAFE_ZONE and not is_inside:
                AlertService.create_alert(
                    session,
                    AlertType.GEOFENCE_BREACH,
                    f"EXITED Safe Zone: {geofence.area_name}"
                )
            
            elif geofence.type == GeofenceType.NO_FLY_ZONE and is_inside:
                AlertService.create_alert(
                    session,
                    AlertType.GEOFENCE_BREACH,
                    f"ENTERED No-Fly Zone: {geofence.area_name}"
                )

    @staticmethod
    def create_alert(session, type, msg):
        last_alert = Alert.query.filter_by(
            session_id=session.session_id, 
            alert_type=type
        ).order_by(Alert.timestamp.desc()).first()

        if last_alert and (datetime.utcnow() - last_alert.timestamp).total_seconds() < 10:
            return 

        new_alert = Alert()
        new_alert.session_id = session.session_id
        new_alert.alert_type = type
        new_alert.message = msg
        new_alert.timestamp = datetime.utcnow()

        try:
            db.session.add(new_alert)
            db.session.commit()
            print(f"ALERT CREATED: {msg}")
        except Exception as e:
            print(f"Error creating alert: {e}")