## AerialCast Web

The web console for the AerialCast platform built with Next.js 14, Tailwind CSS, and React Server Components. Pilots and admins can plan missions, manage fleets, log maintenance, and (new!) draw geofences that sync with the Flask API (`apps/api`).

### Tech stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui primitives
- Axios client configured in `src/lib/axios.ts`
- Shared hooks/services per domain (missions, drones, geofences, maintenance, etc.)

## Getting started

### Prerequisites

- Node.js 18+
- pnpm (preferred) – install via `npm i -g pnpm`
- API server running locally (see `../api/README.md`)

### Install dependencies

```bash
pnpm install
```

### Environment variables

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` to the Flask server base (defaults to `http://127.0.0.1:5000/`).

### Run the dev server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) and authenticate via the API.

## Feature tour

| Area | Highlights |
| --- | --- |
| Missions | CRUD with checklist assignment, waypoint map picker, status transitions |
| Drones | Fleet overview and metadata |
| Maintenance | Logbook filtered per drone |
| Checklists | Pre/Post-flight templates |
| **Geofences** | Interactive polygon editor, map overview, type filters |
| **Telemetry (new)** | Mission detail page with live map, vitals, and event feed powered by the telemetry hook |

### Geofence workflow

1. Navigate to **Dashboard → Geofences** (left sidebar or the landing “Manage geofences” quick action).
2. Use **Add geofence** to open the form dialog.
3. Click the map to drop at least three points; reorder automatically follows click order.
4. Choose the type (`SAFE_ZONE` or `NO_FLY_ZONE`) and name the area.
5. Save to persist via `/api/v1/geofences`; polygons render immediately on the map and list.
6. Missions include a banner linking back to geofences so planners can jump between airspace edits and mission authoring.

### Live telemetry preview

1. Approve or start a mission, then click **View details** on any mission card (or navigate directly to `/missions/[missionId]`).
2. The telemetry workspace shows mission metadata plus a Leaflet map, vitals grid, event feed, and sample table, all powered by `useTelemetry`.
3. Use the **Telemetry source** toggle to switch between the live backend replay endpoint and the built-in demo stream. The live option unlocks automatically for `APPROVED`/`IN_PROGRESS` missions and falls back gracefully if no session packets arrive yet.
4. A session badge, connection indicator, and contextual banners surface whether you are looking at real packets or the deterministic rehearsal stream so ops teams can trust what they see.

### Linting & formatting

```bash
pnpm lint
```

## Deployment

Use `pnpm build` to produce an optimized output before deploying via your preferred platform (Vercel, Azure Static Web Apps, etc.). Ensure the backend base URL reflects the deployed API.

### Docker

Build the production image from the repo root:

```bash
docker build -t aerialcast-web ./apps/web
```

Run it while pointing to your API base URL:

```bash
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL="https://api.example.com" \
  aerialcast-web
```

The container exposes port 3000 and serves the prebuilt Next.js app via `next start`.
