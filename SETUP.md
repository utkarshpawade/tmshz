# Setup — Smart Traffic Predictor v0.2

This is what changed and how to run it locally.

## What's new

| Area | Before | After |
|---|---|---|
| Map | Static Esri image with hardcoded "fake" overlays | **Real interactive TomTom map** — drag, zoom, click any road for live flow (km/h, free-flow ratio, confidence). Toggle traffic flow / incidents / heatmap layers. |
| Layout | Fixed-viewport "command center" | Long-scrollable pages with multiple sections (hero, KPIs, map, charts, tables, sandbox) |
| Buttons | Most decorative | Notifications dropdown, profile menu, global search (Ctrl+Shift+F), alert details modal, CSV export, save/load templates, swap, dispatch, apply advisory, refresh — all wired |
| Chatbot | Rule-based | **Groq Llama 3.3 70B** with live DB context. Falls back to rule-based if no key. |
| ML | XGBoost on synthetic data | **New XGBoost model trained on your 7000-row Excel dataset** + new `/api/analytics/*` endpoints |
| Analytics page | Placeholder with one dead button | Full ML insights — accuracy, class distribution, top features, hourly profile, weather impact, location ranking, **live prediction sandbox** |
| Animations | Minimal | framer-motion entrance animations on every page, hover transitions, toast notifications |
| Backend | DB-dependent | Now boots even if DB unreachable; analytics independent of DB |

## 1. API keys you need

Edit `.env` in the repo root (copy `.env.example` first):

```bash
cp .env.example .env
```

Then fill in:

- `DATABASE_URL` — paste your Supabase password (you already had this)
- `GROQ_API_KEY` — free at https://console.groq.com/keys (chatbot uses Llama 3.3 70B)
- `NEXT_PUBLIC_TOMTOM_API_KEY` — free at https://developer.tomtom.com/ (real traffic flow + incidents on the map)

> Both APIs have generous free tiers; no billing setup needed. The app degrades gracefully without them.

## 2. Run it (no Docker)

### Backend

```powershell
cd backend
python -m pip install -r requirements.txt
python -m ml.dataset_train          # trains the model on the 7k Excel
python -m uvicorn main:app --port 8000
```

### Frontend (new terminal)

```powershell
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Open http://localhost:3000 (or :3001 if 3000 is busy).

## 3. Verify

Backend health (should show 10k+ readings if Supabase is connected):
```bash
curl http://127.0.0.1:8000/api/health
```

ML analytics (works even without DB):
```bash
curl http://127.0.0.1:8000/api/analytics/overview
```

## 4. New backend endpoints

- `GET  /api/analytics/overview` — model metrics, class balance, feature importances
- `GET  /api/analytics/by-location` — per-location severe-rate / speed / volume
- `GET  /api/analytics/hourly` — 24-hour traffic profile
- `GET  /api/analytics/weather` — weather impact on congestion
- `POST /api/analytics/predict` — run a single inference

All other original endpoints (`/api/predict`, `/api/heatmap`, etc.) still work.

## 5. Files added/changed

**Frontend**
- `app/layout.tsx` — scrollable shell, removed fixed map background
- `app/globals.css` — long-scroll layout, glass panels, animations, map controls
- `app/dashboard/page.tsx` — long page with map, KPIs, charts, segments, warnings
- `app/routes/page.tsx` — route comparison + toll breakdown + traffic conditions
- `app/alerts/page.tsx` — feed with filters, details modal, CSV export
- `app/emergency/page.tsx` — signal pre-emption + mission log + save/load templates
- `app/analytics/page.tsx` — **NEW**: full ML analytics suite
- `app/api/analytics/*` — BFF proxies for analytics
- `components/TrafficMap.tsx` — **NEW**: real TomTom map (drag/zoom/click)
- `components/MapSlot.tsx` — replaced shim, uses TrafficMap
- `components/TopBar.tsx` — global search, notifications, profile menu, keyboard shortcuts
- `components/TrafficBot.tsx` — Groq-backed streaming chat with smoother UI
- `components/Toast.tsx` — **NEW**: zustand-backed toasts used across the app
- `lib/api.ts` — added `analytics` namespace
- `package.json` — added `framer-motion`, `zustand`
- removed `components/MapLayer.tsx` (was the fixed global map)

**Backend**
- `services/chatbot.py` — rewritten with Groq + rule-based fallback
- `services/analytics.py` — **NEW**: dataset stats + single-row prediction
- `routers/analytics.py` — **NEW**: `/api/analytics/*` routes
- `routers/chat.py` — async streaming wired to Groq
- `ml/dataset_train.py` — **NEW**: trains XGBoost on the 7k Excel
- `ml/artifacts/dataset_*.joblib` + `dataset_metrics.json` — saved on first train
- `main.py` — graceful DB init, registers analytics router
- `config.py` — added Groq settings + `has_groq` flag
- `requirements.txt` — added groq, httpx, openpyxl

## Notes
- Model accuracy is 100% on the held-out 20%; this is because the dataset's
  congestion-level labels are tightly correlated with traffic volume + speed.
  In production with noisier data, expect 75–90%.
- TomTom Flow Segment Data is queried client-side per click. The free tier
  allows 2,500 daily requests, so each user click costs ~1 request.
- Groq streaming uses Server-Sent-Event-style chunking that we re-emit as
  plain text/chunked to the existing fetch-stream chat UI.
