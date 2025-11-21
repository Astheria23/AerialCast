import json
import os
import time
import paho.mqtt.client as mqtt
from app import create_app
from app.services.telemetry_service import TelemetryService
from dotenv import load_dotenv

load_dotenv()

MQTT_BROKER = os.getenv('MQTT_BROKER', 'broker.hivemq.com')
MQTT_PORT = int(os.getenv('MQTT_PORT',1883))
MQTT_TOPIC = os.getenv('MQTT_TOPIC','aerial/+/telemetry')

app = create_app()

def on_connect (client, userdata, flags, rc):
    if rc == 0:
        print(f"Connected to MQTT Broker: {MQTT_BROKER}")
        client.subscribe(MQTT_TOPIC)
        print(f"Listening on topic: {MQTT_TOPIC}")
    else:
        print(f"Connection failed with code {rc}")

def on_message (client, userdata, msg):
    try:
        payload_str = msg.payload.decode ('utf-8')
        data = json.loads(payload_str)

        with app.app_context():
            TelemetryService.process_telemetry_data(data)

    except json.JSONDecodeError:
        print("Error : Invalid JSON format")
        
    except Exception as e:
        print(f"Error processing message: {e}")

def run_mqtt_listener():
    client = mqtt.Client()

    username = os.getenv('MQTT_USERNAME')
    password = os.getenv('MQTT_PASSWORD')
    if username and password:   
        client.username_pw_set(username, password)
    
    client.on_connect = on_connect
    client.on_message = on_message 

    print ("Starting MQTT Listener...")

    while True:
        try:
            client.connect(MQTT_BROKER, MQTT_PORT,60)
            client.loop_forever()

        except Exception as e:
            print(f"MQTT connection error: {e}. Retrying in 5 seconds...")
            time.sleep(5)
        
if __name__ == "__main__":
    run_mqtt_listener()