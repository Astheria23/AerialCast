# AerialCast

**AerialCast** is a fullstack IoT platform designed for real-time, long-range UAV (drone) telemetry monitoring using LoRa communication.

This system is built on a modern architecture that decouples hardware (GCS), backend services, and a frontend dashboard for comprehensive flight mission planning and management.

---

## ✨ Key Features

* **Real-time Telemetry:** Streams GPS, voltage, and RSSI data from the drone to the GCS (ESP32) via LoRa, which is then relayed to the backend via MQTT.
* **Mission Planning:** Full CRUD (Create, Read, Update, Delete) functionality for planning flight missions, complete with waypoints and notes.
* **Approval Workflow:** Admins must review and approve mission plans submitted by Pilots before they can be executed.
* **Fleet Management:** Admins have exclusive control over the master UAV fleet (CRUD for drones).
* **Time-Series Database:** Utilizes PostgreSQL with the TimescaleDB extension to efficiently store massive volumes of telemetry data.
* **Smart GCS:** The ESP32 firmware features a WiFiManager (for captive portal WiFi setup) and an internal web dashboard (via WebSockets) for on-field logging.

---

## Tech Stack

| Category | Technology |
| :--- | :--- |
| **Frontend** | Next.js (TypeScript) |
| **Backend** | Python (Flask) |
| **Database** | PostgreSQL + TimescaleDB |
| **Real-time (IoT)** | MQTT (EMQX / HiveMQ) |
| **Hardware (GCS)** | ESP32 (C++ / PlatformIO) |
| **Radio Comms** | LoRa (JSON over LoRa) |

---

## 📁 Repository Structure (Monorepo)

This repository uses a **monorepo** structure, separating each application into its own workspace under the `apps/` directory.

```plaintext
/aerialcast-monorepo
├── apps/
│   ├── api/          # Backend (Python Flask + MQTT Listener)
│   ├── gcs/          # GCS Firmware (ESP32 / PlatformIO)
  └── web/          # Frontend Dashboard (Next.js)
---

## 🛠️ Development Checkpoint — December 2025

The current development milestone focuses on mission readiness workflows and replay safety.

- **Dual checklist support** — missions now materialize both pre-flight and post-flight checklists with status tracking, section progress, and pilot notes.
- **Replay gating** — mission telemetry replay stays hidden until the post-flight checklist is completed, preventing premature data review.
- **Pilot-friendly UI** — checklist panels render as tabular forms with modal summaries once a mission moves past the editable window.
- **Schema updates** — latest Alembic migrations create the `mission_postflight_checklists` tables; run `flask db upgrade` after pulling.

### Next Up

- Seed reusable checklist templates for common aircraft profiles.
- Automate session creation from the MQTT listener and auto-close active sessions when missions end.
- Harden telemetry replay with pagination and CSV export.
- Write end-to-end tests that validate the pre/post-flight gating rules.
