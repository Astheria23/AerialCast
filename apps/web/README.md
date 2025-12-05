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

### Geofence workflow

1. Navigate to **Dashboard → Geofences** (left sidebar or the landing “Manage geofences” quick action).
2. Use **Add geofence** to open the form dialog.
3. Click the map to drop at least three points; reorder automatically follows click order.
4. Choose the type (`SAFE_ZONE` or `NO_FLY_ZONE`) and name the area.
5. Save to persist via `/api/v1/geofences`; polygons render immediately on the map and list.
6. Missions include a banner linking back to geofences so planners can jump between airspace edits and mission authoring.

### Linting & formatting

```bash
pnpm lint
```

## Deployment

Use `pnpm build` to produce an optimized output before deploying via your preferred platform (Vercel, Azure Static Web Apps, etc.). Ensure the backend base URL reflects the deployed API.
