"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { CityMap } from "@/components/MapSlot";
import { Card, TrafficLevelBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { ROUTES as MOCK_ROUTES } from "@/lib/data";
import type { RouteOption } from "@/lib/types";

export default function RoutesPage() {
  const [from, setFrom] = useState("Connaught Place, Delhi");
  const [to, setTo] = useState("Cyber City, Gurgaon");
  const [selected, setSelected] = useState("ai");
  const [routes, setRoutes] = useState<RouteOption[]>(MOCK_ROUTES);

  const fetchRoutes = (origin: string, destination: string) => {
    api.routes(origin, destination)
      .then((res) => {
        const data = res as { routes?: RouteOption[] };
        if (data.routes && data.routes.length > 0) setRoutes(data.routes);
      })
      .catch(() => {}); // keep mock on error
  };

  useEffect(() => { fetchRoutes(from, to); /* initial */ /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const active = routes.find((r) => r.id === selected) ?? routes[0];

  return (
    <div
      data-screen-label="02 Routes"
      className="screen scroll"
      style={{ padding: "14px 16px 16px" }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "4px 4px 18px" }}>
        <div>
          <div className="t-hero">Route Planner</div>
          <div className="t-meta" style={{ marginTop: 10 }}>
            Compare three options side by side — toll, fuel, and ETA breakdowns updated against live conditions.
          </div>
        </div>
      </div>

      {/* Origin / destination */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
        <div className="search" style={{ width: 280 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }} />
          <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" />
        </div>
        <div style={{ color: "var(--text-tertiary)" }}><Icons.ArrowR size={14} /></div>
        <div className="search" style={{ width: 280 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" />
        </div>
        <button className="btn btn-primary" onClick={() => fetchRoutes(from, to)}>
          <Icons.Route size={14} /> Compare Routes
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => { setFrom(to); setTo(from); fetchRoutes(to, from); }}
        >Swap</button>
      </div>

      <div
        className="routes-grid"
        style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginBottom: 14 }}
      >
        <div
          className="route-cards"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
        >
          {routes.map((r) => {
            const isActive = r.id === selected;
            const ai = r.id === "ai";
            return (
              <div
                key={r.id}
                onClick={() => setSelected(r.id)}
                className="card"
                style={{
                  cursor: "pointer",
                  background: ai ? "linear-gradient(180deg, rgba(232,132,60,0.06), var(--bg-surface) 65%)" : undefined,
                  borderColor: isActive ? "var(--border-strong)" : ai ? "rgba(232,132,60,0.30)" : undefined,
                  transition: "border-color .15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
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
                <div className="t-tick" style={{ marginBottom: 10 }}>{r.via}</div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span className="t-stat tabular" style={{ color: ai ? "var(--accent)" : "var(--text-primary)" }}>
                    {r.eta_minutes}
                  </span>
                  <span className="t-meta">min ETA</span>
                </div>
                <div style={{
                  fontSize: 11,
                  color: r.eta_delta.startsWith("−") ? "var(--success)" : "var(--text-secondary)",
                  marginTop: 2,
                }}>{r.eta_delta}</div>

                <div style={{
                  display: "flex", justifyContent: "space-between",
                  marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-subtle)",
                }}>
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
                  <button className="btn btn-ghost" style={{ height: 32, padding: "0 12px", fontSize: 12 }}>
                    Directions <Icons.ArrowR size={12} />
                  </button>
                </div>

                {ai && r.reason && (
                  <div style={{
                    marginTop: 12, padding: "10px 12px",
                    background: "var(--accent-soft)", borderRadius: 8,
                    border: "1px solid rgba(232,132,60,0.20)",
                    display: "flex", gap: 8, alignItems: "flex-start",
                  }}>
                    <Icons.Sparkles size={12} />
                    <span style={{ fontSize: 11.5, color: "var(--text-primary)", lineHeight: 1.4 }}>{r.reason}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Map panel — transparent slot, global Leaflet map shows through */}
        <div className="card map-slot-card" style={{ minHeight: 360 }}>
          <div style={{ position: "relative", height: "100%", minHeight: 360, pointerEvents: "none" }}>
            <CityMap showLegend={false} />
            <div style={{
              position: "absolute", left: 18, top: 18, padding: "10px 12px",
              background: "var(--bg-glass)", backdropFilter: "blur(14px)",
              border: "1px solid var(--border-subtle)", borderRadius: 10,
              display: "flex", flexDirection: "column", gap: 8, fontSize: 11,
              pointerEvents: "auto",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 20, height: 2, background: "var(--danger)", borderRadius: 2 }} /> Fastest — 38 min
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 20, height: 2, background: "var(--warning)", borderRadius: 2 }} /> Economical — 52 min
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 20, height: 2, background: "var(--accent)", borderRadius: 2 }} /> AI Recommended — 41 min
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toll plaza breakdown */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div className="t-title">Toll Plaza Breakdown</div>
            <div className="t-tick" style={{ marginTop: 4 }}>For selected route · {active.title}</div>
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

        <div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
            <span className="t-label">Plaza</span>
            <span className="t-label">Segment</span>
            <span className="t-label" style={{ textAlign: "right" }}>Cost</span>
          </div>
          {active.toll_plazas.map((p, i) => (
            <div
              key={i}
              style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", padding: "14px 0", borderBottom: "1px solid var(--border-subtle)", alignItems: "center" }}
            >
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
            <span style={{ fontSize: 18, color: "var(--accent)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              ₹{active.toll_inr}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
