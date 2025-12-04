curl -X POST http://localhost:5000/auth/login \
socket.on("telemetry_update", (point) => {
socket.emit("join_session", { session_id: currentSessionId });
socket.on("mqtt_status", (status) => {
# AerialCast API

Backend service powering authentication, drone fleet management, mission planning, flight sessions, checklists, alerts, maintenance, and realtime telemetry.

## Quick Start

1. **Create virtualenv** (run inside `apps/api`):
   ```zsh
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. **Install dependencies**:
   ```zsh
   pip install -r requirements.txt
   ```
3. **Configure environment**:
   ```zsh
   cp env.example .env
   # edit .env: SQLALCHEMY_DATABASE_URI, JWT_SECRET_KEY, optional MQTT settings
   ```
4. **Migrate database**:
   ```zsh
   export FLASK_APP=aerialcast_api:create_app
   flask db upgrade
   ```
5. **Run the API**:
   ```zsh
   flask run --host=0.0.0.0 --port=5000
   ```

- Base URL: `http://localhost:5000`
- Interactive docs: `http://localhost:5000/docs`

## Usage Map

```
Auth & Tokens -> Fleet -> Checklist Templates -> Missions -> Flight Sessions -> Alerts -> Maintenance
                                    |
                                    v
                           WebSocket Telemetry (/telemetry)
```

- Every arrow represents the natural data dependency (e.g., missions reference drones and checklists).
- JWTs from the Auth step are required for all secured endpoints.

## Authentication

| Step | Method | Path | Notes |
| --- | --- | --- | --- |
| Register | POST | `/auth/register` | Creates a PILOT by default; send `role="ADMIN"` when seeding admin. |
| Login | POST | `/auth/login` | Returns `{ "access_token": "..." }`; store as bearer token. |

Use `Authorization: Bearer <token>` on every subsequent request (Swagger will handle this if you Authorize once).

## Core Workflow

| Order | Purpose | Method & Path | Key Response Fields |
| --- | --- | --- | --- |
| 1 | Register drone | `POST /api/v1/drones/` | `drone_id`, `lora_id` |
| 2 | Create checklist templates | `POST /api/v1/checklists/` | `checklist_id` |
| 3 | Compose mission | `POST /api/v1/missions/` | `mission_id`, status starts `DRAFT` or `PENDING_APPROVAL` |
| 4 | Mission status actions (ADMIN) | `POST /api/v1/missions/{id}/status/{action}` | Transitions: `submit`, `approve`, `start`, `complete`, `cancel`, `reject` |
| 5 | Monitor flight sessions | `GET /api/v1/sessions/` | Lists active and historical sessions |
| 6 | Replay telemetry | `GET /api/v1/sessions/{id}/replay` | Chronological telemetry points |
| 7 | Review alerts | `GET /api/v1/alerts/` or `GET /api/v1/alerts/session/{id}` | Ordered newest to oldest |
| 8 | Log maintenance | `POST /api/v1/drones/{drone_id}/maintenance` | `log_id`, `log_date`, `notes` |

### Supporting Operations

- `GET /api/v1/drones/`, `GET /api/v1/drones/{drone_id}`, `PUT`, `DELETE` for lifecycle management.
- `GET /api/v1/checklists/{checklist_id}`, `PUT`, `DELETE` to update or remove templates.
- `GET /api/v1/missions/`, `GET /api/v1/missions/{mission_id}`, `PUT`, `DELETE` for mission review.
- `POST /api/v1/sessions/{session_id}/end` to close a session manually (also completes the mission if linked).
- `GET /api/v1/maintenance/{log_id}`, `PUT`, `DELETE` for maintenance adjustments.

## WebSocket Telemetry (Socket.IO)

- Endpoint: `ws://localhost:5000/socket.io/?EIO=4&transport=websocket`
- Namespace: `/telemetry`
- Auth: supply the JWT as `token=<JWT>` query parameter.
- Join a session room after connect: `42["join_session", {"session_id":"<uuid>"}]`
- Leave: `42["leave_session", {"session_id":"<uuid>"}]`
- Broadcast events: `session_started`, `session_resumed`, `session_ended`, `telemetry_update`, `mission_status_changed`, `mqtt_status`, acknowledgements `joined_session` / `left_session`.
- Telemetry throttled to ~5 Hz per session to keep dashboards responsive.

## Postman Assets

- Import `postman/AerialCast.postman_environment.json` and `postman/AerialCast.postman_collection.json`.
- Run Auth folder first to populate tokens, then follow collection order (Fleet → Checklists → Missions → Sessions → Alerts → Maintenance → WebSocket instructions).

## Troubleshooting

- `flask db upgrade` failures usually indicate a bad database URL or missing PostgreSQL instance.
- 401 responses mean the bearer token is missing or expired.
- 403 on mission status actions means the token lacks ADMIN role.
- 400 with "Duplicate waypoint order" requires unique `order` values within the mission payload.
- Re-run `flask db downgrade` + `flask db upgrade` if schema drift occurs during development.
