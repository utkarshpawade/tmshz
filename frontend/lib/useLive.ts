// Subscribes to the backend WebSocket /ws/live-updates and exposes the
// latest tick. Reconnects with light backoff on disconnect.
"use client";

import { useEffect, useRef, useState } from "react";

export interface LiveSegment {
  segment_id: number;
  name: string;
  occupancy_pct: number;
  avg_speed_kmh: number;
  congestion_label: "Low" | "Medium" | "High" | "Critical";
  delta: number;
}

export interface LiveTick {
  type: "congestion_update";
  ts: string;
  city_risk_score: number;
  segments: LiveSegment[];
}

function defaultWsUrl(): string {
  if (typeof window === "undefined") return "";
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL;
  if (fromEnv) return `${fromEnv}/ws/live-updates`;
  // same-origin fallback so the demo works without the env var
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.hostname}:8000/ws/live-updates`;
}

export function useLive() {
  const [tick, setTick] = useState<LiveTick | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      const url = defaultWsUrl();
      if (!url) return;
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => {
        setConnected(true);
        retry = 0;
      };
      ws.onmessage = (e) => {
        try { setTick(JSON.parse(e.data) as LiveTick); } catch { /* ignore */ }
      };
      ws.onclose = () => {
        setConnected(false);
        if (cancelled) return;
        retry = Math.min(retry + 1, 6);
        const delay = 1000 * 2 ** retry;
        timer = setTimeout(connect, delay);
      };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      wsRef.current?.close();
    };
  }, []);

  return { tick, connected };
}
