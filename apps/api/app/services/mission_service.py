from ..extensions import db
from ..models.planning import Mission, MissionWaypoint
from ..models.master import Drone
from ..models.enums import MissionStatus
# Removed unused IntegrityError import

class MissionService:

    @staticmethod
    def create_mission(data,user_id):
        drone = Drone.query.get(data['drone_id'])

        if not drone:
            return {"error": "Drone not found"}, 404
        
        new_mission = Mission()
        new_mission.mission_name = data['mission_name']
        new_mission.notes = data.get('notes')
        new_mission.drone_id = data['drone_id']
        new_mission.created_by_user_id = user_id
        new_mission.status = MissionStatus.DRAFT

        waypoints_data = data.get('waypoints', [])
        for wp in waypoints_data:
            new_wp = MissionWaypoint()
            new_wp.latitude = wp['latitude']
            new_wp.longitude = wp['longitude']
            new_wp.altitude = wp.get('altitude', 15.0)
            new_wp.order = wp['order']
            new_mission.waypoints.append(new_wp)

        try:
            db.session.add(new_mission)
            db.session.commit()
            return new_mission, 201
        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 500
        
    @staticmethod
    def get_all_missions():
        return Mission.query.all()
    
    @staticmethod
    def get_mission_by_id(mission_id):
        mission = Mission.query.get_or_404(mission_id)
        return mission
    

    

            
