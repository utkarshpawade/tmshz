// Browser-side API client.

const BFF = "/api";

async function j<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

export interface StatsResponse {
  avg_speed_kmh: number;
  active_incidents: number;
  alert_count: number;
  operational_efficiency_pct: number;
  monitored_segments: number;
  sensors_offline: number;
  total_vehicles_today: number;
  city_risk_score: number;
}

export interface HeatmapHighRiskZone {
  segment_id: number;
  name: string;
  risk_score: number;
  congestion_label: string;
  confidence: number;
  eta_peak_min: number;
  direction: "rising" | "falling";
  lat: number;
  lng: number;
}

export interface HeatmapResponse {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "LineString"; coordinates: number[][] };
    properties: Record<string, unknown>;
  }>;
  high_risk_zones: HeatmapHighRiskZone[];
}

export interface AnalyticsOverview {
  model_ready: boolean;
  accuracy?: number;
  macro_f1?: number;
  n_samples?: number;
  n_features?: number;
  n_locations?: number;
  labels?: string[];
  class_distribution?: Record<string, number>;
  feature_importances?: { name: string; score: number }[];
  confusion_matrix?: number[][];
  trained_at?: string;
  avg_speed_kmh?: number;
  avg_traffic_vol?: number;
  accident_rate?: number;
  event_rate?: number;
  pct_severe?: number;
  weather_breakdown?: Record<string, number>;
}

export interface LocationStat {
  location: string;
  avg_speed_kmh: number;
  avg_volume: number;
  accident_rate: number;
  severe_rate: number;
  rows: number;
  lat: number;
  lng: number;
}

export interface HourlyPoint {
  hour: number;
  volume: number;
  speed: number;
  severe_rate: number;
}

export interface WeatherImpact {
  weather: string;
  avg_speed_kmh: number;
  severe_rate: number;
  rows: number;
}

export interface AnalyticsPredictResponse {
  predicted_label: string;
  confidence: number;
  probabilities: Record<string, number>;
  risk_score: number;
  inputs: Record<string, unknown>;
}

export const api = {
  stats: () => fetch(`${BFF}/stats`, { cache: "no-store" }).then(j<StatsResponse>),

  heatmap: () =>
    fetch(`${BFF}/heatmap`, { cache: "no-store" }).then(j<HeatmapResponse>),

  alerts: (severity?: string, limit = 30) => {
    const qs = new URLSearchParams();
    if (severity && severity !== "all") qs.set("severity", severity);
    qs.set("limit", String(limit));
    return fetch(`${BFF}/alerts?${qs.toString()}`, { cache: "no-store" }).then(j);
  },

  subscribe: (body: {
    city: string;
    radius_km: number;
    push_enabled: boolean;
    severity_threshold?: string;
  }) =>
    fetch(`${BFF}/alerts/subscribe`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(j),

  routes: (origin?: string, destination?: string) =>
    fetch(`${BFF}/routes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        origin: origin || "Connaught Place, Delhi",
        destination: destination || "Cyber City, Gurgaon",
      }),
      cache: "no-store",
    }).then(j),

  predict: (body: { segment_id: number } & Record<string, unknown>) =>
    fetch(`${BFF}/predict`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(j),

  emergencyRoute: (body: {
    vehicle_type: "ambulance" | "fire" | "police";
    origin: string;
    destination: string;
  }) =>
    fetch(`${BFF}/emergency-route`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(j),

  simulateRush: () =>
    fetch(`${BFF}/simulate-rush`, { method: "POST" }).then(j),

  health: () => fetch(`${BFF}/health`, { cache: "no-store" }).then(j),

  // ---- Analytics ----
  analytics: {
    overview: () => fetch(`${BFF}/analytics/overview`, { cache: "no-store" }).then(j<AnalyticsOverview>),
    byLocation: () => fetch(`${BFF}/analytics/by-location`, { cache: "no-store" }).then(j<LocationStat[]>),
    hourly: () => fetch(`${BFF}/analytics/hourly`, { cache: "no-store" }).then(j<HourlyPoint[]>),
    weather: () => fetch(`${BFF}/analytics/weather`, { cache: "no-store" }).then(j<WeatherImpact[]>),
    predict: (body: Record<string, unknown>) =>
      fetch(`${BFF}/analytics/predict`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }).then(j<AnalyticsPredictResponse>),
  },

  // Streams the chat reply as text/plain chunks.
  chatStream: async (
    message: string,
    onChunk: (chunk: string, accumulated: string) => void,
    history?: { role: "user" | "assistant"; content: string }[],
  ): Promise<string> => {
    const r = await fetch(`${BFF}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, history: history ?? [] }),
    });
    if (!r.ok || !r.body) throw new Error(`${r.status} ${r.statusText}`);
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let acc = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      acc += chunk;
      onChunk(chunk, acc);
    }
    return acc;
  },
};
