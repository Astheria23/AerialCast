"""MQTT listener task for ingesting telemetry data."""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import paho.mqtt.client as mqtt
from dotenv import load_dotenv

CURRENT_FILE = Path(__file__).resolve()
WORKSPACE_ROOT = CURRENT_FILE.parents[2]

try:  # pragma: no cover - allow running as script without PYTHONPATH tweaks
    from aerialcast_api import create_app
    from aerialcast_api.services.telemetry_service import TelemetryService
except ModuleNotFoundError:  # pragma: no cover - fallback when running directly
    if str(WORKSPACE_ROOT) not in sys.path:
        sys.path.insert(0, str(WORKSPACE_ROOT))
    from aerialcast_api import create_app
    from aerialcast_api.services.telemetry_service import TelemetryService


load_dotenv(dotenv_path=WORKSPACE_ROOT / ".env")

if not os.getenv("DATABASE_URL") and not os.getenv("SQLALCHEMY_DATABASE_URI"):
    default_sqlite = f"sqlite:///{(WORKSPACE_ROOT / 'aerialcast.db').as_posix()}"
    os.environ["DATABASE_URL"] = default_sqlite
    os.environ["SQLALCHEMY_DATABASE_URI"] = default_sqlite
    print(f"[WARN] DATABASE_URL not set. Using local SQLite DB: {default_sqlite}")

MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "aerialcast/telemetry")

app = create_app()


def on_connect(client, userdata, flags, rc, properties=None):  # pragma: no cover
    if rc == 0:
        print(f"Connected to MQTT Broker: {MQTT_BROKER}")
        client.subscribe(MQTT_TOPIC)
        print(f"Listening on topic: {MQTT_TOPIC}")
    else:
        print(f"Connection failed with code {rc}")


def on_message(client, userdata, msg):  # pragma: no cover
    try:
        payload_str = msg.payload.decode("utf-8")
        data = json.loads(payload_str)

        with app.app_context():
            TelemetryService.process_telemetry_data(data)

    except json.JSONDecodeError:
        print("Error: Invalid JSON format")
    except Exception as exc:
        print(f"Error processing message: {exc}")


def run_mqtt_listener():  # pragma: no cover
    try:
        cbv = getattr(mqtt, "CallbackAPIVersion", None)
        if cbv is not None:
            client = mqtt.Client(callback_api_version=cbv.VERSION1)
        else:
            client = mqtt.Client()
    except Exception:
        client = mqtt.Client()

    try:
        client.enable_logger()
    except Exception:
        pass

    username = os.getenv("MQTT_USERNAME")
    password = os.getenv("MQTT_PASSWORD")
    if username and password:
        client.username_pw_set(username, password)

    client.on_connect = on_connect
    client.on_message = on_message

    print("Starting MQTT Listener...")

    while True:
        try:
            client.connect(MQTT_BROKER, MQTT_PORT, 60)
            client.loop_forever()
        except Exception as exc:
            print(f"MQTT connection error: {exc}. Retrying in 5 seconds...")
            time.sleep(5)


def main():  # pragma: no cover
    print(
        "Using DB URL:",
        os.getenv("DATABASE_URL") or os.getenv("SQLALCHEMY_DATABASE_URI"),
    )
    run_mqtt_listener()


if __name__ == "__main__":  # pragma: no cover
    main()


__all__ = ["run_mqtt_listener", "main"]
