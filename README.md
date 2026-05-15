# VeloCT — AI-Powered Smart Traffic Congestion Predictor

> A Delhi NCR traffic command center that forecasts congestion **30–60 minutes ahead**, compares routes with live toll/ETA/traffic scoring, runs emergency priority corridors, and exposes the full ML pipeline behind an analytics dashboard and a streaming LLM chatbot.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://www.python.org/)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.1-EB6E1F)](https://xgboost.ai/)
[![PostgreSQL](https://img.shields.io/badge/Postgres-Supabase-336791?logo=postgresql)](https://supabase.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-Unlicensed-lightgrey)](#license--credits)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Data Flow Diagram](#data-flow-diagram)
- [UML Class Diagram](#uml-class-diagram)
- [Component Diagram](#component-diagram)
- [ML Pipeline Flow](#ml-pipeline-flow)
- [ER Diagram](#er-diagram)
- [Deployment Architecture](#deployment-architecture)
- [API Reference](#api-reference)
- [Frontend Routes](#frontend-routes)
- [Project Structure](#project-structure)
- [Local Development Setup](#local-development-setup)
- [Docker / Production Deployment](#docker--production-deployment)
- [Environment Variables](#environment-variables)
- [ML Model Details](#ml-model-details)
- [Testing](#testing)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License & Credits](#license--credits)

---

## Overview

**VeloCT** is an end-to-end smart-traffic system built to predict urban congestion **30–60 minutes in advance**, identify high-risk zones, recommend alternative routes (including NHAI-style **toll intelligence**), grant priority corridors to emergency vehicles, and surface everything through a live operator dashboard and a conversational chatbot.

The system addresses three failure modes of conventional traffic management:

1. **Reactive monitoring.** Existing dashboards report what *is* happening; VeloCT's XGBoost model produces a 45-minute-ahead forecast (`forecast_minutes=45`) so dispatchers can act *before* the spike — see [backend/ml/feature_pipeline.py](backend/ml/feature_pipeline.py).
2. **Single-criterion routing.** Most navigation apps optimize purely for ETA. VeloCT scores three lanes (Fastest / Economical / AI Recommended) with **`congestion × 0.5 + toll × 0.3 + eta × 0.2`** ([backend/services/routing.py](backend/services/routing.py)) and lets a Groq-backed LLM justify the AI pick in natural language.
3. **Silo'd emergency dispatch.** Ambulance/fire/police runs share the same congested grid as commuters. VeloCT computes a priority corridor with a cascading 7-junction signal pre-emption plan ([backend/services/emergency.py](backend/services/emergency.py)).

**Target users:** city traffic-control operators, smart-city pilot programs, dispatch / EMS coordinators, and analysts evaluating ML-driven mobility tooling.

---

## Key Features

### Frontend (Next.js 14 App Router)

- **Live command-center dashboard** with KPI tiles, congestion-risk gauge, multi-zone heatmap and Recharts time-series ([frontend/app/dashboard/page.tsx](frontend/app/dashboard/page.tsx)).
- **Interactive TomTom + Leaflet map** — drag/zoom, click any road for live flow segment data ([frontend/components/TrafficMap.tsx](frontend/components/TrafficMap.tsx)).
- **Route comparison** UI with three lanes, toll-plaza breakdown, fuel cost and an AI-Recommended card with reason chip ([frontend/app/routes/page.tsx](frontend/app/routes/page.tsx)).
- **Alert feed** with severity filter, push-subscription, CSV export and detail modal ([frontend/app/alerts/page.tsx](frontend/app/alerts/page.tsx)).
- **Emergency dispatch** — vehicle type, origin/destination, cascading junction plan, save/load templates ([frontend/app/emergency/page.tsx](frontend/app/emergency/page.tsx)).
- **ML analytics page** — accuracy, class distribution, top features, hourly profile, weather impact, location ranking, live prediction sandbox ([frontend/app/analytics/page.tsx](frontend/app/analytics/page.tsx)).
- **Streaming chatbot** (TrafficBot) — Groq Llama 3.3 70B with live DB context, rule-based fallback ([frontend/components/TrafficBot.tsx](frontend/components/TrafficBot.tsx)).
- **WebSocket-driven live tick** every 30 s ([frontend/lib/useLive.ts](frontend/lib/useLive.ts)).
- **Mobile shell** swap under 768 px ([frontend/components/MobileShell.tsx](frontend/components/MobileShell.tsx)).

### Backend (FastAPI)

- **17 REST endpoints + 1 WebSocket** across health, segments, predict, heatmap, stats, routes, alerts, emergency, chat, simulate, analytics ([backend/main.py](backend/main.py)).
- **Graceful DB-degraded mode** — the app boots even if Supabase is unreachable; analytics endpoints remain functional ([backend/main.py:34-44](backend/main.py#L34-L44)).
- **Live TomTom routing pipeline** — geocode → 3 routeType variants with `traffic=true` → toll heuristic → Groq AI pick ([backend/services/routing.py](backend/services/routing.py)).
- **Static-template fallback** when TomTom is unconfigured so the demo never breaks ([backend/services/toll_intelligence.py](backend/services/toll_intelligence.py)).
- **Best-effort prediction logging** to the `predictions` table — non-blocking on failure ([backend/services/predictions.py:38-57](backend/services/predictions.py#L38-L57)).
- **Friday-rush simulation hook** spikes MG Road / NH-48 / IFFCO Chowk in one cycle ([backend/routers/simulate.py](backend/routers/simulate.py)).

### ML

- **Two trained XGBoost classifiers** persisted to [backend/ml/artifacts/](backend/ml/artifacts/):
  - `xgb_model.joblib` — segment-level 45-min-ahead forecast trained on 7 days of synthetic Delhi NCR readings ([backend/ml/train.py](backend/ml/train.py)).
  - `dataset_model.joblib` — multi-location classifier trained on the 7000-row Excel dataset ([backend/ml/dataset_train.py](backend/ml/dataset_train.py)).
- **Class-balanced training** via inverse-frequency sample weights for both models.
- **Time-ordered hold-out** for the segment model (no look-ahead leakage); stratified split for the dataset model.
- **Cached inference** with `@lru_cache` model loading and a hot-reloading metrics file ([backend/services/analytics.py:35-51](backend/services/analytics.py#L35-L51)).

---

## Tech Stack

| Layer       | Technology                                  | Version           | Purpose                                                            |
| ----------- | ------------------------------------------- | ----------------- | ------------------------------------------------------------------ |
| Frontend    | [Next.js](https://nextjs.org/) (App Router) | 14.2.18           | SSR + BFF route handlers, file-based routing                       |
| Frontend    | React                                       | 18.3.1            | UI runtime                                                         |
| Frontend    | TypeScript                                  | 5.6.3             | Type safety                                                        |
| Frontend    | Tailwind CSS                                | 3.4.15            | Utility-first styling on top of bespoke design tokens              |
| Frontend    | Recharts                                    | 2.13.3            | Time-series, gauges, sparklines                                    |
| Frontend    | Leaflet                                     | 1.9.4             | Map tiles + polyline rendering                                     |
| Frontend    | Framer Motion                               | 11.11.17          | Page transitions, hover states                                     |
| Frontend    | Zustand                                     | 5.0.1             | Toast notification store                                           |
| Backend     | FastAPI                                     | 0.115.5           | Async REST + WebSocket framework                                   |
| Backend     | Uvicorn (standard)                          | 0.32.1            | ASGI server                                                        |
| Backend     | psycopg \[binary, pool\]                    | 3.2.3             | Postgres driver + connection pool                                  |
| Backend     | pydantic / pydantic-settings                | 2.10.3 / 2.6.1    | Schemas + env-driven config                                        |
| Backend     | httpx                                       | 0.28.1            | Async HTTP client for TomTom + Groq                                |
| ML          | XGBoost                                     | 2.1.3             | Multiclass congestion classifier (`multi:softprob`)                |
| ML          | scikit-learn                                | 1.5.2             | Train/test split, metrics, sample weighting                        |
| ML          | pandas / numpy                              | 2.2.3 / 2.1.3     | Feature engineering, frame assembly                                |
| ML          | joblib                                      | 1.4.2             | Model + preprocessor artifact serialization                        |
| ML          | openpyxl                                    | 3.1.5             | Reading `TrafficCongestion_MultiLocation_7000Rows.xlsx`            |
| Data        | Supabase Postgres                           | 15.x              | Persistent store (segments, readings, alerts, subs, predictions)   |
| LLM         | Groq Llama 3.3                              | 70B Versatile     | Streaming chatbot + AI route pick (optional)                       |
| Map data    | TomTom Search & Routing API                 | v2 / v1           | Geocoding, real routes, live flow segment data (optional)          |
| Map tiles   | Esri World Imagery / TomTom raster          | —                 | Satellite + traffic-flow tiles                                     |
| Infra       | Docker + docker-compose                     | —                 | Two-container local dev (frontend + backend)                       |
| Infra       | Render / Vercel                             | —                 | Recommended production split (see [DEPLOY.md](DEPLOY.md))          |

---

## System Architecture

VeloCT is a two-process system with a hosted Postgres tier. The Next.js BFF (Backend-For-Frontend) is the only path between the browser and FastAPI for HTTP traffic — the WebSocket is opened directly from the browser to the backend.

```mermaid
graph TB
    subgraph Client["Client (Browser)"]
        UI["Next.js pages<br/>(dashboard / routes / alerts /<br/>emergency / analytics)"]
        WS_CLI["useLive WS hook"]
        BOT["TrafficBot widget"]
        MAP["Leaflet + TomTom tiles<br/>(TrafficMap.tsx)"]
    end

    subgraph Vercel["Next.js Server (Vercel / Node)"]
        BFF["app/api/**/route.ts<br/>BFF proxies via lib/proxy.ts"]
    end

    subgraph Render["FastAPI Server (Render / Docker)"]
        APP["main.py<br/>FastAPI app + CORS + lifespan pool"]
        ROUTERS["routers/<br/>health · segments · predict · heatmap ·<br/>stats · routes · alerts · emergency ·<br/>chat · simulate · analytics · live (WS)"]
        SVC["services/<br/>predictions · routing · toll_intelligence ·<br/>heatmap · stats · alerts · emergency ·<br/>chatbot · analytics · live · repo"]
        ML["ml/<br/>feature_pipeline · inference · train ·<br/>dataset_train<br/>+ artifacts/*.joblib"]
    end

    subgraph External["External Services"]
        DB[("Supabase Postgres<br/>(ap-south-1)")]
        GROQ["Groq API<br/>Llama 3.3 70B"]
        TOMTOM["TomTom Search +<br/>Routing API"]
    end

    UI -->|fetch /api/*| BFF
    BFF -->|HTTPS| ROUTERS
    WS_CLI -->|ws://.../ws/live-updates| ROUTERS
    BOT -->|POST /api/chat<br/>streamed| BFF
    MAP -->|tile + flow lookups| TOMTOM

    ROUTERS --> SVC
    SVC --> ML
    SVC -->|psycopg pool| DB
    SVC -->|httpx| GROQ
    SVC -->|httpx| TOMTOM
    ML --> ARTIFACTS[["xgb_model.joblib<br/>dataset_model.joblib<br/>preprocessor.joblib<br/>dataset_metrics.json"]]
```

> The legacy architecture poster shipped with the repo is reproduced at [ARCHITECTURE.png](ARCHITECTURE.png) — the Mermaid diagram above is the authoritative reference and reflects the current code paths.

---

## Data Flow Diagram

A typical user-facing prediction request crosses the browser → BFF → FastAPI → service layer → ML inference → Postgres logging → response back to the UI:

```mermaid
sequenceDiagram
    autonumber
    actor User as Operator
    participant FE as Next.js Page<br/>(dashboard)
    participant BFF as app/api/predict<br/>(BFF proxy)
    participant API as FastAPI<br/>/api/predict
    participant PSVC as services.predictions
    participant REPO as services.repo
    participant DB as Supabase Postgres
    participant FP as ml.feature_pipeline
    participant INF as ml.inference

    User->>FE: Open /dashboard
    FE->>BFF: POST /api/predict { segment_id }
    BFF->>API: POST /api/predict
    API->>PSVC: predict_for_segment(segment_id)
    PSVC->>REPO: get_segment(id)
    REPO->>DB: SELECT * FROM road_segments
    DB-->>REPO: segment row
    PSVC->>REPO: get_recent_readings(id, ROLL_WINDOW+2)
    REPO->>DB: SELECT * FROM traffic_readings
    DB-->>REPO: 6 latest readings
    PSVC->>FP: assemble_live_features(rows, seg)
    FP-->>PSVC: feature dict (24 cols)
    PSVC->>INF: predict(features)
    INF-->>PSVC: { label, confidence, probabilities, risk_score }
    PSVC-->>API: PredictResponse
    API-->>BFF: 200 JSON
    BFF-->>FE: passes through JSON body
    FE-->>User: KPI tiles + gauge update
```

For the live tick, the browser opens a WebSocket directly to FastAPI and receives a `congestion_update` payload every `LIVE_UPDATE_INTERVAL` seconds ([backend/routers/live.py](backend/routers/live.py)).

---

## UML Class Diagram

The backend's service layer cleanly separates request schemas (Pydantic), thin routers, and domain services. The ML side is functional — a single `predict()` plus a feature-assembly module backed by joblib-persisted artifacts.

```mermaid
classDiagram
    class PredictRequest {
        +int segment_id
        +Optional~bool~ rain_flag
        +Optional~bool~ fog_flag
        +Optional~bool~ event_nearby
        +Optional~bool~ accident_nearby
        +Optional~datetime~ at
    }
    class PredictResponse {
        +int segment_id
        +str segment_name
        +CongestionLabel congestion_label
        +float confidence
        +Probabilities probabilities
        +float risk_score
        +int forecast_minutes
    }
    class Probabilities {
        +float Low
        +float Medium
        +float High
        +float Critical
    }
    class RoadSegment {
        +int id
        +str name
        +str code
        +str segment_type
        +float length_km
        +int lanes
        +int speed_limit_kmh
        +list~list~float~~ geometry
    }
    class StatsResponse {
        +float avg_speed_kmh
        +int active_incidents
        +int alert_count
        +float operational_efficiency_pct
        +int monitored_segments
        +int sensors_offline
        +int total_vehicles_today
        +float city_risk_score
    }
    class RouteOption {
        +str id
        +str title
        +RouteType route_type
        +str via
        +int eta_minutes
        +float toll_inr
        +float fuel_inr
        +float distance_km
        +list~TollPlaza~ toll_plazas
        +Optional~str~ reason
        +Optional~float~ score
    }
    class TollPlaza {
        +str name
        +str segment
        +float cost
    }

    class PredictionsService {
        <<service>>
        +predict_for_segment(segment_id, overrides, at, store) PredictResponse
        +predict_all_segments(store) list~PredictResponse~
        -_store(segment_id, result, anchor_ts)
    }
    class RoutingService {
        <<service>>
        +compare_routes_live(origin, destination) RoutesResponse
        -_geocode(query, client) tuple~float, float~
        -_tomtom_route(start, end, route_type, extra, client) dict
        -_ai_pick(origin, destination, routes) tuple~int, str~
    }
    class TollIntelligenceService {
        <<service>>
        +compare_routes(origin, destination) RoutesResponse
        -_city_congestion_factor() float
        -_route_toll(template) tuple~float, list~
    }
    class StatsService {
        <<service>>
        +get_stats() StatsResponse
        -_operational_efficiency(speed_ratio, non_critical_share) float
    }
    class HeatmapService {
        <<service>>
        +build_heatmap() FeatureCollection
    }
    class ChatbotService {
        <<service>>
        +stream_reply(message, history) AsyncIterator~str~
        -_build_context() dict
        -_rule_based_reply(message, ctx) str
    }
    class EmergencyService {
        <<service>>
        +build_emergency_route(vehicle_type, origin, destination) EmergencyResponse
    }
    class AlertsService {
        <<service>>
        +list_alerts(severity, limit) list~Alert~
        +create_subscription(payload) SubscribeResponse
    }
    class LiveService {
        <<service>>
        +build_live_tick() dict
        +trigger_friday_rush() void
    }
    class AnalyticsService {
        <<service>>
        +overview() dict
        +by_location() list~dict~
        +hourly_profile() list~dict~
        +weather_impact() list~dict~
        +predict_single(payload) dict
    }
    class Repo {
        <<service>>
        +get_all_segments() list~RoadSegment~
        +get_segment(id) RoadSegment
        +get_recent_readings(segment_id, limit) list
        +get_latest_readings_all() dict
    }

    class FeaturePipeline {
        <<module>>
        +FEATURE_COLUMNS list~str~
        +LABELS list~str~
        +RISK_WEIGHTS ndarray
        +engineer_features(df) DataFrame
        +build_training_frame(df) tuple~DataFrame, Series~
        +assemble_live_features(rows, meta, overrides, at) dict
    }
    class Inference {
        <<module>>
        +predict(features) dict
        +model_ready() bool
        +model_metrics() dict
        +reset_cache() void
    }
    class XGBClassifier {
        <<artifact: xgb_model.joblib>>
        +predict_proba(X) ndarray
    }

    PredictRequest --> PredictResponse : produces
    PredictResponse o-- Probabilities
    PredictionsService --> Repo : uses
    PredictionsService --> FeaturePipeline : uses
    PredictionsService --> Inference : uses
    Inference --> XGBClassifier : loads via joblib
    HeatmapService --> PredictionsService : uses
    StatsService --> PredictionsService : uses
    RoutingService --> TollIntelligenceService : falls back to
    ChatbotService --> Repo : uses
    AnalyticsService --> XGBClassifier : separate artifact (dataset_model)
    RouteOption o-- TollPlaza
```

---

## Component Diagram

The frontend follows the Next.js App Router convention: server components (page roots) fetch via the BFF, then mount client components for interactivity. The `AppShell` picks between desktop and mobile layouts at runtime.

```mermaid
graph TB
    subgraph Pages["Pages (app/*)"]
        P_DASH["dashboard/page.tsx"]
        P_ROUTES["routes/page.tsx"]
        P_ALERTS["alerts/page.tsx"]
        P_EMER["emergency/page.tsx"]
        P_ANAL["analytics/page.tsx"]
        P_HOME["page.tsx<br/>(redirect → /dashboard)"]
    end

    subgraph Shell["Shell (layout.tsx)"]
        SHELL["AppShell"]
        TOPBAR["TopBar<br/>(global search, notifications)"]
        MOBILE["MobileShell"]
        BOT["TrafficBot<br/>(floating chat widget)"]
        TOAST["ToastHost (zustand)"]
    end

    subgraph Components["Shared Components"]
        MAP_SLOT["MapSlot → CityMap"]
        TRAFFIC_MAP["TrafficMap.tsx<br/>(Leaflet + TomTom)"]
        MINI_MAP["MiniMap.tsx"]
        CHARTS["charts.tsx<br/>ForecastChart · Gauge ·<br/>Sparkline · StreamChart"]
        KPI["KpiHeatmap.tsx"]
        UI["ui.tsx<br/>Card · StatusBadge · CountBadge"]
        ICONS["icons.tsx"]
    end

    subgraph Lib["lib/"]
        API_CLI["api.ts<br/>(browser → BFF)"]
        PROXY["proxy.ts<br/>(server → FastAPI)"]
        USELIVE["useLive.ts<br/>(WebSocket hook)"]
        USEMOBILE["useMobile.ts"]
        TYPES["types.ts"]
        DATA["data.ts<br/>(static fallbacks)"]
    end

    subgraph BFF_Routes["BFF Routes (app/api/**)"]
        BFF_STATS["stats/route.ts"]
        BFF_HEAT["heatmap/route.ts"]
        BFF_PRED["predict/route.ts"]
        BFF_ROUT["routes/route.ts"]
        BFF_ALERT["alerts/route.ts"]
        BFF_SUB["alerts/subscribe/route.ts"]
        BFF_EMER["emergency-route/route.ts"]
        BFF_CHAT["chat/route.ts (streaming)"]
        BFF_SIM["simulate-rush/route.ts"]
        BFF_ANAL["analytics/**/route.ts"]
        BFF_HEALTH["health/route.ts"]
        BFF_SEG["segments/route.ts"]
    end

    SHELL --> TOPBAR
    SHELL --> MOBILE
    P_DASH --> MAP_SLOT
    P_DASH --> CHARTS
    P_DASH --> KPI
    P_DASH --> UI
    P_ROUTES --> MINI_MAP
    P_ROUTES --> UI
    P_EMER --> MINI_MAP
    P_ANAL --> CHARTS
    MAP_SLOT --> TRAFFIC_MAP

    P_DASH --> API_CLI
    P_ROUTES --> API_CLI
    P_ALERTS --> API_CLI
    P_EMER --> API_CLI
    P_ANAL --> API_CLI
    BOT --> API_CLI
    P_DASH --> USELIVE

    API_CLI --> BFF_STATS
    API_CLI --> BFF_HEAT
    API_CLI --> BFF_PRED
    API_CLI --> BFF_ROUT
    API_CLI --> BFF_ALERT
    API_CLI --> BFF_SUB
    API_CLI --> BFF_EMER
    API_CLI --> BFF_CHAT
    API_CLI --> BFF_SIM
    API_CLI --> BFF_ANAL
    API_CLI --> BFF_HEALTH
    API_CLI --> BFF_SEG

    BFF_STATS --> PROXY
    BFF_HEAT --> PROXY
    BFF_PRED --> PROXY
    BFF_ROUT --> PROXY
    BFF_ALERT --> PROXY
    BFF_SUB --> PROXY
    BFF_EMER --> PROXY
    BFF_CHAT --> PROXY
    BFF_SIM --> PROXY
    BFF_ANAL --> PROXY
    BFF_HEALTH --> PROXY
    BFF_SEG --> PROXY
```

---

## ML Pipeline Flow

Two pipelines coexist: the **segment model** trained off seeded Supabase readings (used by `/api/predict`), and the **dataset model** trained off the user-supplied Excel sheet (used by `/api/analytics/*`).

```mermaid
flowchart LR
    subgraph Sources["Raw data sources"]
        XLS[("TrafficCongestion_<br/>MultiLocation_<br/>7000Rows.xlsx<br/>(7000 rows, 12 cols)")]
        SEED[("Supabase Postgres<br/>traffic_readings<br/>(~10k rows, 7 days)")]
    end

    subgraph DS_Pipeline["Dataset pipeline (analytics)"]
        DS_LOAD["dataset_train.load_df()<br/>read_excel + tz parse"]
        DS_ENG["dataset_train.engineer()<br/>hour, dow, weekend,<br/>rush_hour, weather OHE,<br/>location OHE (top 20)"]
        DS_SPLIT["stratified 80/20<br/>train_test_split"]
        DS_FIT["XGBClassifier<br/>n_estimators=400<br/>max_depth=6<br/>lr=0.07"]
        DS_EVAL["accuracy · macro-F1 ·<br/>confusion matrix ·<br/>classification report ·<br/>feature importances"]
        DS_ART[["dataset_model.joblib<br/>dataset_preprocessor.joblib<br/>dataset_metrics.json"]]
    end

    subgraph SEG_Pipeline["Segment pipeline (live forecast)"]
        SEG_LOAD["train.load_readings()<br/>JOIN traffic_readings + segments"]
        SEG_ENG["feature_pipeline.engineer_features()<br/>time + lags (1,2,3) +<br/>rolling mean/std (window=4) +<br/>segment OHE (4 types)"]
        SEG_TARGET["target = label shifted<br/>FORECAST_STEPS=3<br/>(45 min ahead)"]
        SEG_SPLIT["time-ordered 80/20<br/>(last 20% = holdout)"]
        SEG_FIT["XGBClassifier<br/>n_estimators=350<br/>max_depth=6<br/>lr=0.08<br/>sample_weight = inverse-freq"]
        SEG_ART[["xgb_model.joblib<br/>preprocessor.joblib"]]
    end

    subgraph Serve["Inference"]
        LIVE_FEAT["assemble_live_features()<br/>recent 4 readings"]
        INF["ml.inference.predict()<br/>predict_proba ·<br/>risk_score = proba·[8,38,68,92]"]
        EP_PRED["/api/predict<br/>(per-segment forecast)"]
        EP_HEAT["/api/heatmap<br/>(all-segment forecast)"]
        EP_STATS["/api/stats<br/>(city risk score)"]
        EP_ANAL_PRED["/api/analytics/predict<br/>(single-row inference,<br/>dataset model)"]
        EP_ANAL_AGG["/api/analytics/{overview,<br/>by-location, hourly, weather}"]
    end

    XLS --> DS_LOAD --> DS_ENG --> DS_SPLIT --> DS_FIT --> DS_EVAL --> DS_ART
    SEED --> SEG_LOAD --> SEG_ENG --> SEG_TARGET --> SEG_SPLIT --> SEG_FIT --> SEG_ART

    SEG_ART --> INF
    DS_ART --> EP_ANAL_PRED
    DS_ART --> EP_ANAL_AGG
    SEED --> LIVE_FEAT --> INF
    INF --> EP_PRED
    INF --> EP_HEAT
    INF --> EP_STATS
```

**Dataset-model performance** (from [backend/ml/artifacts/dataset_metrics.json](backend/ml/artifacts/dataset_metrics.json)):

| Metric        | Value      |
| ------------- | ---------- |
| Accuracy      | **0.9093** |
| Macro-F1      | **0.885**  |
| Samples       | 7000       |
| Features      | 39         |
| Locations     | 18         |
| Test set size | 1400       |

Top feature importances: `Avg Speed (km/h)` (0.288), `Traffic Volume` (0.223), `w_rain` (0.162), `accident_flag` (0.136), `w_heavy_rain` (0.127).

**Segment-model performance** (printed by [backend/ml/train.py](backend/ml/train.py) on retrain; numbers persisted in `preprocessor.joblib["metrics"]`): the seeded run reports **~0.909 accuracy / ~0.885 macro-F1** on the time-ordered hold-out — re-derived live whenever the model is retrained.

---

## ER Diagram

The Postgres schema is intentionally compact — five tables for the operational data plus a sixth for push subscriptions. Geometry is stored as plain JSONB `[lat, lng]` arrays; no PostGIS extension required. (Schema is inferred from the SQL in [backend/db/seed.py](backend/db/seed.py), [backend/services/repo.py](backend/services/repo.py), [backend/services/alerts.py](backend/services/alerts.py), and [backend/services/predictions.py](backend/services/predictions.py).)

```mermaid
erDiagram
    ROAD_SEGMENTS ||--o{ TRAFFIC_READINGS : "has many"
    ROAD_SEGMENTS ||--o{ PREDICTIONS      : "has many"
    ROAD_SEGMENTS ||--o{ ALERTS           : "may reference"

    ROAD_SEGMENTS {
        int    id PK
        text   name
        text   code
        text   segment_type "highway | arterial | corridor | junction"
        float  length_km
        int    lanes
        int    speed_limit_kmh
        float  start_lat
        float  start_lng
        float  end_lat
        float  end_lng
        jsonb  geometry "list of [lat, lng]"
    }

    TRAFFIC_READINGS {
        int       id PK
        int       segment_id FK
        timestamp ts
        float     avg_speed_kmh
        int       vehicle_count
        float     occupancy_pct
        text      congestion_label "Low | Medium | High | Critical"
        bool      rain_flag
        bool      fog_flag
        bool      event_nearby
        bool      accident_nearby
    }

    PREDICTIONS {
        int       id PK
        int       segment_id FK
        timestamp forecast_for
        int       forecast_minutes
        text      congestion_label
        float     confidence
        float     prob_low
        float     prob_medium
        float     prob_high
        float     prob_critical
        float     risk_score
    }

    ALERTS {
        int       id PK
        int       segment_id FK "nullable"
        text      severity "low | medium | high | critical"
        text     road_name
        text      message
        int       sent_count
        bool      is_active
        timestamp created_at
    }

    ROUTES {
        int  id PK
        text origin
        text destination
    }

    ALERT_SUBSCRIPTIONS {
        text subscription_id PK "sub_<16 hex>"
        text city
        int  radius_km
        text severity_threshold
        bool push_enabled
    }
```

---

## Deployment Architecture

Local development runs as two Docker containers sharing the project-root `.env`. Production (per [DEPLOY.md](DEPLOY.md)) splits the workloads: **Vercel** for the Next.js front end, **Render** for the long-running FastAPI process (Vercel's serverless Python functions can't host the WebSocket or the multi-second Groq/TomTom pipelines under the Hobby-plan 10 s timeout).

```mermaid
graph TB
    subgraph LocalDocker["Local: docker-compose up --build"]
        L_FE["traffic-frontend<br/>Node 20 Alpine<br/>:3000<br/>next start (standalone)"]
        L_BE["traffic-backend<br/>Python 3.11 slim<br/>:8000<br/>uvicorn main:app"]
        L_FE -- "FASTAPI_URL=<br/>http://backend:8000" --> L_BE
        L_BE -- "DATABASE_URL" --> L_DB[("Supabase<br/>(remote)")]
    end

    subgraph Prod["Production split"]
        VERCEL["Vercel<br/>Hobby (free)<br/>Next.js Edge + Node runtime"]
        RENDER["Render Web Service<br/>Starter $7/mo<br/>Docker, ap-south-1<br/>FastAPI :PORT"]
        SUPA[("Supabase Postgres<br/>ap-south-1")]
        GROQ_API["Groq API"]
        TOMTOM_API["TomTom APIs"]
        BROWSER["End user browser"]

        BROWSER -- "https" --> VERCEL
        BROWSER -- "wss /ws/live-updates" --> RENDER
        VERCEL -- "FASTAPI_URL=<br/>https://veloct-api.onrender.com" --> RENDER
        RENDER --> SUPA
        RENDER -- "httpx (server-side)" --> GROQ_API
        RENDER -- "httpx" --> TOMTOM_API
        BROWSER -- "tile + flow lookups<br/>(NEXT_PUBLIC_TOMTOM_API_KEY)" --> TOMTOM_API
    end
```

Backend container details:

- Base image: `python:3.11-slim` ([backend/Dockerfile](backend/Dockerfile)).
- Entry: [backend/entrypoint.sh](backend/entrypoint.sh) waits for Postgres (30 retries × 2 s), optionally re-seeds (`SEED_ON_STARTUP=true`), optionally retrains the segment model (`TRAIN_ON_STARTUP=true`), then binds to `$PORT` (Render injects this; falls back to 8000 locally).
- Healthcheck: `curl -fs http://localhost:$PORT/api/health` every 15 s.

Frontend container details:

- Multi-stage build: `node:20-alpine` deps → builder → runner ([frontend/Dockerfile](frontend/Dockerfile)).
- Runs as non-root `nextjs` user, ships only `.next/standalone` + `.next/static` + `public/`.
- Healthcheck pings `/dashboard` over wget.

---

## API Reference

All REST endpoints are mounted under `/api` ([backend/main.py:62-67](backend/main.py#L62-L67)). The WebSocket lives at the root.

| Method | Path | Purpose | Source |
| ------ | ---- | ------- | ------ |
| `GET`  | `/api/health` | Liveness + Postgres connectivity + row counts for the 5 main tables | [routers/health.py](backend/routers/health.py) |
| `GET`  | `/api/segments` | Lists all `road_segments` with geometry | [routers/segments.py](backend/routers/segments.py) |
| `POST` | `/api/predict` | 45-min XGBoost forecast for one segment | [routers/predict.py](backend/routers/predict.py) |
| `GET`  | `/api/heatmap` | GeoJSON FeatureCollection + top-3 high-risk zones | [routers/heatmap.py](backend/routers/heatmap.py) |
| `GET`  | `/api/stats` | Dashboard KPI bundle | [routers/stats.py](backend/routers/stats.py) |
| `GET`  | `/api/routes?origin=…&destination=…` | Three compared routes (Fastest / Eco / AI) | [routers/routes.py](backend/routers/routes.py) |
| `POST` | `/api/routes` | Same, JSON body `{ origin, destination }` | [routers/routes.py](backend/routers/routes.py) |
| `GET`  | `/api/alerts?severity=&limit=` | Alert feed, newest first | [routers/alerts.py](backend/routers/alerts.py) |
| `POST` | `/api/alerts/subscribe` | Create a push subscription, returns `sub_<hex>` id | [routers/alerts.py](backend/routers/alerts.py) |
| `POST` | `/api/emergency-route` | Priority corridor + 7-junction pre-emption plan | [routers/emergency.py](backend/routers/emergency.py) |
| `POST` | `/api/chat` | Streaming chatbot reply (`text/plain; charset=utf-8`) | [routers/chat.py](backend/routers/chat.py) |
| `POST` | `/api/simulate-rush` | Spike MG Road / NH-48 / IFFCO Chowk + fire a critical alert | [routers/simulate.py](backend/routers/simulate.py) |
| `GET`  | `/api/analytics/overview` | Dataset model metrics + class distribution + features | [routers/analytics.py](backend/routers/analytics.py) |
| `GET`  | `/api/analytics/by-location` | Per-location severe-rate / speed / volume | [routers/analytics.py](backend/routers/analytics.py) |
| `GET`  | `/api/analytics/hourly` | 24-hour traffic profile from the 7k dataset | [routers/analytics.py](backend/routers/analytics.py) |
| `GET`  | `/api/analytics/weather` | Weather impact on congestion | [routers/analytics.py](backend/routers/analytics.py) |
| `POST` | `/api/analytics/predict` | Single-row inference on the dataset model | [routers/analytics.py](backend/routers/analytics.py) |
| `WS`   | `/ws/live-updates` | Pushes `congestion_update` payload every `LIVE_UPDATE_INTERVAL` s | [routers/live.py](backend/routers/live.py) |

### Selected request / response shapes

Full Pydantic schemas live in [backend/models/schemas.py](backend/models/schemas.py). The most common ones:

**`POST /api/predict`**

```json
// request
{ "segment_id": 3, "rain_flag": true, "accident_nearby": false }

// response (PredictResponse)
{
  "segment_id": 3,
  "segment_name": "NH-48 Gurgaon",
  "congestion_label": "High",
  "confidence": 0.71,
  "probabilities": { "Low": 0.05, "Medium": 0.18, "High": 0.71, "Critical": 0.06 },
  "risk_score": 64.3,
  "forecast_minutes": 45
}
```

**`POST /api/routes`**

```json
// request
{ "origin": "Connaught Place, Delhi", "destination": "Cyber City, Gurgaon" }

// response (RoutesResponse)
{
  "origin": "Connaught Place, Delhi",
  "destination": "Cyber City, Gurgaon",
  "routes": [
    {
      "id": "fastest",
      "title": "Fastest Route",
      "route_type": "fastest",
      "via": "via NH-48 Gurgaon",
      "eta_minutes": 42,
      "eta_delta": "+0 min vs fastest",
      "toll_inr": 245.0,
      "fuel_inr": 252.84,
      "distance_km": 29.4,
      "traffic_level": "medium",
      "polyline": [[28.6315, 77.2196], ...],
      "toll_plazas": [
        { "name": "DND Toll Plaza", "segment": "NH-48 KM 12", "cost": 95.0 }
      ],
      "reason": null,
      "score": 0.6312
    },
    { "id": "eco", "route_type": "economical", "toll_inr": 0.0, ... },
    {
      "id": "ai",
      "route_type": "ai_recommended",
      "reason": "Lowest weighted score — avoids the MG Junction surge predicted in the next 22 min.",
      ...
    }
  ]
}
```

**`POST /api/emergency-route`**

```json
// request
{ "vehicle_type": "ambulance", "origin": "AIIMS", "destination": "Max Hospital, Saket" }

// response (EmergencyResponse)
{
  "vehicle_type": "ambulance",
  "polyline": [[28.5686, 77.2070], ...],
  "distance_km": 7.8,
  "eta_with_clearance_min": 7.5,
  "eta_without_clearance_min": 18.0,
  "time_saved_min": 10.5,
  "junctions": [
    { "name": "AIIMS Junction", "command": "Hold green · East-West", "offset": "0 s", "state": "cleared" },
    ...
  ],
  "advisory": "Priority corridor live · cascading 7 signals · ambulance unit AMB-12. ..."
}
```

**`WS /ws/live-updates`** — broadcast payload:

```json
{
  "type": "congestion_update",
  "ts": "2026-05-15T10:24:00+00:00",
  "city_risk_score": 58.4,
  "segments": [
    { "segment_id": 1, "name": "MG Road Corridor", "occupancy_pct": 67.2,
      "avg_speed_kmh": 18.3, "congestion_label": "High", "delta": +4.1 },
    ...
  ]
}
```

The browser also exposes an autogenerated Swagger UI at [`/docs`](http://localhost:8000/docs) and Redoc at [`/redoc`](http://localhost:8000/redoc) when FastAPI is running.

---

## Frontend Routes

| Path                       | Type           | Purpose                                                                                                                                | Source                                                                              |
| -------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `/`                        | redirect       | 302 → `/dashboard`                                                                                                                     | [app/page.tsx](frontend/app/page.tsx)                                               |
| `/dashboard`               | client page    | Map, KPI tiles, congestion-risk gauge, multi-zone heatmap, hourly forecast, live volume sparkline, simulate-rush button, warning panel | [app/dashboard/page.tsx](frontend/app/dashboard/page.tsx)                           |
| `/routes`                  | client page    | Origin/destination form, three-route comparison cards, toll breakdown, AI reason chip, polyline mini-map                               | [app/routes/page.tsx](frontend/app/routes/page.tsx)                                 |
| `/alerts`                  | client page    | Alert feed with severity filter, push-subscribe form, CSV export, details modal                                                        | [app/alerts/page.tsx](frontend/app/alerts/page.tsx)                                 |
| `/emergency`               | client page    | Vehicle type picker, ETA-with vs ETA-without cards, 7-junction pre-emption list, mission log, save/load templates                      | [app/emergency/page.tsx](frontend/app/emergency/page.tsx)                           |
| `/analytics`               | client page    | Dataset-model accuracy/F1, class distribution, feature importances, hourly profile, weather impact, location ranking, prediction sandbox | [app/analytics/page.tsx](frontend/app/analytics/page.tsx)                           |

All `/api/*` paths are BFF route handlers under [frontend/app/api/](frontend/app/api/) that thinly proxy to FastAPI via [lib/proxy.ts](frontend/lib/proxy.ts) — one handler per backend endpoint, plus the `chat` handler that flips `stream: true`.

---

## Project Structure

```
.
├── backend/                                FastAPI service
│   ├── main.py                             App factory, CORS, lifespan-managed pool
│   ├── config.py                           Pydantic settings (env / .env)
│   ├── requirements.txt                    Python dependencies
│   ├── Dockerfile                          python:3.11-slim image
│   ├── entrypoint.sh                       DB wait → optional seed/train → uvicorn
│   ├── routers/                            Thin FastAPI route handlers (one per resource)
│   ├── services/                           Domain logic (predictions, routing, chatbot, …)
│   ├── models/schemas.py                   Pydantic request/response models
│   ├── db/
│   │   ├── database.py                     psycopg connection pool + query helpers
│   │   ├── network.py                      Static 15-segment Delhi NCR network
│   │   └── seed.py                         Synthetic-data seeder (7 days × 15 min)
│   └── ml/
│       ├── feature_pipeline.py             Lags, rolling stats, OHE for the live model
│       ├── train.py                        Train xgb_model.joblib from Postgres readings
│       ├── dataset_train.py                Train dataset_model.joblib from the 7k Excel
│       ├── inference.py                    @lru_cache loader + predict() entrypoint
│       └── artifacts/                      Serialized models + metrics (committed)
│
├── frontend/                               Next.js 14 (App Router)
│   ├── app/
│   │   ├── layout.tsx                      Root shell + ToastHost + TrafficBot
│   │   ├── page.tsx                        Redirect → /dashboard
│   │   ├── globals.css                     Design tokens, glass panels, animations
│   │   ├── {dashboard,routes,alerts,emergency,analytics}/page.tsx
│   │   └── api/**/route.ts                 BFF proxies (POST/GET/streaming)
│   ├── components/                         AppShell, TopBar, MobileShell, TrafficMap,
│   │                                       MapSlot, MiniMap, TrafficBot, charts,
│   │                                       ui primitives, Toast, KpiHeatmap, icons
│   ├── lib/                                api client, proxy, useLive, useMobile, types
│   ├── package.json                        Next 14.2, React 18.3, framer-motion, zustand
│   ├── next.config.js                      Reads project-root .env, re-exports vars
│   └── Dockerfile                          Multi-stage node:20-alpine → standalone
│
├── docker-compose.yml                      Two-service local stack
├── .env.example                            Documented env variables (no secrets)
├── DEPLOY.md                               Vercel + Render production split guide
├── SETUP.md                                Local-run + new-feature changelog
├── ARCHITECTURE.png                        Legacy architecture poster (supplementary)
├── Solution_Architecture.pdf               Generated solution architecture
├── PROBLEM STATEMENT.pdf                   Original brief
├── TrafficCongestion_MultiLocation_7000Rows.xlsx   Dataset used by dataset_train.py
└── README.md                               (this file)
```

---

## Local Development Setup

> Prerequisites: Python 3.11+, Node 20+, npm, a Supabase database password (for the live segment model and dashboard KPIs). Groq and TomTom keys are **optional** — the app degrades gracefully without them (rule-based chatbot, static route templates).

### 1. Configure environment

Copy the example file and fill in the redacted secrets. The same `.env` is loaded by both services thanks to [frontend/next.config.js](frontend/next.config.js).

```bash
cp .env.example .env
# Edit DATABASE_URL, GROQ_API_KEY, NEXT_PUBLIC_TOMTOM_API_KEY
```

### 2. Backend (terminal 1)

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt

# (Optional) train the segment model from the seeded DB
python -m ml.train

# (Optional) train the dataset model from the Excel sheet — required for /api/analytics/*
python -m ml.dataset_train

uvicorn main:app --reload --port 8000
```

The FastAPI Swagger UI is at `http://localhost:8000/docs`.

### 3. Frontend (terminal 2)

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Open `http://localhost:3000` — you'll be redirected to `/dashboard`.

### 4. Verify

```bash
# Health + DB connectivity
curl http://127.0.0.1:8000/api/health

# Dataset analytics (works even with no DB connection)
curl http://127.0.0.1:8000/api/analytics/overview
```

---

## Docker / Production Deployment

### One-command local stack

```bash
docker-compose up --build
```

This brings up:

- `traffic-backend` on `:8000` (waits for Supabase, optionally seeds/retrains, then launches uvicorn).
- `traffic-frontend` on `:3000` (Next.js standalone output).

The compose file ([docker-compose.yml](docker-compose.yml)) wires `FASTAPI_URL=http://backend:8000` for server-side BFF calls and leaves `NEXT_PUBLIC_WS_URL=ws://localhost:8000` for the browser-side WebSocket.

### Production split (recommended)

See [DEPLOY.md](DEPLOY.md) for the full walkthrough. Summary:

1. **Backend → Render** (Docker, Starter $7/mo, `ap-south-1` or Singapore region). Set the env vars listed in [DEPLOY.md](DEPLOY.md). You'll get `https://<service>.onrender.com`.
2. **Frontend → Vercel** (Hobby tier free). Root directory `frontend/`. Set `FASTAPI_URL` to the Render URL and `NEXT_PUBLIC_TOMTOM_API_KEY` for the client map. **Do not** set `GROQ_API_KEY` on Vercel — keep it server-side on Render so it never reaches the client bundle.
3. After both deploy, update `CORS_ORIGINS` on Render to include the real Vercel production URL (and any preview URLs you want to allow).

Cost ballpark (from [DEPLOY.md](DEPLOY.md)): ~$7/mo to run continuously (Render Starter); everything else fits within free tiers.

---

## Environment Variables

Sourced from [.env.example](.env.example) and [backend/config.py](backend/config.py):

| Variable                       | Required | Default                                            | Description                                                                            |
| ------------------------------ | -------- | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `DATABASE_URL`                 | yes      | `postgresql://postgres:postgres@localhost:5432/postgres` | Supabase Postgres connection string (use the **transaction pooler**, port 6543).       |
| `SUPABASE_URL`                 | no       | `""`                                               | Project URL — informational, not used by the backend at runtime.                       |
| `SUPABASE_ANON_KEY`            | no       | `""`                                               | Anon key — informational.                                                              |
| `GROQ_API_KEY`                 | no       | `""`                                               | Enables the Groq-backed chatbot and AI route pick. Without it both fall back to local logic. |
| `GROQ_MODEL`                   | no       | `llama-3.3-70b-versatile`                          | Groq model id used by [services/chatbot.py](backend/services/chatbot.py) and [services/routing.py](backend/services/routing.py). |
| `NEXT_PUBLIC_TOMTOM_API_KEY`   | no       | `""`                                               | Enables real TomTom routing/geocoding + live flow on the client map.                   |
| `TOMTOM_API_KEY`               | no       | `""`                                               | Alternative server-only TomTom key. `settings.tomtom_key` prefers this if both are set. |
| `API_PREFIX`                   | no       | `/api`                                             | Prefix mounted in [backend/main.py:62-67](backend/main.py#L62-L67).                    |
| `CORS_ORIGINS`                 | no       | `http://localhost:3000,http://127.0.0.1:3000`      | Comma-separated list of allowed origins.                                               |
| `LIVE_UPDATE_INTERVAL`         | no       | `30`                                               | Seconds between WebSocket ticks.                                                       |
| `MODEL_DIR`                    | no       | `ml/artifacts`                                     | Where joblib artifacts are loaded from / saved to.                                     |
| `SEED_ON_STARTUP`              | no       | `false`                                            | If `true`, the backend container runs `python -m db.seed` on boot.                     |
| `TRAIN_ON_STARTUP`             | no       | `false`                                            | If `true`, the backend container runs `python -m ml.train` on boot.                    |
| `FASTAPI_URL`                  | yes (FE) | `http://localhost:8000`                            | Where the BFF route handlers reach FastAPI. Trailing slashes are stripped automatically by [lib/proxy.ts](frontend/lib/proxy.ts). |
| `NEXT_PUBLIC_WS_URL`           | no       | `ws://<window.hostname>:8000`                      | Base URL the browser connects to for `/ws/live-updates`.                               |
| `PORT`                         | no       | `8000`                                             | Backend bind port — Render and most PaaS hosts inject this.                            |

---

## ML Model Details

### Dataset model (`/api/analytics/*`)

- **Source:** [TrafficCongestion_MultiLocation_7000Rows.xlsx](TrafficCongestion_MultiLocation_7000Rows.xlsx), 7000 rows × 12 columns (`Timestamp, Location, Latitude, Longitude, Traffic Volume, Avg Speed (km/h), Weather, Rain(mm), Accident, Event, Public Transport Density, Congestion Level`).
- **Target:** `Congestion Level ∈ {Low, Medium, High, Very High}`.
- **Algorithm:** XGBoost `multi:softprob`, 400 trees, max_depth=6, lr=0.07, sample weights = inverse class frequency.
- **Features (39):** hour, day_of_week, is_weekend, is_rush_hour (7–10 AM / 5–8 PM), Traffic Volume, Avg Speed, Rain(mm), Public Transport Density, accident_flag, event_flag, Latitude, Longitude, weather one-hot (5), location one-hot (top-20 + Other).
- **Split:** 80/20 stratified, `random_state=42`.
- **Metrics** (see [backend/ml/artifacts/dataset_metrics.json](backend/ml/artifacts/dataset_metrics.json)): accuracy **0.9093**, macro-F1 **0.885**, per-class F1: Low 0.943, Medium 0.886, High 0.767, Very High 0.945.
- **Retrain:** `cd backend && python -m ml.dataset_train` — overwrites `dataset_model.joblib`, `dataset_preprocessor.joblib`, `dataset_metrics.json`. The analytics service hot-reloads the JSON on the next request via mtime ([services/analytics.py:35-51](backend/services/analytics.py#L35-L51)).

### Segment model (`/api/predict`)

- **Source:** Supabase `traffic_readings` JOIN `road_segments`. The default seed produces 7 days × 96 readings/day × 15 segments ≈ **10,080 rows** with rush-hour curves anchored to IST.
- **Target:** congestion label `FORECAST_STEPS=3` readings ahead = **45 minutes ahead**.
- **Algorithm:** XGBoost `multi:softprob`, 350 trees, max_depth=6, lr=0.08, inverse-frequency sample weights.
- **Features (24):** `hour, day_of_week, is_weekend, is_rush_hour, rain_flag, fog_flag, event_nearby, accident_nearby, occupancy_pct, avg_speed_kmh, vehicle_count, occ_lag_1, occ_lag_2, occ_lag_3, speed_lag_1, speed_roll_mean (4-step), speed_roll_std, occ_roll_mean, lanes, speed_limit_kmh, is_highway, is_arterial, is_corridor, is_junction` ([backend/ml/feature_pipeline.py:34-42](backend/ml/feature_pipeline.py#L34-L42)).
- **Split:** time-ordered, last 20% as hold-out (no look-ahead leakage).
- **Risk score:** `proba · [8, 38, 68, 92]` maps the 4-class distribution to a 0–100 scalar consumed by the dashboard gauge.
- **Retrain:** `cd backend && python -m ml.train` (or set `TRAIN_ON_STARTUP=true` in the env).

---
