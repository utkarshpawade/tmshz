// Mock data lifted from the Claude design. Phase 5 swaps these for live
// fetches against the FastAPI backend; the screens import from here so the
// swap is one-line.
import type {
  Alert,
  HistoryAlert,
  RiskZone,
  RouteOption,
  Segment,
  SignalJunction,
  VolumeBucket,
} from "./types";

export const DASHBOARD_SEGMENTS: Segment[] = [
  { id: "MG-CORR", name: "MG Road Corridor", code: "45623", ts: "08.03.2026, 02:37:53 AM", status: "online", signal: "LIVE", net: "SENSOR", seed: 7, active: true },
  { id: "RING-N",  name: "Ring Road North",  code: "31564", ts: "10.03.2026, 11:22:18 AM", status: "online", signal: "LIVE", net: "SENSOR", seed: 13 },
  { id: "NH-48",   name: "NH-48 Gurgaon",    code: "34654", ts: "10.03.2026, 11:25:40 AM", status: "online", signal: "LIVE", net: "SENSOR", seed: 19 },
  { id: "DND",     name: "DND Flyway",       code: "21209", ts: "10.03.2026, 11:23:12 AM", status: "offline", signal: "LIVE", net: "SENSOR", seed: 27 },
];

// Operational efficiency series 06:00 -> 21:00 (15 points)
export const EFFICIENCY_SERIES: number[] =
  [73, 76, 78, 81, 80, 82, 79, 77, 76, 78, 80, 81, 83, 82, 80, 79, 78, 77, 79, 80, 81, 82, 80, 78, 79, 81, 83, 82, 81, 79];

export const EFFICIENCY_X_LABELS = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];

// 60-minute congestion forecast
export const FORECAST_SERIES: number[] =
  [42, 48, 55, 62, 70, 75, 78, 82, 85, 87, 84, 80, 76, 71, 68, 64, 60, 58, 55, 52];

export const HIGH_RISK_ZONES: RiskZone[] = [
  { name: "MG Road Junction",   pct: 87, eta: "22 min", dir: "rising" },
  { name: "DND → Mahamaya",     pct: 79, eta: "38 min", dir: "rising" },
  { name: "NH-48 IFFCO Chowk",  pct: 71, eta: "14 min", dir: "falling" },
];

export const VOLUME_BUCKETS: VolumeBucket[] = [
  { lab: "55k", delta: "0%",   good: true  },
  { lab: "57k", delta: "−8%",  good: false },
  { lab: "56k", delta: "+6%",  good: true  },
  { lab: "55k", delta: "0%",   good: true  },
  { lab: "52k", delta: "−12%", good: false },
  { lab: "55k", delta: "0%",   good: true  },
];

export const LIVE_VOLUME_SPARK: number[] =
  [58, 52, 60, 55, 53, 49, 48, 51, 54, 58, 56, 62, 58, 55, 52, 56, 60, 64, 57, 55];

export const VARIANCE_ROWS = [
  { code: "45623", vals: ["-2", "+1", "+1.5", "-1", "-1"],   labels: ["L1", "L12", "L14", "L15", "L24"] },
  { code: "34654", vals: ["-1", "-2", "+2",   "-2.5", "+2"], labels: ["L1", "L12", "L14", "L15", "L24"] },
];

// ---- Routes ---------------------------------------------------------------
export const ROUTES: RouteOption[] = [
  {
    id: "fastest",
    title: "Fastest Route",
    route_type: "fastest",
    via: "NH-48 via IFFCO Chowk",
    eta_minutes: 38,
    eta_delta: "+4 min vs usual",
    toll_inr: 245,
    fuel_inr: 312,
    traffic_level: "high",
    distance_km: 29.4,
    toll_plazas: [
      { name: "DND Toll Plaza",  segment: "NH-48 KM 12",   cost: 95 },
      { name: "Sirhaul Border",  segment: "Delhi-Gurgaon", cost: 75 },
      { name: "Kherki Daula",    segment: "NH-48 KM 24",   cost: 75 },
    ],
  },
  {
    id: "eco",
    title: "Economical",
    route_type: "economical",
    via: "MG Road · Mehrauli",
    eta_minutes: 52,
    eta_delta: "+2 min vs usual",
    toll_inr: 0,
    fuel_inr: 264,
    traffic_level: "medium",
    distance_km: 31.8,
    toll_plazas: [{ name: "No toll plazas on this route", segment: "—", cost: 0 }],
  },
  {
    id: "ai",
    title: "AI Recommended",
    route_type: "ai_recommended",
    tag: "AI",
    via: "Inner Ring → Dhaula Kuan → NH-48",
    eta_minutes: 41,
    eta_delta: "−9 min vs forecast",
    toll_inr: 115,
    fuel_inr: 296,
    traffic_level: "low",
    distance_km: 30.2,
    reason: "Avoids MG Junction surge predicted in next 22 min",
    toll_plazas: [
      { name: "Dhaula Kuan Bypass", segment: "Inner Ring KM 8", cost: 40 },
      { name: "Rajokri Toll",       segment: "NH-48 KM 18",     cost: 75 },
    ],
  },
];

// ---- Alerts ---------------------------------------------------------------
export const INITIAL_ALERTS: Alert[] = [
  { id: 9, level: "high",     road: "NH-48 · IFFCO Chowk",       msg: "Multi-vehicle pile-up on inner lane. Expect 25-min delay.",            when: "32s ago" },
  { id: 8, level: "critical", road: "DND Flyway · Mahamaya",     msg: "Severe congestion · 92% predicted in 18 min. Reroute via Kalindi Kunj.", when: "1m ago" },
  { id: 7, level: "medium",   road: "Ring Road N · ISBT",        msg: "Slow-moving traffic from protest near Civil Lines.",                   when: "4m ago" },
  { id: 6, level: "low",      road: "MG Road · Saket",           msg: "Sensor variance corrected — flows back to baseline.",                  when: "8m ago" },
  { id: 5, level: "high",     road: "Noida Expressway · Sec-38", msg: "Stalled truck right shoulder · clearance ~12 min.",                    when: "14m ago" },
];

export const ALERT_HISTORY: HistoryAlert[] = [
  { date: "14 May, 09:12", segment: "MG Road · Connaught",         level: "medium",   msg: "Predicted morning peak surpassed target by 8%.",  sent: "23.4k" },
  { date: "14 May, 08:48", segment: "NH-48 · Rajokri",             level: "high",     msg: "Heavy truck convoy crossing — slow lane impact.", sent: "12.1k" },
  { date: "14 May, 08:14", segment: "DND Flyway",                  level: "critical", msg: "Accident cleared after 24 min · advisory ended.", sent: "40.8k" },
  { date: "14 May, 07:39", segment: "Ring Road N · Majnu Ka Tila", level: "low",      msg: "Sensor re-online · backlog cleared.",             sent: "4.2k"  },
  { date: "14 May, 07:02", segment: "Noida Expy · Sec-94",         level: "medium",   msg: "Weekday surge predicted between 09:30–11:00.",    sent: "18.6k" },
  { date: "14 May, 06:48", segment: "Inner Ring · AIIMS Jn",       level: "high",     msg: "Emergency vehicle priority — temporary slowdown.", sent: "9.5k"  },
];

export const LIVE_ALERT_SAMPLES: Omit<Alert, "id" | "when">[] = [
  { level: "critical", road: "Outer Ring · Vasant Kunj", msg: "Predicted congestion 94% in 16 min — system advising reroute." },
  { level: "high",     road: "MG Road · Hauz Khas",      msg: "Lane closure for hydrant work · 18 min impact." },
  { level: "medium",   road: "NH-44 · Azadpur",          msg: "Vegetable market overflow narrowing carriageway." },
  { level: "low",      road: "Inner Ring · AIIMS",       msg: "Average speed back to 38 km/h." },
];

// ---- Emergency ------------------------------------------------------------
export const EMERGENCY_JUNCTIONS: SignalJunction[] = [
  { name: "AIIMS Junction",      cmd: "Hold green · East-West",       offsetSec: "0 s",   state: "cleared" },
  { name: "Safdarjung Crossing", cmd: "Pre-empt · 38 s lead",          offsetSec: "+38 s", state: "cleared" },
  { name: "INA Market",          cmd: "Block left turn",               offsetSec: "+1:22", state: "cleared" },
  { name: "Yusuf Sarai Flyover", cmd: "Coordinate cycle · 2 phases",   offsetSec: "+2:04", state: "staged"  },
  { name: "Hauz Khas Underpass", cmd: "Open green · all approaches",   offsetSec: "+3:18", state: "staged"  },
  { name: "Sheikh Sarai",        cmd: "Pre-empt · 28 s lead",          offsetSec: "+4:32", state: "pending" },
  { name: "Saket Citywalk",      cmd: "Hold opposing flow",            offsetSec: "+6:10", state: "pending" },
];

// ---- Chatbot canned responses --------------------------------------------
export const CHATBOT_CANNED: string[] = [
  "Average speed on NH-48 right now is 31 km/h — heavy from Rajokri to IFFCO Chowk. Try the Mehrauli arterial if your ETA is flexible (52 min) or the AI Recommended route via Inner Ring (41 min, ₹115 toll).",
  "DND Flyway congestion is forecast at 92% in 18 min — a vehicle stall at Mahamaya is the trigger. Reroute via Kalindi Kunj Bridge cuts ~14 min off the trip.",
  "Predicted city-wide risk score for the next hour is 72 (High). Hotspots: MG Junction (87%), DND→Mahamaya (79%), IFFCO Chowk (71%).",
  "Connaught Place → Cyber City best route right now is Inner Ring → Dhaula Kuan → NH-48: 41 min, ₹115 toll, ₹296 fuel estimate. Saves 9 min vs the fastest route which is currently in surge.",
];

// ---- Delhi NCR map network (mirrors backend network for the global map) --
export const DELHI_CENTER: [number, number] = [28.5562, 77.1500];

export const NETWORK = {
  ringRoad: [
    [28.6358, 77.1810], [28.6470, 77.2050], [28.6340, 77.2350],
    [28.6080, 77.2520], [28.5810, 77.2630], [28.5520, 77.2710],
    [28.5260, 77.2530], [28.5180, 77.2210], [28.5300, 77.1850],
    [28.5510, 77.1620], [28.5780, 77.1500], [28.6080, 77.1480],
    [28.6300, 77.1610], [28.6358, 77.1810],
  ],
  nh48: [
    [28.5912, 77.1610], [28.5680, 77.1320], [28.5380, 77.1010],
    [28.5060, 77.0740], [28.4830, 77.0540], [28.4570, 77.0370],
    [28.4300, 77.0240],
  ],
  dnd: [
    [28.5680, 77.2630], [28.5570, 77.2920], [28.5450, 77.3120],
    [28.5330, 77.3320],
  ],
  mgRoad: [
    [28.4640, 77.0830], [28.4770, 77.1010], [28.4820, 77.1190],
    [28.4830, 77.1380], [28.4790, 77.1550],
  ],
  noidaExpy: [
    [28.5330, 77.3320], [28.5170, 77.3470], [28.4970, 77.3620],
    [28.4750, 77.3750], [28.4530, 77.3870],
  ],
  outerRingN: [
    [28.7080, 77.1410], [28.7140, 77.1730], [28.7080, 77.2090],
    [28.6900, 77.2390], [28.6650, 77.2570],
  ],
  eastPeri: [
    [28.6080, 77.2520], [28.5970, 77.2980], [28.5740, 77.3290],
  ],
} as const;

export const HOTSPOT: [number, number] = [28.4763, 77.1062];

export const AI_ROUTE_POLYLINE: [number, number][] = [
  [28.6315, 77.2196], [28.5910, 77.1855], [28.5750, 77.1620],
  [28.5610, 77.1380], [28.5350, 77.1050], [28.5060, 77.0760],
  [28.4940, 77.0760], [28.4940, 77.0890],
];

export const INCIDENT_MARKERS: [number, number][] = [
  [28.5650, 77.2920],   // DND incident
  [28.4870, 77.1640],   // MG Junction east
  [28.4570, 77.0370],   // NH-48 Gurgaon
];

export const WARNING_MARKERS: [number, number][] = [
  [28.5180, 77.2210],   // Ring Rd south
  [28.4970, 77.3620],   // Noida expy
];

export const SENSOR_MARKERS: [number, number][] = [
  [28.6358, 77.1810], [28.6470, 77.2050], [28.6080, 77.2520],
  [28.5780, 77.1500], [28.5912, 77.1610], [28.5380, 77.1010],
  [28.4830, 77.0540], [28.4790, 77.1550], [28.5570, 77.2920],
  [28.5170, 77.3470], [28.6900, 77.2390], [28.5300, 77.1850],
];

export const ROAD_LABELS: { c: [number, number]; t: string }[] = [
  { c: [28.5060, 77.0700], t: "NH-48 →" },
  { c: [28.4830, 77.1320], t: "MG ROAD" },
  { c: [28.5550, 77.2980], t: "DND FLYWAY" },
  { c: [28.4830, 77.3650], t: "NOIDA EXPY" },
  { c: [28.6340, 77.1900], t: "RING ROAD" },
];
