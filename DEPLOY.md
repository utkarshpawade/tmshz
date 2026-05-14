# Deploying VeloCT

The app is a two-service deploy:

| Service | Where | Why |
| --- | --- | --- |
| `frontend/` (Next.js 14) | **Vercel** | Native Next.js host, free tier is enough |
| `backend/` (FastAPI) | **Render** (or Railway / Fly.io) | Long-running Python, WebSockets, XGBoost model, multi-second LLM + TomTom pipelines |
| Postgres | **Supabase** | Already configured |

Trying to put the FastAPI service on Vercel Python functions doesn't work in
practice — the chat streaming + route-planner pipeline exceed the Hobby plan's
10-second function timeout, and the live-tick WebSocket can't run on stateless
serverless.

---

## 1. Deploy the backend first

Use the existing `backend/Dockerfile`. Render and Railway both auto-detect it.

### Render (recommended — free tier available)

1. Push the `final-fixes` branch (already done).
2. https://dashboard.render.com → **New → Web Service** → connect this repo.
3. Settings:
   - **Root Directory:** `backend`
   - **Environment:** `Docker`
   - **Region:** Singapore or Mumbai (closest to Delhi NCR)
   - **Instance type:** Starter ($7/mo) — the free tier sleeps after 15 min idle which breaks the dashboard's live polling.
4. **Environment variables** (Settings → Environment):
   ```
   DATABASE_URL=postgresql://...                # from Supabase
   SUPABASE_URL=https://<project>.supabase.co
   SUPABASE_ANON_KEY=<anon key>
   GROQ_API_KEY=gsk_...
   GROQ_MODEL=llama-3.3-70b-versatile
   NEXT_PUBLIC_TOMTOM_API_KEY=<tomtom key>      # backend reads either name
   CORS_ORIGINS=https://<your-vercel-domain>.vercel.app,http://localhost:3000
   ```
5. Deploy. You'll get a URL like `https://veloct-api.onrender.com`. Visit
   `/api/health` to confirm it responds.

### Railway alternative

Same idea — point at `backend/`, set the same env vars. Railway tends to be
faster but has no free tier for always-on services.

---

## 2. Deploy the frontend to Vercel

1. https://vercel.com → **Add New → Project** → import this repo.
2. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Next.js (auto-detected)
   - **Build Command:** `npm run build` (default)
   - **Install Command:** `npm install` (default)
3. **Environment Variables** (Settings → Environment Variables):
   ```
   FASTAPI_URL=https://veloct-api.onrender.com      # the Render URL
   NEXT_PUBLIC_TOMTOM_API_KEY=<tomtom key>
   ```
   Don't put `GROQ_API_KEY` here — it stays on the backend so it never
   leaks to the client bundle.
4. Deploy. First build takes ~2 min.

After it's up, go back to Render and update `CORS_ORIGINS` to include the
real Vercel production URL (and any preview URLs you want to allow).

---

## 3. Verify

- Open `https://<your-vercel-domain>.vercel.app/dashboard` — KPIs and the
  congestion-risk gauge should populate from the backend.
- Open `/routes`, type two Delhi NCR places, click **Compare Routes** —
  three TomTom-backed routes should appear with the AI Recommended card
  carrying a Groq-generated reason.
- Click the floating TrafficBot button — Llama 3.3 replies should stream
  in. If you see "I can't reach my live data stream right now," the
  backend URL or CORS is wrong.
- Map: zoom in, click any road — live TomTom flow data should pop up.
  If the "TomTom API key missing" banner appears, `NEXT_PUBLIC_TOMTOM_API_KEY`
  isn't set on Vercel.

---

## Local development

Nothing about local dev changes. From `tmshz/`:

```bash
# backend (one shell)
cd backend && uvicorn main:app --reload --port 8000

# frontend (another shell)
cd frontend && npm run dev
```

The frontend's `next.config.js` reads the project-root `.env` automatically
so you don't have to duplicate keys.

---

## Cost ballpark

- Vercel Hobby: free
- Render Starter: ~$7/mo for an always-on FastAPI
- Supabase: free tier covers the seeded dataset
- TomTom: 2,500 free requests/day (geocode + routing + tile calls all count)
- Groq: free at current limits, no card needed

Total: ~$7/mo to run the demo continuously.
