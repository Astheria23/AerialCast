from ..extensions import db
from ..models.planning import Mission, MissionWaypoint
from ..models.master import Drone
from ..models.enums import MissionStatus

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

        orders = [wp['order'] for wp in waypoints_data if 'order' in wp]
        if len(orders) != len(set(orders)):
            return {"error": "Duplicate waypoint order values are not allowed"}, 400

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

    @staticmethod
    def update_mission(mission_id, data):
        mission = Mission.query.get_or_404(mission_id)

        if 'mission_name' in data:
            mission.mission_name = data['mission_name']
        if 'notes' in data:
            mission.notes = data['notes']
        if 'drone_id' in data:
            drone = Drone.query.get(data['drone_id'])
            if not drone:
                return {"error": "Drone not found"}, 404
            mission.drone_id = data['drone_id']
        if 'status' in data:
            from ..models.enums import MissionStatus
            try:
                mission.status = MissionStatus[data['status']]
            except KeyError:
                return {"error": "Invalid status value"}, 400

        if 'waypoints' in data and isinstance(data['waypoints'], list):
            incoming_wps = data['waypoints']
            orders = [wp['order'] for wp in incoming_wps if 'order' in wp]
            if len(orders) != len(set(orders)):
                return {"error": "Duplicate waypoint order values are not allowed"}, 400
            mission.waypoints.clear()
            for wp in incoming_wps:
                required = {'latitude', 'longitude', 'order'}
                if not required.issubset(wp.keys()):
                    return {"error": "Waypoint missing required fields"}, 400
                new_wp = MissionWaypoint()
                new_wp.latitude = wp['latitude']
                new_wp.longitude = wp['longitude']
                new_wp.altitude = wp.get('altitude', 15.0)
                new_wp.order = wp['order']
                mission.waypoints.append(new_wp)
        try:
            db.session.commit()
            return mission, 200
        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 500

    @staticmethod
    def delete_mission(mission_id):
        mission = Mission.query.get_or_404(mission_id)
        try:
            db.session.delete(mission)
            db.session.commit()
            return {"message": "Mission deleted successfully"}, 200
        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 500
    

    

            
