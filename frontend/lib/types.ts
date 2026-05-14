// Shared TypeScript types — match backend Pydantic schemas.

export type CongestionLabel = "Low" | "Medium" | "High" | "Critical";
export type Severity = "low" | "medium" | "high" | "critical";
export type TrafficLevel = "low" | "medium" | "high";
export type RouteType = "fastest" | "economical" | "ai_recommended";
export type VehicleType = "ambulance" | "fire" | "police";

export interface Segment {
  id: string;
  name: string;
  code: string;
  ts: string;
  status: "online" | "offline";
  signal: string;
  net: string;
  seed: number;
  active?: boolean;
}

export interface RiskZone {
  name: string;
  pct: number;
  eta: string;
  dir: "rising" | "falling";
}

export interface VolumeBucket {
  lab: string;
  delta: string;
  good: boolean;
}

export interface TollPlaza {
  name: string;
  segment: string;
  cost: number;
}

export interface RouteOption {
  id: string;
  title: string;
  route_type: RouteType;
  tag?: string;
  via: string;
  eta_minutes: number;
  eta_delta: string;
  toll_inr: number;
  fuel_inr: number;
  distance_km: number;
  traffic_level: TrafficLevel;
  toll_plazas: TollPlaza[];
  reason?: string | null;
  score?: number;
  polyline?: number[][];
}

export interface Alert {
  id: number | string;
  level: Severity;
  road: string;
  msg: string;
  when: string;
}

export interface HistoryAlert {
  date: string;
  segment: string;
  level: Severity;
  msg: string;
  sent: string;
}

export interface SignalJunction {
  name: string;
  cmd: string;
  offsetSec: string;
  state: "cleared" | "staged" | "pending";
}

export interface ChatMessage {
  id: number;
  who: "user" | "bot";
  text: string;
}
