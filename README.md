# AI-Powered Smart Traffic Congestion Predictor

A 22-hour hackathon prototype that predicts **Delhi NCR** traffic congestion
**30–60 minutes ahead**, with a live command-center dashboard, route comparison,
alert center, emergency routing, and an AI chatbot — all running on
**synthetic data, no paid API keys, one-command startup**.

---

## At a glance

| Layer | Tech | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind · Recharts · Leaflet | Dark "command center" UI ported from Claude design |
| Backend | Python 3.11 · FastAPI · psycopg pool · WebSocket | 8 REST endpoints + `/ws/live-updates` |
| ML | scikit-learn · XGBoost classifier (Low / Medium / High / Critical) | 80.8% acc, macro-F1 0.79 on a held-out 20% |
| Data | Supabase Postgres (15 segments, 10,095 readings, 7-day rush patterns) | Plain `lat/lng` + JSONB geometry, no PostGIS |
| Map | Esri World Imagery satellite tiles via Leaflet | Free, no Google Maps |
| Chatbot | Rule-based TrafficBot reading live DB context | No LLM key required |
| Infra | Docker Compose · `docker-compose up --build` | One machine, two containers |

---

## Architecture

```
┌─────────────────────┐    HTTP /api/*       ┌──────────────────────┐
│  Browser            │ ───────────────────▶ │ Next.js BFF          │
│  (Leaflet + Recharts│ ◀─────────────────── │ (app/api/route.ts)   │
│  + Tailwind)        │   WebSocket           └──────────┬───────────┘
└────────┬────────────┘   ws://localhost:8000           │ proxies
         │ ws/live-updates                              ▼
         └────────────────────────────────▶ ┌──────────────────────┐
                                            │ FastAPI backend       │
                                            │ /api/predict, heatmap │
                                            │ /api/stats, routes,   │
                                            │ alerts, emergency,    │
                                            │ chat (stream),        │
                                            │ /ws/live-updates      │
                                            │ XGBoost model         │
                                            └──────────┬───────────┘
                                                       │ psycopg pool
                                                       ▼
                                       ┌───────────────────────────────┐
                                       │ Supabase Postgres             │
                                       │ road_segments (15)            │
                                       │ traffic_readings (~10k)       │
                                       │ predictions, alerts, routes,  │
                                       │ alert_subscriptions           │
                                       └───────────────────────────────┘
```

---

## One-command setup

### 1. Configure environment

```bash
cp .env.example .env
```

Open `.env` and replace `<YOUR-DB-PASSWORD>` with your Supabase password
(**Project Settings → Database → Connection string → Transaction pooler**).
The Supabase project (`traffic-management`, ref `znlxbrhmxdwezcnjkens`,
region `ap-south-1`) is already created and seeded.

### 2. Start everything

```bash
docker-compose up --build
```

- Frontend → http://localhost:3000  → redirects to `/dashboard`
- Backend  → http://localhost:8000  → Swagger at `/docs`

The backend container waits for the DB, optionally re-seeds, optionally
trains the XGBoost model, then starts uvicorn. The frontend container
builds Next.js in standalone mode and serves on port 3000.

### Run locally without Docker

```bash
# backend (terminal 1)
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m ml.train                                     # train the XGBoost model once
uvicorn main:app --reload --port 8000

# frontend (terminal 2)
cd frontend
npm install --legacy-peer-deps
FASTAPI_URL=http://localhost:8000 NEXT_PUBLIC_WS_URL=ws://localhost:8000 npm run dev
```

---

## Repository layout

```
.
├── backend/                FastAPI app
│   ├── main.py             app entrypoint + CORS + lifespan-managed pool
│   ├── config.py           env-driven settings (pydantic-settings)
│   ├── db/                 connection pool, network constants, seed script
│   ├── ml/                 XGBoost training, inference, feature pipeline
│   │   └── artifacts/      saved model + preprocessor bundle (gitignored)
│   ├── models/schemas.py   Pydantic request/response models
│   ├── routers/            health, segments, predict, heatmap, stats,
│   │                       routes, alerts, emergency, chat, simulate,
│   │                       live (WebSocket)
│   ├── services/           predictions, stats, heatmap, alerts, emergency,
│   │                       chatbot, toll_intelligence, live, repo
│   ├── Dockerfile · entrypoint.sh · requirements.txt
│
├── frontend/               Next.js 14 App Router
│   ├── app/
│   │   ├── layout.tsx      shell: TopBar + MapLayer + TrafficBot
│   │   ├── page.tsx        redirect → /dashboard
│   │   ├── dashboard/  routes/  alerts/  emergency/  analytics/
│   │   ├── globals.css     design tokens (ported verbatim from the design)
│   │   └── api/            BFF route handlers (proxy to FastAPI)
│   ├── components/         icons, ui primitives, charts (Recharts),
│   │                       MapLayer, MapSlot, TopBar, TrafficBot, MiniMap
│   ├── lib/                api client, useLive WS hook, types, mock data
│   ├── Dockerfile · next.config.js · tailwind.config.ts
│
├── docker-compose.yml      one-command startup (backend + frontend)
├── .env.example            documented environment variables
└── README.md
```

---

## API surface

| Method · Path | Purpose |
|---|---|
| `GET /api/health`         | DB connectivity + per-table row counts |
| `GET /api/segments`       | List 15 Delhi NCR segments with polylines |
| `POST /api/predict`       | XGBoost 45-min forecast for one segment |
| `GET /api/heatmap`        | GeoJSON FeatureCollection + top-3 high-risk zones |
| `GET /api/stats`          | KPI numbers (efficiency, risk score, vehicle volume…) |
| `GET /api/routes`         | 3 routes (Fastest / Economical / AI), scored `congestion×0.5 + toll×0.3 + eta×0.2` |
| `GET /api/alerts`         | Active alerts, newest first |
| `POST /api/alerts/subscribe` | Mock push subscription → `subscription_id` |
| `POST /api/emergency-route`  | Priority corridor + 7-junction signal pre-emption plan |
| `POST /api/chat`          | Rule-based TrafficBot, **streams** text/plain |
| `POST /api/simulate-rush` | Demo hook: spike MG Road + NH-48 + IFFCO Chowk |
| `WS  /ws/live-updates`    | Pushes congestion deltas every 30 s |

---

## Demo script (5 minutes)

1. **Open** http://localhost:3000 — the satellite map fills the viewport with
   floating panels above. Drag the map. Scroll to zoom. Click the +/gear/−
   controls bottom-left.
2. **Top-right of dashboard** → click **⚡ Simulate Friday Rush**:
   - The orange banner appears.
   - Within seconds the Operational Efficiency drops, Live Vehicle Volume
     jumps, the Congestion Risk gauge spikes, and a new **Critical** alert
     appears in the Warning panel + on the `/alerts` feed.
3. **Click `Routes`** in the top nav. Three route cards render with live
   tolls in ₹, ETAs in minutes, and the **AI Recommended** card shows its
   reasoning chip. Try **Swap** — the request re-fetches against the
   backend.
4. **Click `Alerts`**. The feed auto-refreshes every 6 seconds. Set the
   **Radius** slider, toggle **Enable Push Alerts**, click **Save
   subscription** — a real `sub_…` id is returned.
5. **Click `Emergency`**. Pick `Fire`, change the destination, click
   **Clear Path**. ETA cards refresh (with vs. without clearance) and the
   7-junction Signal Pre-emption list updates.
6. **Click the orange TrafficBot** bottom-right. Ask 5+ questions:
   - "how is NH-48?"
   - "fastest to Saket?"
   - "risk now?"
   - "any active alerts?"
   - "city speed?"

   Each reply **streams token-by-token** and includes real DB context
   (road names, ₹, km/h).

---

## Verification checklist

- [x] `docker-compose up --build` brings both services up green
- [x] Map loads without SSR errors — Leaflet is dynamic-imported, mounted once
- [x] `POST /api/predict` returns in **< 200 ms** for a single segment (XGBoost is small)
- [x] TrafficBot answers 5+ varied queries with real DB context
- [x] Mobile responsive — the multi-zone desktop grid collapses to a single
      stacked column under 1100 px (see `globals.css` @media block)
- [x] No paid API keys — Esri tiles + rule-based chatbot + Supabase free tier
- [x] All UI uses the exact design tokens from the Claude design (`globals.css`
      is the design's `styles.css` ported verbatim)

---

## Notes on data realism

- KPI numbers (`operational_efficiency_pct`, `city_risk_score`,
  `total_vehicles_today`) are computed live from the latest readings + the
  XGBoost model. Efficiency uses a **damped blend** (`45 + 30·speed_ratio +
  25·non_critical_share`, clamped 58–96 %) so it reads as a working command
  centre KPI rather than swinging with the wall clock.
- Rush-hour curves in the seed are **IST-anchored** (UTC + 5:30), so the
  patterns line up with Indian local time.
- The model achieves **80.8 % accuracy / 0.79 macro-F1** on a time-ordered
  held-out 20 % — re-trained with `python -m ml.train`.
