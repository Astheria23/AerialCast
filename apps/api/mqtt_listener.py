import json
import os
import sys
import time
from pathlib import Path
import paho.mqtt.client as mqtt
from dotenv import load_dotenv

# Ensure the workspace root (where 'app' package lives) is on sys.path
CURRENT_FILE = Path(__file__).resolve()
WORKSPACE_ROOT = CURRENT_FILE.parent  # apps/api directory contains 'app'
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

load_dotenv(dotenv_path=Path(__file__).with_name('.env'))

# Provide a dev fallback for DB URL so the listener can run without manual setup
if not os.getenv('DATABASE_URL') and not os.getenv('SQLALCHEMY_DATABASE_URI'):
    default_sqlite = f"sqlite:///{Path(__file__).parent / 'aerialcast.db'}"
    os.environ['DATABASE_URL'] = default_sqlite
    os.environ['SQLALCHEMY_DATABASE_URI'] = default_sqlite
    print(f"[WARN] DATABASE_URL not set. Using local SQLite DB: {default_sqlite}")

from app import create_app
from app.services.telemetry_service import TelemetryService


MQTT_BROKER = os.getenv('MQTT_BROKER', 'broker.hivemq.com')
MQTT_PORT = int(os.getenv('MQTT_PORT', 1883))
MQTT_TOPIC = os.getenv('MQTT_TOPIC', 'aerialcast/telemetry')

app = create_app()

def on_connect(client, userdata, flags, rc, properties=None):
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
    # Instantiate client compatible with paho-mqtt v2 and v1
    try:
        cbv = getattr(mqtt, 'CallbackAPIVersion', None)
        if cbv is not None:
            client = mqtt.Client(callback_api_version=cbv.VERSION1)
        else:
            client = mqtt.Client()
    except Exception:
        client = mqtt.Client()
    # Enable detailed MQTT client logging for easier debugging
    try:
        client.enable_logger()
    except Exception:
        pass

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
    print(f"Using DB URL: {os.getenv('DATABASE_URL') or os.getenv('SQLALCHEMY_DATABASE_URI')}")
    run_mqtt_listener()