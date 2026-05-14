// Browser-side API client. Talks to the Next.js BFF (/api/*) which proxies
// to FastAPI. Every function returns parsed JSON or throws.

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

  routes: (origin?: string, destination?: string) => {
    const qs = new URLSearchParams();
    if (origin) qs.set("origin", origin);
    if (destination) qs.set("destination", destination);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return fetch(`${BFF}/routes${suffix}`, { cache: "no-store" }).then(j);
  },

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

  // Streams the chat reply as text/plain chunks.
  chatStream: async (
    message: string,
    onChunk: (chunk: string, accumulated: string) => void,
  ): Promise<string> => {
    const r = await fetch(`${BFF}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
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
