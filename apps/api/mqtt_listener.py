"""Backward-compatible MQTT listener entrypoint.

Delegates execution to the refactored task module under ``aerialcast_api``.
"""

from aerialcast_api.tasks.mqtt_listener import main


if __name__ == "__main__":
    main()