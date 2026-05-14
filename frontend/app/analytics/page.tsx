"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Icons } from "@/components/icons";
import { Card } from "@/components/ui";
import {
  api, type AnalyticsOverview, type AnalyticsPredictResponse,
  type HourlyPoint, type LocationStat, type WeatherImpact,
} from "@/lib/api";
import { toast } from "@/components/Toast";

const ACCENT = "#E8843C";
const SUCCESS = "#5FB95F";
const WARNING = "#E0A53C";
const DANGER = "#DB4B45";
const INFO = "#4FB6F2";
const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

const LABEL_COLORS: Record<string, string> = {
  "Low": SUCCESS, "Medium": WARNING, "High": ACCENT, "Very High": DANGER,
};

const WEATHERS = ["Clear", "Cloudy", "Rain", "Heavy Rain", "Fog"];

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [locs, setLocs] = useState<LocationStat[]>([]);
  const [hourly, setHourly] = useState<HourlyPoint[]>([]);
  const [weather, setWeather] = useState<WeatherImpact[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Prediction form
  const [pf, setPf] = useState({
    location: "Connaught Place",
    hour: 9,
    day_of_week: 1,
    traffic_volume: 500,
    avg_speed_kmh: 28,
    weather: "Clear",
    rain_mm: 0,
    accident: false,
    event: false,
    pt_density: 60,
    lat: 28.6315,
    lng: 77.2167,
  });
  const [prediction, setPrediction] = useState<AnalyticsPredictResponse | null>(null);
  const [predBusy, setPredBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      api.analytics.overview(),
      api.analytics.byLocation(),
      api.analytics.hourly(),
      api.analytics.weather(),
    ])
      .then(([o, l, h, w]) => {
        if (!alive) return;
        setOverview(o);
        setLocs(l);
        setHourly(h);
        setWeather(w);
        setErr(null);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(String(e));
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const runPredict = async () => {
    setPredBusy(true);
    try {
      const r = await api.analytics.predict(pf);
      setPrediction(r);
      toast(`Predicted: ${r.predicted_label} (${Math.round(r.confidence * 100)}% confidence)`, "success");
    } catch {
      toast("Could not reach analytics backend — make sure the FastAPI server is running on :8000", "danger");
    } finally {
      setPredBusy(false);
    }
  };

  const classBars = useMemo(() => {
    if (!overview?.class_distribution) return [];
    return Object.entries(overview.class_distribution).map(([k, v]) => ({
      name: k, value: v, color: LABEL_COLORS[k] || ACCENT,
    }));
  }, [overview]);

  const featImps = useMemo(
    () => (overview?.feature_importances || []).slice(0, 10).map((f) => ({
      name: prettifyName(f.name),
      score: Math.round(f.score * 10000) / 100,
    })),
    [overview],
  );

  return (
    <div className="page" data-screen-label="05 Analytics">
      <motion.div
        initial="hidden" animate="show" variants={fade} transition={{ duration: 0.35 }}
        style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <div className="t-section">Analytics</div>
          <div className="t-hero" style={{ marginTop: 6 }}>ML Insights</div>
          <div className="t-meta" style={{ marginTop: 10, maxWidth: 620 }}>
            XGBoost classifier trained on your 7,000-row multi-location dataset.
            Explore per-location risk, hourly profiles, weather impact, and run
            ad-hoc predictions.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="pill-mini"><Icons.Sparkles size={11} /> XGBoost · {overview?.n_features ?? "—"} features</span>
          <span className="pill-mini"><Icons.Layer size={11} /> {overview?.n_samples ?? "—"} rows</span>
        </div>
      </motion.div>

      {err && (
        <div style={{ padding: 14, background: "var(--danger-soft)", border: "1px solid rgba(219,75,69,0.30)", borderRadius: 10, color: "var(--danger)", marginBottom: 18 }}>
          Failed to load analytics. Make sure the backend is running and the model has been trained
          (<code>python -m ml.dataset_train</code>). Detail: {err}
        </div>
      )}

      {/* TOP STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }} className="analytics-grid">
        <StatCard
          loading={loading}
          label="Model accuracy"
          value={overview?.accuracy != null ? `${(overview.accuracy * 100).toFixed(1)}%` : "—"}
          sub={overview?.macro_f1 != null ? `Macro-F1 ${overview.macro_f1.toFixed(3)}` : ""}
          color={SUCCESS}
        />
        <StatCard
          loading={loading}
          label="Training samples"
          value={overview?.n_samples?.toLocaleString() ?? "—"}
          sub={`${overview?.n_locations ?? "—"} locations`}
          color={ACCENT}
        />
        <StatCard
          loading={loading}
          label="Avg speed (dataset)"
          value={overview?.avg_speed_kmh != null ? overview.avg_speed_kmh.toFixed(1) : "—"}
          sub="km/h across 7k readings"
          color={INFO}
        />
        <StatCard
          loading={loading}
          label="Severe congestion rate"
          value={overview?.pct_severe != null ? `${(overview.pct_severe * 100).toFixed(1)}%` : "—"}
          sub="Very High class share"
          color={DANGER}
        />
      </div>

      {/* CLASS DISTRIBUTION + FEATURE IMPORTANCE */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="t-section">Model</div>
            <div className="t-title" style={{ marginTop: 4 }}>Class Distribution & Feature Importance</div>
          </div>
          {overview?.trained_at && (
            <span className="t-tick">Trained {new Date(overview.trained_at).toLocaleString()}</span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 14 }} className="analytics-grid">
          <Card>
            <div className="t-meta" style={{ marginBottom: 12 }}>Congestion class distribution</div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classBars} margin={{ top: 10, right: 10, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fill: "#8B8B8F", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#8B8B8F", fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    contentStyle={{ background: "#161617", border: "1px solid #2A2A2D", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {classBars.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <div className="t-meta" style={{ marginBottom: 12 }}>Top 10 features driving prediction</div>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featImps} layout="vertical" margin={{ top: 4, right: 18, bottom: 4, left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tick={{ fill: "#8B8B8F", fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#F4F4F5", fontSize: 11 }} width={140} />
                  <Tooltip
                    contentStyle={{ background: "#161617", border: "1px solid #2A2A2D", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v}%`, "importance"]}
                  />
                  <Bar dataKey="score" fill={ACCENT} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* HOURLY PROFILE */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="t-section">Time</div>
            <div className="t-title" style={{ marginTop: 4 }}>Hourly Traffic Profile</div>
            <div className="t-meta" style={{ marginTop: 4 }}>Averages from your 7k dataset · volume, speed, severe-congestion rate</div>
          </div>
        </div>
        <Card>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourly} margin={{ top: 8, right: 10, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="hour" tick={{ fill: "#8B8B8F", fontSize: 11 }} tickFormatter={(h) => `${h}:00`} />
                <YAxis yAxisId="left" tick={{ fill: "#8B8B8F", fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "#8B8B8F", fontSize: 11 }} domain={[0, 1]} />
                <Tooltip
                  contentStyle={{ background: "#161617", border: "1px solid #2A2A2D", borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#8B8B8F" }} />
                <Line yAxisId="left"  dataKey="volume" stroke={ACCENT}  strokeWidth={1.8} dot={false} name="Avg volume" />
                <Line yAxisId="left"  dataKey="speed"  stroke={INFO}    strokeWidth={1.8} dot={false} name="Avg speed (km/h)" />
                <Line yAxisId="right" dataKey="severe_rate" stroke={DANGER} strokeWidth={1.8} dot={false} name="Severe rate" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* WEATHER + LOCATIONS */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="t-section">Conditions</div>
            <div className="t-title" style={{ marginTop: 4 }}>Weather & Location Impact</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 14 }} className="analytics-grid">
          <Card>
            <div className="t-meta" style={{ marginBottom: 12 }}>Severe congestion rate by weather</div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weather} margin={{ top: 10, right: 10, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="weather" tick={{ fill: "#8B8B8F", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#8B8B8F", fontSize: 11 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                  <Tooltip
                    contentStyle={{ background: "#161617", border: "1px solid #2A2A2D", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number, _n, p) => p.dataKey === "severe_rate"
                      ? [`${(v * 100).toFixed(1)}%`, "severe rate"]
                      : [v, p.dataKey]}
                  />
                  <Bar dataKey="severe_rate" radius={[6, 6, 0, 0]}>
                    {weather.map((d) => (
                      <Cell
                        key={d.weather}
                        fill={d.weather === "Heavy Rain" ? DANGER : d.weather === "Rain" ? ACCENT : d.weather === "Fog" ? WARNING : INFO}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="t-title">Locations · ranked by severe-rate</div>
              <div className="t-tick" style={{ marginTop: 3 }}>{locs.length} locations from the dataset</div>
            </div>
            <div style={{ maxHeight: 260, overflow: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", padding: "10px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
                <span className="t-label">Location</span>
                <span className="t-label">Avg speed</span>
                <span className="t-label">Accident %</span>
                <span className="t-label">Severe %</span>
              </div>
              {locs.map((l, i) => (
                <div key={l.location} style={{
                  display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
                  padding: "12px 18px", borderBottom: i === locs.length - 1 ? "none" : "1px solid var(--border-subtle)",
                  alignItems: "center",
                }}>
                  <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{l.location}</span>
                  <span className="tabular" style={{ fontSize: 13 }}>{l.avg_speed_kmh} km/h</span>
                  <span className="tabular" style={{ fontSize: 13, color: l.accident_rate > 0.25 ? "var(--danger)" : "var(--text-secondary)" }}>
                    {(l.accident_rate * 100).toFixed(1)}%
                  </span>
                  <span className="tabular" style={{
                    fontSize: 13,
                    color: l.severe_rate > 0.5 ? "var(--danger)" : l.severe_rate > 0.3 ? "var(--warning)" : "var(--success)",
                  }}>
                    {(l.severe_rate * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* PREDICT FORM */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="t-section">Sandbox</div>
            <div className="t-title" style={{ marginTop: 4 }}>Run a Prediction</div>
            <div className="t-meta" style={{ marginTop: 4 }}>Live inference from the XGBoost model · sub-100 ms</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }} className="analytics-grid">
          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Location">
                <select
                  value={pf.location}
                  onChange={(e) => setPf({ ...pf, location: e.target.value })}
                  style={inputStyle}
                >
                  {(locs.length > 0 ? locs.map((l) => l.location) : DEFAULT_LOCS).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </Field>
              <Field label="Weather">
                <select
                  value={pf.weather}
                  onChange={(e) => setPf({ ...pf, weather: e.target.value })}
                  style={inputStyle}
                >
                  {WEATHERS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </Field>
              <Field label={`Hour · ${pf.hour}:00`}>
                <input type="range" min={0} max={23} value={pf.hour}
                  onChange={(e) => setPf({ ...pf, hour: parseInt(e.target.value, 10) })}
                  style={{ width: "100%" }} />
              </Field>
              <Field label="Day of week">
                <select
                  value={pf.day_of_week}
                  onChange={(e) => setPf({ ...pf, day_of_week: parseInt(e.target.value, 10) })}
                  style={inputStyle}
                >
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d, i) =>
                    <option key={d} value={i}>{d}</option>,
                  )}
                </select>
              </Field>
              <Field label={`Traffic volume · ${pf.traffic_volume}`}>
                <input type="range" min={50} max={1000} value={pf.traffic_volume}
                  onChange={(e) => setPf({ ...pf, traffic_volume: parseInt(e.target.value, 10) })}
                  style={{ width: "100%" }} />
              </Field>
              <Field label={`Avg speed · ${pf.avg_speed_kmh} km/h`}>
                <input type="range" min={2} max={80} value={pf.avg_speed_kmh}
                  onChange={(e) => setPf({ ...pf, avg_speed_kmh: parseInt(e.target.value, 10) })}
                  style={{ width: "100%" }} />
              </Field>
              <Field label={`Rain · ${pf.rain_mm} mm`}>
                <input type="range" min={0} max={50} value={pf.rain_mm}
                  onChange={(e) => setPf({ ...pf, rain_mm: parseInt(e.target.value, 10) })}
                  style={{ width: "100%" }} />
              </Field>
              <Field label={`Public transport density · ${pf.pt_density}`}>
                <input type="range" min={0} max={100} value={pf.pt_density}
                  onChange={(e) => setPf({ ...pf, pt_density: parseInt(e.target.value, 10) })}
                  style={{ width: "100%" }} />
              </Field>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <ToggleField label="Accident nearby" value={pf.accident} onChange={(v) => setPf({ ...pf, accident: v })} />
              <ToggleField label="Event nearby" value={pf.event} onChange={(v) => setPf({ ...pf, event: v })} />
            </div>
            <button className="btn btn-primary" style={{ width: "100%", marginTop: 18 }} onClick={runPredict} disabled={predBusy}>
              <Icons.Sparkles size={14} /> {predBusy ? "Predicting…" : "Predict congestion"}
            </button>
          </Card>

          <Card>
            <div className="t-title">Prediction</div>
            {!prediction ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 260, color: "var(--text-tertiary)", fontSize: 13 }}>
                Adjust the sliders and hit Predict.
              </div>
            ) : (
              <>
                <div style={{ marginTop: 18, textAlign: "center" }}>
                  <div className="t-label">Predicted class</div>
                  <div style={{
                    marginTop: 8, fontSize: 36, fontWeight: 300,
                    color: LABEL_COLORS[prediction.predicted_label] || ACCENT,
                  }}>{prediction.predicted_label}</div>
                  <div className="t-meta" style={{ marginTop: 4 }}>
                    Confidence {(prediction.confidence * 100).toFixed(1)}% · Risk score {prediction.risk_score}
                  </div>
                </div>
                <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.entries(prediction.probabilities).map(([k, v]) => {
                    const pct = v * 100;
                    return (
                      <div key={k}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-secondary)" }}>
                          <span>{k}</span>
                          <span className="tabular">{pct.toFixed(1)}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, background: "var(--bg-surface-2)", marginTop: 4, overflow: "hidden" }}>
                          <div style={{
                            width: `${pct}%`, height: "100%",
                            background: LABEL_COLORS[k] || ACCENT, transition: "width .4s ease",
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 36, padding: "0 12px",
  background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
  borderRadius: 9, color: "var(--text-primary)", fontSize: 13,
};

const DEFAULT_LOCS = [
  "Connaught Place", "India Gate", "MG Road Gurgaon", "Cyber Hub Gurgaon",
  "Sector 62 Noida", "DND Flyway", "IGI Airport T3", "Karol Bagh",
];

function StatCard({ label, value, sub, color, loading }: { label: string; value: string; sub?: string; color: string; loading?: boolean }) {
  return (
    <Card>
      <div className="t-meta" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        {loading ? (
          <span className="shimmer" style={{ width: 100, height: 28, borderRadius: 6 }} />
        ) : (
          <span className="t-stat tabular" style={{ color }}>{value}</span>
        )}
      </div>
      {sub && <div className="t-tick" style={{ marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="t-label">{label}</span>
      {children}
    </label>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        flex: 1, padding: "12px", borderRadius: 10,
        background: value ? "var(--accent-soft)" : "var(--bg-surface-2)",
        border: `1px solid ${value ? "rgba(232,132,60,0.30)" : "var(--border-subtle)"}`,
        color: value ? "var(--accent)" : "var(--text-secondary)",
        fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}
    >
      <span>{label}</span>
      <span style={{
        width: 14, height: 14, borderRadius: "50%",
        background: value ? "var(--accent)" : "transparent",
        border: `2px solid ${value ? "var(--accent)" : "var(--border-strong)"}`,
      }} />
    </button>
  );
}

function prettifyName(s: string): string {
  return s
    .replace(/^loc_/, "")
    .replace(/^w_/, "Wx: ")
    .replace(/_/g, " ")
    .replace(/avg speed \(km\/h\)/i, "Avg speed")
    .replace(/^./, (c) => c.toUpperCase());
}
