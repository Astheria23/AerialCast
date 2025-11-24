from ..extensions import db
from ..models.planning import Mission, MissionWaypoint
from ..models.master import Drone
from ..models.enums import MissionStatus, UserRole

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

        if data.get('save_as_draft'):
            new_mission.status = MissionStatus.DRAFT
        else:
            new_mission.status = MissionStatus.PENDING_APPROVAL

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
    def update_mission(mission_id, data, user_id):
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
        # Status changes are no longer handled here; use change_status endpoint
        if 'status' in data:
            return {"error": "Use status action endpoint to change mission status"}, 400

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
    def change_status(mission_id, action, user_id):
        mission = Mission.query.get_or_404(mission_id)
        from ..models.master import User
        user = User.query.get(user_id)

        if not user or user.role != UserRole.ADMIN:
            return {"error": "Only ADMIN can change mission status"}, 403

        action_map = {
            'submit': MissionStatus.PENDING_APPROVAL,
            'approve': MissionStatus.APPROVED,
            'reject': MissionStatus.REJECTED,
            'start': MissionStatus.IN_PROGRESS,
            'complete': MissionStatus.COMPLETED,
            'cancel': MissionStatus.CANCELED,
        }
        if action not in action_map:
            return {"error": "Unknown status action"}, 400

        target = action_map[action]
        current = mission.status
        allowed_transitions = {
            MissionStatus.DRAFT: {MissionStatus.PENDING_APPROVAL, MissionStatus.CANCELED},
            MissionStatus.PENDING_APPROVAL: {MissionStatus.APPROVED, MissionStatus.REJECTED, MissionStatus.CANCELED},
            MissionStatus.APPROVED: {MissionStatus.IN_PROGRESS, MissionStatus.CANCELED},
            MissionStatus.IN_PROGRESS: {MissionStatus.COMPLETED, MissionStatus.CANCELED},
            MissionStatus.REJECTED: set(),
            MissionStatus.COMPLETED: set(),
            MissionStatus.CANCELED: set(),
        }
        if target == current:
            return mission, 200
        if target not in allowed_transitions.get(current, set()):
            return {"error": f"Invalid transition from {current.name} to {target.name}"}, 400

        mission.status = target
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
    

    

            
