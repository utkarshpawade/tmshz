"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icons } from "@/components/icons";
import { CityMap } from "@/components/MapSlot";
import { Card, TrafficLevelBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { ROUTES as MOCK_ROUTES } from "@/lib/data";
import type { RouteOption } from "@/lib/types";
import { toast } from "@/components/Toast";

const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function RoutesPage() {
  const [from, setFrom] = useState("Connaught Place, Delhi");
  const [to, setTo] = useState("Cyber City, Gurgaon");
  const [selected, setSelected] = useState("ai");
  const [routes, setRoutes] = useState<RouteOption[]>(MOCK_ROUTES);
  const [busy, setBusy] = useState(false);

  const fetchRoutes = (origin: string, destination: string) => {
    setBusy(true);
    api.routes(origin, destination)
      .then((res) => {
        const data = res as { routes?: RouteOption[] };
        if (data.routes && data.routes.length > 0) setRoutes(data.routes);
        toast(`Routes compared — ${origin.split(",")[0]} → ${destination.split(",")[0]}`, "success");
      })
      .catch(() => toast("Backend unreachable — using cached routes", "danger"))
      .finally(() => setBusy(false));
  };

  useEffect(() => { fetchRoutes(from, to); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const active = routes.find((r) => r.id === selected) ?? routes[0];

  return (
    <div className="page" data-screen-label="02 Routes">
      <motion.div
        initial="hidden" animate="show" variants={fade} transition={{ duration: 0.35 }}
        style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <div className="t-section">Routes</div>
          <div className="t-hero" style={{ marginTop: 6 }}>Route Planner</div>
          <div className="t-meta" style={{ marginTop: 10, maxWidth: 600 }}>
            Compare three options side by side — toll, fuel, and ETA breakdowns updated against live conditions
            from TomTom traffic flow and your ML model.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="pill-mini"><Icons.Sparkles size={11} /> AI scoring active</span>
        </div>
      </motion.div>

      {/* Origin/destination form */}
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div className="search" style={{ width: 320 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }} />
            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" />
          </div>
          <div style={{ color: "var(--text-tertiary)" }}><Icons.ArrowR size={14} /></div>
          <div className="search" style={{ width: 320 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" />
          </div>
          <button className="btn btn-primary" onClick={() => fetchRoutes(from, to)} disabled={busy}>
            <Icons.Route size={14} /> {busy ? "Comparing…" : "Compare Routes"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => { setFrom(to); setTo(from); fetchRoutes(to, from); }}
          >Swap</button>
        </div>
      </Card>

      {/* Route cards */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="t-section">Comparison</div>
            <div className="t-title" style={{ marginTop: 4 }}>3 Routes Scored</div>
            <div className="t-meta" style={{ marginTop: 4 }}>AI score = congestion × 0.5 + toll × 0.3 + ETA × 0.2</div>
          </div>
        </div>
        <div className="route-cards" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {routes.map((r, i) => {
            const isActive = r.id === selected;
            const ai = r.id === "ai";
            return (
              <motion.div
                key={r.id}
                initial="hidden" animate="show" variants={fade}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                onClick={() => setSelected(r.id)}
                className={`card card-interactive ${ai ? "card-glow" : ""}`}
                style={{
                  background: ai ? "linear-gradient(180deg, rgba(232,132,60,0.06), var(--bg-surface) 65%)" : undefined,
                  borderColor: isActive ? "var(--border-strong)" : ai ? "rgba(232,132,60,0.30)" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span className="t-title">{r.title}</span>
                  {r.tag && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "3px 8px", borderRadius: 9999,
                      background: "var(--accent)", color: "#0C0C0D",
                      fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
                    }}>
                      <Icons.Sparkles size={10} /> {r.tag}
                    </span>
                  )}
                </div>
                <div className="t-tick" style={{ marginBottom: 12 }}>{r.via}</div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span className="t-stat tabular" style={{ color: ai ? "var(--accent)" : "var(--text-primary)" }}>
                    {r.eta_minutes}
                  </span>
                  <span className="t-meta">min ETA</span>
                </div>
                <div style={{ fontSize: 11, color: r.eta_delta.startsWith("−") ? "var(--success)" : "var(--text-secondary)", marginTop: 2 }}>
                  {r.eta_delta}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
                  <div>
                    <div className="t-label">Toll</div>
                    <div style={{ fontSize: 16, color: "var(--text-primary)", marginTop: 2 }}>
                      {r.toll_inr === 0 ? "₹0" : `₹${r.toll_inr}`}
                    </div>
                  </div>
                  <div>
                    <div className="t-label">Fuel est.</div>
                    <div style={{ fontSize: 16, color: "var(--text-primary)", marginTop: 2 }}>₹{r.fuel_inr}</div>
                  </div>
                  <div>
                    <div className="t-label">Distance</div>
                    <div style={{ fontSize: 16, color: "var(--text-primary)", marginTop: 2 }}>{r.distance_km} km</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                  <TrafficLevelBadge level={r.traffic_level} />
                  <button
                    className="btn btn-ghost"
                    style={{ height: 32, padding: "0 12px", fontSize: 12 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=driving`;
                      window.open(url, "_blank", "noopener");
                    }}
                  >
                    Directions <Icons.ArrowR size={12} />
                  </button>
                </div>

                {ai && r.reason && (
                  <div style={{ marginTop: 14, padding: "10px 12px", background: "var(--accent-soft)", borderRadius: 8, border: "1px solid rgba(232,132,60,0.20)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <Icons.Sparkles size={12} />
                    <span style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4 }}>{r.reason}</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Live map preview */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="t-section">Map</div>
            <div className="t-title" style={{ marginTop: 4 }}>Live Traffic on Selected Route</div>
            <div className="t-meta" style={{ marginTop: 4 }}>Toggle layers to compare flow vs incidents</div>
          </div>
        </div>
        <CityMap height={480} />
      </div>

      {/* Toll breakdown */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="t-section">Costs</div>
            <div className="t-title" style={{ marginTop: 4 }}>Toll Plaza Breakdown · {active.title}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {routes.map((r) => (
              <button
                key={r.id}
                className={`pill ${r.id === selected ? "is-active" : ""}`}
                onClick={() => setSelected(r.id)}
              >{r.title}</button>
            ))}
          </div>
        </div>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
            <span className="t-label">Plaza</span>
            <span className="t-label">Segment</span>
            <span className="t-label" style={{ textAlign: "right" }}>Cost</span>
          </div>
          {active.toll_plazas.map((p, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", padding: "14px 0", borderBottom: "1px solid var(--border-subtle)", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{p.name}</span>
              <span className="t-meta">{p.segment}</span>
              <span style={{ fontSize: 14, color: "var(--text-primary)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {p.cost === 0 ? "—" : `₹${p.cost}`}
              </span>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", padding: "14px 0 4px" }}>
            <span className="t-label">Total</span>
            <span />
            <span style={{ fontSize: 20, color: "var(--accent)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              ₹{active.toll_inr}
            </span>
          </div>
        </Card>
      </div>

      {/* Detail breakdown */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="t-section">Detail</div>
            <div className="t-title" style={{ marginTop: 4 }}>Segment-by-segment</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="routes-grid">
          <Card>
            <div className="t-title" style={{ marginBottom: 10 }}>What you save with {active.title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <SaveRow label="Time vs slowest" v={`${Math.max(0, 52 - active.eta_minutes)} min`} c="var(--success)" />
              <SaveRow label="Toll vs Fastest"  v={active.toll_inr <= 245 ? `₹${245 - active.toll_inr}` : `−₹${active.toll_inr - 245}`} c="var(--accent)" />
              <SaveRow label="Fuel"              v={`₹${active.fuel_inr}`} c="var(--text-primary)" />
              <SaveRow label="Distance"          v={`${active.distance_km} km`} c="var(--text-primary)" />
            </div>
          </Card>
          <Card>
            <div className="t-title" style={{ marginBottom: 10 }}>Traffic conditions</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7 }}>
              <li>IFFCO Chowk averaging 14 km/h — surge expected next 20 min</li>
              <li>NH-48 KM 18 incident cleared 4 min ago</li>
              <li>Inner Ring → Dhaula Kuan flowing freely (38 km/h)</li>
              <li>Weather: clear · no rain advisory · no fog</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SaveRow({ label, v, c }: { label: string; v: string; c: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <span className="t-meta">{label}</span>
      <span style={{ fontSize: 14, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</span>
    </div>
  );
}
