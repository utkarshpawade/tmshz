"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Icons } from "@/components/icons";
import { CityMap } from "@/components/MapSlot";
import {
  ForecastChart, Gauge, Sparkline, StreamChart,
} from "@/components/charts";
import { Card, CountBadge, StatusBadge } from "@/components/ui";
import { api, type HeatmapHighRiskZone, type StatsResponse } from "@/lib/api";
import {
  EFFICIENCY_SERIES, EFFICIENCY_X_LABELS,
  FORECAST_SERIES, HIGH_RISK_ZONES, LIVE_VOLUME_SPARK,
  VOLUME_BUCKETS,
} from "@/lib/data";
import { useLive } from "@/lib/useLive";
import { toast } from "@/components/Toast";

const fadeIn = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [risk, setRisk] = useState<HeatmapHighRiskZone[] | null>(null);
  const [simBanner, setSimBanner] = useState<string | null>(null);
  const [simBusy, setSimBusy] = useState(false);
  const [now, setNow] = useState<string>(() => new Date().toLocaleTimeString());
  const { tick } = useLive();

  const refresh = () => {
    api.stats().then(setStats).catch(() => {});
    api.heatmap().then((h) => setRisk(h.high_risk_zones)).catch(() => {});
  };

  useEffect(() => {
    refresh();
    const t = setInterval(() => setNow(new Date().toLocaleTimeString()), 1000);
    const r = setInterval(refresh, 15000);
    return () => { clearInterval(t); clearInterval(r); };
  }, []);

  const simulateRush = async () => {
    setSimBusy(true);
    try {
      await api.simulateRush();
      setSimBanner("Friday rush scenario active — MG Road + NH-48 + IFFCO Chowk spiking now.");
      toast("Friday Rush simulation triggered", "success");
      refresh();
      setTimeout(refresh, 1500);
    } catch {
      toast("Backend unreachable — start FastAPI on :8000", "danger");
      setSimBanner("Could not reach the backend — start it with `uvicorn main:app --port 8000`.");
    } finally {
      setSimBusy(false);
      setTimeout(() => setSimBanner(null), 7000);
    }
  };

  const efficiency = stats?.operational_efficiency_pct ?? 78.3;
  const gaugeValue = Math.round(tick?.city_risk_score ?? stats?.city_risk_score ?? 72);
  const totalVehicles = stats?.total_vehicles_today != null
    ? stats.total_vehicles_today.toLocaleString()
    : "142,580";

  const riskZones = useMemo(
    () =>
      (risk && risk.length > 0)
        ? risk.map((r) => ({
            name: r.name,
            pct: Math.round(r.risk_score),
            eta: `${r.eta_peak_min} min`,
            dir: r.direction,
          }))
        : HIGH_RISK_ZONES,
    [risk],
  );

  const kpis = [
    { label: "Avg speed", value: stats?.avg_speed_kmh?.toFixed(0) ?? "26", unit: "km/h", trend: "+2%", good: true, icon: <Icons.Car size={14} /> },
    { label: "Active incidents", value: stats?.active_incidents?.toString() ?? "7", unit: "live", trend: "+1", good: false, icon: <Icons.Triangle size={14} /> },
    { label: "Open alerts", value: stats?.alert_count?.toString() ?? "23", unit: "today", trend: "-4", good: true, icon: <Icons.Bell size={14} /> },
    { label: "Monitored segments", value: stats?.monitored_segments?.toString() ?? "12", unit: "of 15", trend: "OK", good: true, icon: <Icons.Layer size={14} /> },
  ];

  return (
    <div className="page" data-screen-label="01 Dashboard">
      {/* HEADER */}
      <motion.div
        initial="hidden" animate="show" variants={fadeIn} transition={{ duration: 0.35 }}
        style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <div className="t-section">Command Center · Delhi NCR</div>
          <div className="t-hero" style={{ marginTop: 6 }}>Traffic Management</div>
          <div className="t-meta" style={{ marginTop: 10, maxWidth: 540 }}>
            Live ML-powered congestion forecast across 15 corridors, 4 highways, 12 junctions.
            Click any road on the map to query live traffic flow.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <span className="pill-mini"><Icons.Bus size={12} /> <strong>City:</strong> Delhi NCR</span>
            <span className="pill-mini"><Icons.Map size={12} /> Map View</span>
            <span className="pill-mini"><Icons.Cal size={12} /> {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <span className="t-label">Last sync · {now}</span>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--text-secondary)", fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} className="pulse-soft" />
            Stream healthy
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={refresh} style={{ height: 36, padding: "0 14px", fontSize: 12 }}>
              Refresh
            </button>
            <button
              className="btn btn-primary"
              onClick={simulateRush}
              disabled={simBusy}
              style={{ height: 36, padding: "0 14px", fontSize: 12 }}
            >
              <Icons.Zap size={12} /> {simBusy ? "Spiking…" : "Simulate Friday Rush"}
            </button>
          </div>
        </div>
      </motion.div>

      {simBanner && (
        <div
          className="anim-slidein"
          style={{
            padding: "12px 16px", marginBottom: 14,
            background: "var(--accent-soft)",
            border: "1px solid rgba(232,132,60,0.30)",
            borderRadius: 10,
            display: "flex", alignItems: "center", gap: 10,
            fontSize: 13, color: "var(--text-primary)",
          }}
        >
          <Icons.Zap size={14} />
          <span>{simBanner}</span>
        </div>
      )}

      {/* KPI ROW */}
      <div
        style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14,
          marginBottom: 18,
        }}
        className="dash-grid"
      >
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial="hidden" animate="show" variants={fadeIn}
            transition={{ duration: 0.35, delay: i * 0.06 }}
          >
            <Card>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="t-meta" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--bg-surface-2)", display: "grid", placeItems: "center", color: "var(--accent)" }}>
                    {k.icon}
                  </span>
                  {k.label}
                </span>
                <span style={{ fontSize: 11, color: k.good ? "var(--success)" : "var(--danger)" }}>{k.trend}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="t-stat tabular">{k.value}</span>
                <span className="t-meta">{k.unit}</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* MAP + RISK SECTION */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="t-section">Live Map</div>
            <div className="t-title" style={{ marginTop: 4 }}>Interactive Traffic Flow</div>
            <div className="t-meta" style={{ marginTop: 4 }}>Drag to pan · scroll to zoom · click any road for live speed</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="pill-mini"><Icons.Route size={12} /> Traffic flow live</span>
            <span className="pill-mini"><Icons.Triangle size={12} /> Incidents on</span>
          </div>
        </div>

        <div
          style={{
            display: "grid", gridTemplateColumns: "1fr 360px", gap: 14,
          }}
          className="dash-grid"
        >
          <div>
            <CityMap height={560} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
                <div>
                  <div className="t-label" style={{ marginBottom: 4 }}>Congestion Risk · Live</div>
                  <div className="t-meta" style={{ fontSize: 11 }}>City-wide composite score</div>
                </div>
              </div>
              <div style={{ display: "grid", placeItems: "center" }}>
                <Gauge value={gaugeValue} />
              </div>
            </Card>
            <Card>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div className="t-title">Top High-Risk Zones</div>
                <span className="t-label">Next 60 min</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {riskZones.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <span
                        style={{
                          width: 22, height: 22, borderRadius: 6,
                          display: "grid", placeItems: "center",
                          background: i === 0 ? "var(--accent-soft)" : "var(--bg-surface-2)",
                          color: i === 0 ? "var(--accent)" : "var(--text-tertiary)",
                          fontSize: 10, fontWeight: 600,
                        }}
                      >{i + 1}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {r.name}
                        </div>
                        <div className="t-tick">peaks in {r.eta}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span className="tabular" style={{
                        fontSize: 14,
                        color: r.pct >= 80 ? "var(--danger)" : r.pct >= 70 ? "var(--accent)" : "var(--warning)",
                      }}>{r.pct}%</span>
                      <span style={{
                        marginLeft: 4, fontSize: 11,
                        color: r.dir === "rising" ? "var(--danger)" : "var(--success)",
                      }}>{r.dir === "rising" ? "▲" : "▼"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* OPERATIONAL CHARTS */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="t-section">Operations</div>
            <div className="t-title" style={{ marginTop: 4 }}>Efficiency & Volume</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.5fr 1fr", gap: 14 }} className="dash-grid">
          <Card>
            <div className="t-meta" style={{ marginBottom: 6 }}>Operational Efficiency</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span className="t-stat tabular">{efficiency.toFixed(1)}</span>
              <span className="t-meta">%</span>
            </div>
            <div className="t-tick" style={{ marginTop: 4 }}>Target &gt;80%</div>
            <div style={{ marginTop: 12 }}>
              <StreamChart data={EFFICIENCY_SERIES} target={80} xLabels={EFFICIENCY_X_LABELS} height={140} />
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 }}>
              <div>
                <div className="t-meta">Live Vehicle Volume</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                  <span className="t-stat tabular">{totalVehicles}</span>
                  <span className="t-meta">today</span>
                </div>
              </div>
              <span className="pill-mini"><Icons.Sparkles size={11} /> Live</span>
            </div>
            <Sparkline data={LIVE_VOLUME_SPARK} color="var(--accent)" height={60} />
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${VOLUME_BUCKETS.length}, 1fr)`, gap: 6, marginTop: 12 }}>
              {VOLUME_BUCKETS.map((b, i) => (
                <div key={i} style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 6 }}>
                  <div className="tabular" style={{ fontSize: 12, color: "var(--text-primary)" }}>{b.lab}</div>
                  <div style={{ fontSize: 10, color: b.delta === "0%" ? "var(--text-tertiary)" : b.good ? "var(--success)" : "var(--danger)" }}>{b.delta}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="t-meta" style={{ marginBottom: 6 }}>60-min Forecast</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span className="t-stat tabular" style={{ color: "var(--accent)" }}>87</span>
              <span className="t-meta">% peak risk</span>
            </div>
            <div className="t-tick" style={{ marginTop: 4 }}>XGBoost · 45-min lookahead</div>
            <div style={{ marginTop: 12 }}>
              <ForecastChart data={FORECAST_SERIES} height={140} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span className="t-tick">now</span>
              <span className="t-tick">+30m</span>
              <span className="t-tick">+60m</span>
            </div>
          </Card>
        </div>
      </div>

      {/* SEGMENT CARDS */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="t-section">Corridors</div>
            <div className="t-title" style={{ marginTop: 4 }}>Live Sensor Network</div>
          </div>
          <button className="btn btn-ghost" style={{ height: 32, padding: "0 12px", fontSize: 12 }}
            onClick={() => toast("Loading segment details for all 15 corridors")}>
            View all 15
          </button>
        </div>
        <SegmentGrid />
      </div>

      {/* WARNINGS */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="t-section">Live Warnings</div>
            <div className="t-title" style={{ marginTop: 4 }}>Capacity & Schedule Deviations</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="dash-grid">
          <WarningPanel />
          <SchedulePanel />
        </div>
      </div>
    </div>
  );
}

function SegmentGrid() {
  const [segs, setSegs] = useState<Array<{ id: number; name: string; segment_type: string; lanes: number; speed_limit_kmh: number }>>([]);
  useEffect(() => {
    fetch("/api/segments", { cache: "no-store" }).then((r) => r.json()).then(setSegs).catch(() => setSegs([
      { id: 1, name: "MG Road Corridor", segment_type: "corridor", lanes: 4, speed_limit_kmh: 50 },
      { id: 2, name: "Ring Road North",  segment_type: "arterial", lanes: 3, speed_limit_kmh: 60 },
      { id: 3, name: "NH-48 Gurgaon",    segment_type: "highway",  lanes: 6, speed_limit_kmh: 80 },
      { id: 4, name: "DND Flyway",       segment_type: "highway",  lanes: 4, speed_limit_kmh: 70 },
      { id: 5, name: "Noida Expy",       segment_type: "highway",  lanes: 6, speed_limit_kmh: 80 },
      { id: 6, name: "IFFCO Chowk Jn",   segment_type: "junction", lanes: 4, speed_limit_kmh: 40 },
    ]));
  }, []);

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}
    >
      {segs.slice(0, 8).map((s, i) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.04 }}
        >
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="t-title" style={{ marginBottom: 2 }}>{s.name}</div>
              <StatusBadge kind="online" label="Live" />
            </div>
            <div className="t-tick" style={{ marginTop: 4 }}>{s.segment_type} · {s.lanes} lanes · {s.speed_limit_kmh} km/h limit</div>
            <div style={{ marginTop: 12 }}>
              <Sparkline data={genSeed(s.id)} color={i % 3 === 0 ? "var(--accent)" : i % 3 === 1 ? "var(--success)" : "var(--warning)"} height={36} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span className="t-tick">06AM</span>
              <span className="t-tick">11PM</span>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function WarningPanel() {
  return (
    <div
      className="card"
      style={{ borderColor: "rgba(219,75,69,0.22)", background: "var(--danger-panel)" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="tri" />
          <span className="t-title">Capacity Warning</span>
        </span>
        <CountBadge n={2} />
      </div>
      <div style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 6 }}>~180 vehicles backing up</div>
      <div className="t-tick">4m ago</div>
      <div style={{ height: 1, background: "rgba(219,75,69,0.18)", margin: "14px 0" }} />
      <div className="t-label" style={{ marginBottom: 8 }}>Affected segments</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ borderLeft: "2px solid var(--text-primary)", paddingLeft: 10 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-primary)" }}>Central Junction</div>
          <div className="t-tick">115 vehicles queued</div>
        </div>
        <div style={{ borderLeft: "2px solid var(--text-tertiary)", paddingLeft: 10 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-primary)" }}>University Flyover</div>
          <div className="t-tick">65 vehicles queued</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(219,75,69,0.18)" }}>
        <Icons.Sparkles size={12} />
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Recommend: <span style={{ color: "var(--text-primary)" }}>Dispatch traffic marshal</span>
        </span>
      </div>
      <button className="btn btn-ghost" style={{ width: "100%", marginTop: 14 }}
        onClick={() => toast("Dispatched marshal — ETA 6 min")}>
        Dispatch now
      </button>
    </div>
  );
}

function SchedulePanel() {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icons.Cal size={14} />
          <span className="t-title">Schedule Deviation · Route 14</span>
        </span>
        <CountBadge n={1} />
      </div>
      <div style={{ fontSize: 13, color: "var(--text-primary)" }}>NH-48 running 15 mins above predicted load</div>
      <div className="t-tick" style={{ marginTop: 4 }}>12m ago</div>
      <div style={{ marginTop: 14 }}>
        <Sparkline data={[60, 64, 68, 72, 75, 79, 82, 80, 78, 76, 74, 72]} color="var(--warning)" height={50} />
      </div>
      <button className="btn btn-ghost" style={{ width: "100%", marginTop: 14 }}
        onClick={() => toast("Schedule adjusted — Route 14 ETA padded by 6 min")}>
        Re-balance schedule
      </button>
    </Card>
  );
}

function genSeed(id: number): number[] {
  const out: number[] = [];
  let v = 50 + (id * 7) % 40;
  for (let i = 0; i < 30; i++) {
    v += ((id * (i + 1)) % 11) - 5;
    if (v < 20) v = 20;
    if (v > 95) v = 95;
    out.push(v);
  }
  return out;
}
