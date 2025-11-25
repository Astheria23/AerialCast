# AerialCast API

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
export FLASK_APP=app:create_app
flask db upgrade
```

5. Start the server:

```zsh
# From apps/api directory (or set FLASK_APP accordingly)
export FLASK_APP=app:create_app
flask run --host=0.0.0.0 --port=5000
# Open http://localhost:5000/docs for Swagger UI
```

### Optional: MQTT Listener

If you ingest telemetry via MQTT:

```zsh
# In apps/api
python mqtt_listener.py
```

Ensure MQTT connection settings are configured in `.env`.

## Troubleshooting

- If `flask db upgrade` fails, verify your database URL and that PostgreSQL is running.
- For JWT errors in Swagger, ensure you click "Authorize" and paste `Bearer <token>` (Swagger will prefix automatically when using the security scheme).
- Waypoint order uniqueness violations will return 400; fix the `order` fields.
- Only ADMIN users can perform mission status actions.

---

This API is part of the AerialCast project.
