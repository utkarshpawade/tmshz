"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { CityMap } from "@/components/MapSlot";
import { MiniMap } from "@/components/MiniMap";
import {
  ForecastChart, Gauge, Sparkline, StreamChart,
} from "@/components/charts";
import {
  Card, CountBadge, StatusBadge,
} from "@/components/ui";
import { api, type HeatmapHighRiskZone, type StatsResponse } from "@/lib/api";
import {
  DASHBOARD_SEGMENTS, EFFICIENCY_SERIES, EFFICIENCY_X_LABELS,
  FORECAST_SERIES, HIGH_RISK_ZONES, LIVE_VOLUME_SPARK,
  VARIANCE_ROWS, VOLUME_BUCKETS,
} from "@/lib/data";
import { useLive } from "@/lib/useLive";

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [risk, setRisk] = useState<HeatmapHighRiskZone[] | null>(null);
  const [simBanner, setSimBanner] = useState<string | null>(null);
  const [simBusy, setSimBusy] = useState(false);
  const { tick } = useLive();

  const refresh = () => {
    api.stats().then(setStats).catch(() => {});
    api.heatmap().then((h) => setRisk(h.high_risk_zones)).catch(() => {});
  };

  useEffect(() => {
    refresh();
  }, []);

  const simulateRush = async () => {
    setSimBusy(true);
    try {
      await api.simulateRush();
      setSimBanner("Friday rush scenario active — MG Road · NH-48 · IFFCO Chowk spiking now. Watch the gauge and the alert feed.");
      refresh();                       // pick up the new readings + alert immediately
      setTimeout(refresh, 1500);       // and once more once the spike settles
    } catch {
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
  const riskZones = (risk && risk.length > 0)
    ? risk.map((r) => ({
        name: r.name,
        pct: Math.round(r.risk_score),
        eta: `${r.eta_peak_min} min`,
        dir: r.direction,
      }))
    : HIGH_RISK_ZONES;
  return (
    <div
      data-screen-label="01 Dashboard"
      className="screen"
      style={{ padding: "14px 16px 16px", gap: 12, display: "flex", flexDirection: "column" }}
    >
      {/* Title block */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "4px 4px 0" }}>
        <div>
          <div className="t-hero">Traffic Management</div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <span className="pill-mini"><Icons.Bus size={12} /> <strong>City:</strong> Delhi NCR <Icons.Chevron size={11} /></span>
            <span className="pill-mini"><Icons.Map size={12} /> Map View <Icons.Chevron size={11} /></span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <span className="t-label">Last sync · 1 sec ago</span>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--text-secondary)", fontSize: 12 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }} className="pulse-soft" />
            Stream healthy
          </span>
          <button
            className="btn btn-primary"
            onClick={simulateRush}
            disabled={simBusy}
            style={{ height: 32, padding: "0 12px", fontSize: 12 }}
            title="Spike MG Road + NH-48 + IFFCO Chowk and fire a critical alert"
          >
            <Icons.Zap size={12} /> {simBusy ? "Spiking…" : "Simulate Friday Rush"}
          </button>
        </div>
      </div>

      {/* Friday-rush demo banner */}
      {simBanner && (
        <div
          className="anim-slidein"
          style={{
            margin: "0 4px",
            padding: "10px 14px",
            background: "var(--accent-soft)",
            border: "1px solid rgba(232,132,60,0.30)",
            borderRadius: 10,
            display: "flex", alignItems: "center", gap: 10,
            fontSize: 12.5, color: "var(--text-primary)",
          }}
        >
          <Icons.Zap size={14} />
          <span>{simBanner}</span>
        </div>
      )}

      {/* Main grid: rail | map | warning */}
      <div
        className="dash-grid"
        style={{ display: "grid", gridTemplateColumns: "320px 1fr 320px", gap: 12, flex: 1, minHeight: 0 }}
      >
        {/* ----- LEFT RAIL ----- */}
        <div className="scroll col" style={{ gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div className="pill-mini" style={{ justifyContent: "center" }}><strong>24</strong> Highways</div>
            <div className="pill-mini" style={{ justifyContent: "center" }}><strong>100</strong> Arterials</div>
            <div className="pill-mini" style={{ justifyContent: "center" }}><strong>12</strong> Junctions</div>
            <div className="pill-mini" style={{ justifyContent: "center" }}><strong>13</strong> Corridors</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="card card-tight" style={{ padding: "14px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: "rgba(95,185,95,0.18)", display: "grid", placeItems: "center",
                  color: "var(--success)",
                }}><Icons.Check size={10} /></span>
                <span className="t-meta">Monitored</span>
              </div>
              <div className="t-stat-sm tabular">{stats?.monitored_segments ?? 12}</div>
            </div>
            <div className="card card-tight" style={{ padding: "14px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span className="tri" />
                <span className="t-meta">Sensor Offline</span>
              </div>
              <div className="t-stat-sm tabular">{String(stats?.sensors_offline ?? 4).padStart(2, "0")}</div>
            </div>
          </div>

          {/* Operational Efficiency */}
          <Card>
            <div className="t-meta" style={{ marginBottom: 8 }}>Operational Efficiency</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <span className="t-stat tabular">{efficiency.toFixed(1)}</span>
              <span className="t-meta">%</span>
            </div>
            <div className="t-label" style={{ marginTop: 6 }}>
              Target: <span style={{ color: "var(--text-secondary)" }}>&gt;80%</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <StreamChart data={EFFICIENCY_SERIES} target={80} xLabels={EFFICIENCY_X_LABELS} />
            </div>
          </Card>

          {/* Segment cards */}
          {DASHBOARD_SEGMENTS.map((s, idx) => (
            <Card
              key={s.id}
              className="anim-slidein"
              style={{
                borderColor: s.active ? "var(--border-strong)" : undefined,
                animationDelay: `${idx * 40}ms`,
              }}
            >
              <div className="t-title" style={{ marginBottom: 2 }}>{s.name}</div>
              <div className="t-label" style={{ color: "var(--text-tertiary)" }}>{s.ts}</div>

              <div style={{ marginTop: 12, position: "relative" }}>
                <div
                  className="card-nested"
                  style={{ padding: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: 13 }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: "var(--bg-surface)", display: "grid", placeItems: "center",
                      color: "var(--accent)", fontSize: 10, fontWeight: 500,
                    }}>L</span>
                    <span style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{s.code}</span>
                  </span>
                  <Icons.Bus size={16} />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <StatusBadge kind={s.status} />
                <span style={{ display: "inline-flex", gap: 10, color: "var(--text-tertiary)", fontSize: 11, alignItems: "center" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icons.Signal size={11} />{s.signal}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icons.Signal size={11} />{s.net}</span>
                </span>
              </div>

              <div style={{ marginTop: 10 }}>
                <MiniMap seed={s.seed} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span className="t-tick">06AM</span>
                <span className="t-tick">11PM</span>
              </div>
            </Card>
          ))}
        </div>

        {/* ----- CENTER MAP ----- */}
        <div className="col" style={{ gap: 12, minHeight: 0 }}>
          <div style={{ flex: 1, minHeight: 0, position: "relative", pointerEvents: "none" }}>
            <CityMap />
            <div style={{ position: "absolute", left: 18, top: 18, display: "flex", gap: 8, pointerEvents: "auto" }}>
              <span className="pill-mini" style={{ background: "rgba(20,20,22,0.72)", backdropFilter: "blur(12px)" }}>
                <Icons.Route size={12} /> <strong>Corridor MG-7</strong> <Icons.Chevron size={11} />
              </span>
              <span className="pill-mini" style={{ background: "rgba(20,20,22,0.72)", backdropFilter: "blur(12px)" }}>
                <Icons.Layer size={12} /> Heatmap <Icons.Chevron size={11} />
              </span>
            </div>

            <div className="glass" style={{ position: "absolute", right: 14, top: 14, padding: "12px 14px", width: 280, pointerEvents: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span className="t-title" style={{ fontSize: 13 }}>Top High-Risk Zones</span>
                <span className="t-label">Next 60 min</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {riskZones.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: 4,
                        display: "grid", placeItems: "center",
                        background: i === 0 ? "var(--accent-soft)" : "var(--bg-surface-2)",
                        color: i === 0 ? "var(--accent)" : "var(--text-tertiary)",
                        fontSize: 10,
                      }}>{i + 1}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {r.name}
                        </div>
                        <div className="t-tick">peaks in {r.eta}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span className="tabular" style={{
                        fontSize: 13,
                        color: r.pct >= 80 ? "var(--danger)" : r.pct >= 70 ? "var(--accent)" : "var(--warning)",
                      }}>{r.pct}</span>
                      <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>%</span>
                      <span style={{
                        marginLeft: 4, fontSize: 10,
                        color: r.dir === "rising" ? "var(--danger)" : "var(--success)",
                      }}>{r.dir === "rising" ? "▲" : "▼"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ----- RIGHT WARNING PANEL ----- */}
        <div className="col" style={{ gap: 12, minHeight: 0 }}>
          <div style={{
            background: "var(--danger-panel)",
            border: "1px solid rgba(219,75,69,0.22)",
            borderRadius: "var(--r-card)",
            overflow: "hidden",
            display: "flex", flexDirection: "column",
            flex: 1, minHeight: 0,
          }}>
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(219,75,69,0.15)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="tri" />
                <span className="t-title">Warning</span>
              </div>
              <Icons.Chevron size={14} dir="up" />
            </div>

            <div className="scroll" style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Capacity Issues */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0 10px", color: "var(--text-secondary)", fontSize: 12.5 }}>
                  <Icons.Layer size={12} /> Capacity Issues <span style={{ color: "var(--text-tertiary)" }}>(2 corridors)</span>
                </div>
                <div className="anim-slidein" style={{
                  background: "var(--danger-panel-strong)",
                  border: "1px solid rgba(219,75,69,0.18)",
                  borderRadius: 10, padding: "12px 12px",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <CountBadge n={2} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 3 }}>~180 vehicles backing up</div>
                      <div className="t-tick">4m ago</div>
                    </div>
                    <Icons.Chevron size={12} dir="up" />
                  </div>
                  <div style={{ height: 1, background: "rgba(219,75,69,0.16)", margin: "12px 0 10px" }} />
                  <div className="t-label" style={{ marginBottom: 8 }}>Affected segments</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ borderLeft: "2px solid var(--text-primary)", paddingLeft: 10 }}>
                      <div style={{ fontSize: 12.5, color: "var(--text-primary)" }}>Central Junction</div>
                      <div className="t-tick">115 vehicles queued</div>
                    </div>
                    <div style={{ borderLeft: "2px solid var(--text-tertiary)", paddingLeft: 10 }}>
                      <div style={{ fontSize: 12.5, color: "var(--text-primary)" }}>University Flyover</div>
                      <div className="t-tick">65 vehicles queued</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(219,75,69,0.16)" }}>
                    <Icons.Sparkles size={12} />
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      Recommend: <span style={{ color: "var(--text-primary)" }}>Dispatch traffic marshal</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Schedule Deviations */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0 10px", color: "var(--text-secondary)", fontSize: 12.5 }}>
                  <Icons.Cal size={12} /> Schedule Deviations <span style={{ color: "var(--text-tertiary)" }}>(Route 14)</span>
                </div>
                <div className="anim-slidein" style={{
                  background: "var(--danger-panel-strong)",
                  border: "1px solid rgba(219,75,69,0.18)",
                  borderRadius: 10, padding: "12px 12px",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <CountBadge n={1} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "var(--text-primary)" }}>NH-48 running 15 mins above predicted load</div>
                      <div className="t-tick" style={{ marginTop: 3 }}>12m ago</div>
                    </div>
                    <Icons.Chevron size={12} />
                  </div>
                </div>
              </div>

              {/* Forecast */}
              <Card style={{ background: "var(--bg-surface)", marginTop: 4 }}>
                <div className="t-meta" style={{ marginBottom: 4 }}>60-min Forecast</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span className="t-stat-sm tabular" style={{ color: "var(--accent)" }}>87</span>
                  <span className="t-meta">% peak risk</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <ForecastChart data={FORECAST_SERIES} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span className="t-tick">now</span>
                  <span className="t-tick">+30m</span>
                  <span className="t-tick">+60m</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* ----- BOTTOM STRIP ----- */}
      <div
        className="dash-bottom"
        style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 0.9fr", gap: 12 }}
      >
        <Card>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div className="t-meta">Prediction Variance</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                <span className="t-stat tabular">± 2.5</span>
                <span className="t-meta">min Average Variance</span>
              </div>
            </div>
          </div>
          <VarianceTable />
        </Card>

        <Card>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <div className="t-meta">Live Vehicle Volume</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                <span className="t-stat tabular">{totalVehicles}</span>
                <span className="t-meta">today</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 6 }}>
            <Sparkline data={LIVE_VOLUME_SPARK} color="var(--accent)" height={48} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${VOLUME_BUCKETS.length}, 1fr)`, gap: 4, marginTop: 8 }}>
            {VOLUME_BUCKETS.map((b, i) => (
              <div key={i} style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 6 }}>
                <div className="tabular" style={{ fontSize: 12, color: "var(--text-primary)" }}>{b.lab}</div>
                <div style={{
                  fontSize: 10,
                  color: b.delta === "0%" ? "var(--text-tertiary)" : b.good ? "var(--success)" : "var(--danger)",
                }}>{b.delta}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span className="t-tick">06:00</span>
            <span className="t-tick">12:00</span>
            <span className="t-tick">18:00</span>
            <span className="t-tick">23:59</span>
          </div>
        </Card>

        <Card>
          <div className="t-meta" style={{ marginBottom: 4 }}>Congestion Risk Score</div>
          <div className="t-label">city-wide · live</div>
          <div style={{ display: "grid", placeItems: "center", marginTop: 4 }}>
            <Gauge value={gaugeValue} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function VarianceTable() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "grid", gridTemplateColumns: "48px repeat(5, 1fr)", gap: 4, alignItems: "center" }}>
        <span className="t-label">Route</span>
        {VARIANCE_ROWS[0].labels.map((l) => (
          <span key={l} className="t-label" style={{ textAlign: "center" }}>{l}</span>
        ))}
      </div>
      {VARIANCE_ROWS.map((r, ri) => (
        <div key={ri} style={{ display: "grid", gridTemplateColumns: "48px repeat(5, 1fr)", gap: 4, alignItems: "center" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "4px 7px", borderRadius: 4,
            background: "var(--bg-surface-2)", fontSize: 11, color: "var(--text-secondary)",
            border: "1px solid var(--border-subtle)",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text-tertiary)" }} />
            {r.code}
          </span>
          {r.vals.map((v, vi) => {
            const str = String(v);
            const isPositive = str.startsWith("+");
            return (
              <span key={vi} style={{
                textAlign: "center", fontSize: 12,
                color: isPositive ? "var(--accent)" : "var(--text-secondary)",
                fontVariantNumeric: "tabular-nums",
                borderTop: "1px solid var(--border-subtle)", paddingTop: 6,
              }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                  {isPositive && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />}
                  {str}min
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
