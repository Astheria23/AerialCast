# AerialCast API - Backend

Backend service for authentication, drone fleet management, mission planning, and flight execution/logs.

## Overview

The API is a Flask application with JWT authentication and OpenAPI documentation (Swagger UI).
- Base URL: `http://localhost:5000`
- Swagger UI: `http://localhost:5000/docs`
- All non-auth endpoints require a Bearer JWT token.
- Database: PostgreSQL via SQLAlchemy + Flask-Migrate.

## Using the API

1. Register a user, then login to get a JWT access token.
2. Use the token as a `Authorization: Bearer <token>` header for protected endpoints.
3. Manage drones and missions. Mission status changes are performed via dedicated action endpoints.
4. Flight sessions represent drone runs. Sessions can be ended manually; telemetry replay is available per session.

Tips:
- Copy `apps/api/env.example` to `apps/api/.env` and fill in required values (database URL, JWT secret, etc.).
- Check the interactive docs at `/docs` to try endpoints and see schemas.

## Usage Scenarios

### 1. Onboarding & Authentication
Register a user and obtain a JWT:

```zsh
curl -X POST http://localhost:5000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"pilot@example.com","password":"Secret123","full_name":"Test Pilot"}'

curl -X POST http://localhost:5000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"pilot@example.com","password":"Secret123"}'
# => { "access_token": "<JWT>" }
```

Export the token for convenience:

```zsh
export TOKEN="<JWT>"
```

### 2. Create a Drone

```zsh
curl -X POST http://localhost:5000/api/drones/ \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alpha","model":"QuadX","lora_id":"DRONE-001"}'
```

Copy the returned `drone_id`.

### 3. Plan a Mission (Draft)

```zsh
curl -X POST http://localhost:5000/api/missions/ \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "mission_name":"Survey Field A",
    "notes":"Early morning pass",
    "drone_id":"<drone_id>",
    "save_as_draft": true,
    "waypoints": [
      {"latitude":-6.201,"longitude":106.799,"order":1},
      {"latitude":-6.202,"longitude":106.800,"order":2}
    ]
  }'
```

Mission starts as `DRAFT` when `save_as_draft` is true. Ensure waypoint `order` values are unique.

### 4. Submit Mission for Approval

```zsh
curl -X POST http://localhost:5000/api/missions/<mission_id>/status/submit \
  -H "Authorization: Bearer $TOKEN"
```

Status becomes `PENDING_APPROVAL`.

### 5. Approve Mission (ADMIN Only)
Login as an ADMIN user (or have your user role set to ADMIN) and approve:

```zsh
curl -X POST http://localhost:5000/api/missions/<mission_id>/status/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Mission status becomes `APPROVED`.

### 6. Start Execution
Depending on system design, mission may move to `IN_PROGRESS` when a flight session is created (e.g. telemetry listener detects drone start). If you have a service that auto-creates sessions, simply begin sending telemetry or trigger the session creation logic.

You can list sessions:

```zsh
curl -X GET http://localhost:5000/api/sessions/ -H "Authorization: Bearer $TOKEN"
```

### 7. End the Session

```zsh
curl -X POST http://localhost:5000/api/sessions/<session_id>/end \
  -H "Authorization: Bearer $TOKEN"
```

This sets the session status to `COMPLETED` and (if linked) the mission status to `COMPLETED`.

### 8. Telemetry Replay
Heavy operation returning all telemetry points in chronological order:

```zsh
curl -X GET http://localhost:5000/api/sessions/<session_id>/replay \
  -H "Authorization: Bearer $TOKEN"
```

### 9. Update Mission Waypoints (No Status Change)

```zsh
curl -X PUT http://localhost:5000/api/missions/<mission_id> \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"waypoints":[{"latitude":-6.203,"longitude":106.801,"order":1},{"latitude":-6.204,"longitude":106.802,"order":2}]}'
```

Attempting to change `status` here will yield a 400 error—use the status action endpoint instead.

### 10. Cancel a Mission

```zsh
curl -X POST http://localhost:5000/api/missions/<mission_id>/status/cancel \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

After cancellation, no further transitions are allowed.

### Notes on Status Flow
- Creation: `DRAFT` (if `save_as_draft`) else `PENDING_APPROVAL`.
- Actions enforce allowed transitions only; invalid transitions return 400 with an error message.
- Only ADMIN role can perform status actions.

### Common Errors & Fixes
| Error | Cause | Fix |
|-------|-------|-----|
| 400 Duplicate waypoint order | Reused `order` value | Ensure each waypoint has unique `order` within the mission |
| 403 Only ADMIN can change mission status | Non-admin user used status endpoint | Use an ADMIN JWT token |
| 400 Invalid transition | Action not valid for current status | Check current status and allowed next actions |
| 401 Missing JWT | No Authorization header | Add `Authorization: Bearer <token>` |
| 500 DB errors | Bad connection or migration missing | Verify `.env` and run `flask db upgrade` |


## Endpoints

### Auth
- `POST /auth/register`
  - Create a new user. No auth required.
- `POST /auth/login`
  - Login and receive `{ access_token }`. No auth required.

### Drone Fleet
- `GET /api/drones/`
  - List all drones. Public (no JWT).
- `POST /api/drones/`
  - Create a drone. Requires JWT.
- `GET /api/drones/{drone_id}`
  - Get drone details. Public (no JWT).
- `PUT /api/drones/{drone_id}`
  - Update a drone. Requires JWT.
- `DELETE /api/drones/{drone_id}`
  - Delete a drone. Requires JWT. Returns 204 on success.

### Mission Planning
- `GET /api/missions/`
  - List missions. Requires JWT.
- `POST /api/missions/`
  - Create a mission. Requires JWT.
  - Fields include: `mission_name`, `notes` (optional), `drone_id`, `save_as_draft` (bool), `waypoints` (list of `{ latitude, longitude, altitude?, order }`).
  - Waypoint `order` must be unique within a mission.

- `GET /api/missions/{mission_id}`
  - Get mission details. Requires JWT.
- `PUT /api/missions/{mission_id}`
  - Update mission fields (except status). Requires JWT.
  - Status changes are NOT allowed here.
  - Waypoint updates must preserve unique `order` values.

- `DELETE /api/missions/{mission_id}`
  - Delete mission. Requires JWT.
- `POST /api/missions/{mission_id}/status/{action}`
  - Change mission status via action. Requires JWT and ADMIN role.
  - Actions: `submit`, `approve`, `reject`, `start`, `complete`, `cancel`.
  - Enforces valid transitions (e.g., APPROVED -> IN_PROGRESS -> COMPLETED).

### Flight Sessions & Logs
- `GET /api/sessions/`
  - List all sessions (logbook). Requires JWT.
- `GET /api/sessions/{session_id}`
  - Get session details. Requires JWT.
- `GET /api/sessions/{session_id}/replay`
  - Get ALL telemetry data for replay. Requires JWT. Heavy response.
- `POST /api/sessions/{session_id}/end`
  - End a session (set status COMPLETED). Requires JWT. Also marks mission COMPLETED if linked.

Notes:
- Telemetry ingestion and session creation for a drone are handled by backend services and the MQTT listener.

## Requirements
- Python 3.10+
- PostgreSQL 13+ (or compatible)
- Environment variables (see `.env`):
  - `SQLALCHEMY_DATABASE_URI` (e.g., `postgresql+psycopg2://user:pass@localhost:5432/aerialcast`)
  - `JWT_SECRET_KEY`
  - Optional: MQTT settings if you use the listener
- OS packages: `libpq` (for psycopg2) may be required

## Install & Run Locally

1. Create and activate a Python virtual environment (zsh):

```zsh
# from repository root or apps/api directory
python3 -m venv .venv
source .venv/bin/activate
```

2. Install dependencies:

```zsh
# If you're in apps/api
pip install -r requirements.txt
# If running from repository root, use the API requirements file
pip install -r apps/api/requirements.txt
```

3. Environment setup:

```zsh
cp apps/api/env.example apps/api/.env
# Edit apps/api/.env and set SQLALCHEMY_DATABASE_URI, JWT_SECRET_KEY, etc.
```

4. Database migrations:

```zsh
# Ensure you're in apps/api directory for FLASK_APP to resolve
cd apps/api
export FLASK_APP=aerialcast_api:create_app
flask db upgrade
```

5. Start the server:

```zsh
# From apps/api directory (or set FLASK_APP accordingly)
export FLASK_APP=aerialcast_api:create_app
flask run --host=0.0.0.0 --port=5000
# Open http://localhost:5000/docs for Swagger UI
```

### Optional: MQTT Listener

If you ingest telemetry via MQTT:

```zsh
# In apps/api
python -m aerialcast_api.tasks.mqtt_listener
# (Legacy wrapper `python mqtt_listener.py` remains available.)
```

Ensure MQTT connection settings are configured in `.env`.

### Realtime WebSocket API

The backend exposes a Socket.IO server for realtime monitoring. The server shares the HTTP origin (`http://localhost:5000`) and uses namespace `/telemetry`.

**Connecting**
- Endpoint: `ws://localhost:5000/socket.io/?EIO=4&transport=websocket`
- Namespace: `/telemetry`
- Authentication: pass the JWT access token as a query parameter (`token=<JWT>`) or via an `Authorization` header if your Socket.IO client supports it. Connections without a valid access token are rejected during the Socket.IO handshake.
- CORS: defaults to `*`. Override with `SOCKETIO_CORS_ALLOWED_ORIGINS` in config for production.

**Emitted Events**

| Event | Payload | Trigger |
|-------|---------|---------|
| `session_started` | `{ session_id, status, start_time, end_time, drone, mission, pilot }` | New flight session created for telemetry ingestion |
| `session_resumed` | Same payload as `session_started` | Existing `LIVE` session reused when telemetry resumes |
| `session_ended` | Same payload as `session_started` | Session status set to `COMPLETED` (manual end or lifecycle close) |
| `telemetry_update` | `{ time, session_id, drone_id, mission_id, latitude, longitude, altitude, battery_voltage, rssi }` | Every persisted telemetry point |
| `mission_status_changed` | `{ mission_id, mission_name, status, drone_id }` | Mission status transitions (e.g., auto change to `IN_PROGRESS`, completion) |
| `mqtt_status` | `{ event, ... }` where `event` is `connected`, `connection_failed`, `connection_lost`, or `telemetry_error` plus context fields | MQTT listener connection lifecycle and telemetry ingestion failures |

All timestamps are ISO-8601 strings. Identifiers are UUID strings. `telemetry_update` emits after a database commit, guaranteeing data is persisted before clients receive the update.

**Client Example (JavaScript)**

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000/telemetry", {
  query: { token: localStorage.getItem("jwt") },
});

socket.on("session_started", (payload) => {
  console.log("Session started", payload);
});

socket.on("telemetry_update", (point) => {
  updateMap(point.session_id, point.latitude, point.longitude, point.altitude);
});

socket.on("mqtt_status", (status) => {
  showBanner(status.event, status.detail ?? status);
});
```

Ensure clients handle reconnection logic and resubscribe to rooms if you introduce room-based filtering. For production, tighten CORS, enforce JWT validation during the Socket.IO handshake, and consider using Redis as the Socket.IO message broker for horizontal scaling.

## Troubleshooting

- If `flask db upgrade` fails, verify your database URL and that PostgreSQL is running.
- For JWT errors in Swagger, ensure you click "Authorize" and paste `Bearer <token>` (Swagger will prefix automatically when using the security scheme).
- Waypoint order uniqueness violations will return 400; fix the `order` fields.
- Only ADMIN users can perform mission status actions.

---

This API is part of the AerialCast project.
