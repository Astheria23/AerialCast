from ..extensions import db
from ..models.master import Drone
from sqlalchemy.exc import IntegrityError

class FleetService:

    @staticmethod
    def create_drone(data):
        if Drone.query.filter_by(lora_id=data['lora_id']).first():
            return {"error": "LoRa ID already registered"}, 409
        
        new_drone = Drone(**data)

        try:
            db.session.add(new_drone)
            db.session.commit()
            return new_drone,201
        
        except Exception as e:
            db.session.rollback()
            return {"error": str(e)},500
        

    @staticmethod
    def get_all_drones():
        return Drone.query.all()
    
    @staticmethod
    def get_drone_by_id(drone_id):
        return Drone.query.get_or_404(drone_id)
    
    @staticmethod
    def update_drone(drone_id, data):
        drone = Drone.query.get_or_404(drone_id)

        for key, value in data.items():
            setattr(drone, key, value)
        
        try:
            db.session.commit()
            return drone, 200
        except Exception as e:
            db.session.rollback()
            return {"error": str(e)},500
        

    @staticmethod 
    def delete_drone(drone_id):
        drone = Drone.query.get_or_404(drone_id)    
        db.session.delete(drone)
        db.session.commit()
        return {"message": "Drone deleted successfully"}, 200