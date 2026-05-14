"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Icons } from "@/components/icons";
import { Card, SeverityBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { ALERT_HISTORY, INITIAL_ALERTS, LIVE_ALERT_SAMPLES } from "@/lib/data";
import type { Alert, Severity } from "@/lib/types";
import { toast } from "@/components/Toast";

type ApiAlert = {
  id: number; severity: Severity; road_name: string;
  message: string; when: string; created_at?: string;
};

const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const FILTERS: { label: string; value: Severity | "all" }[] = [
  { label: "All",      value: "all" },
  { label: "Critical", value: "critical" },
  { label: "High",     value: "high" },
  { label: "Medium",   value: "medium" },
  { label: "Low",      value: "low" },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [radius, setRadius] = useState(5);
  const [push, setPush] = useState(true);
  const [city, setCity] = useState("Delhi NCR · All corridors");
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [details, setDetails] = useState<Alert | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = (await api.alerts(undefined, 20)) as ApiAlert[];
        if (cancelled || !Array.isArray(rows)) return;
        setAlerts(rows.map((r) => ({
          id: r.id, level: r.severity, road: r.road_name,
          msg: r.message, when: r.when || "just now",
        })));
      } catch {
        setAlerts((prev) => {
          const s = LIVE_ALERT_SAMPLES[Math.floor(Math.random() * LIVE_ALERT_SAMPLES.length)];
          return [{ ...s, id: Date.now(), when: "just now" }, ...prev.slice(0, 12)];
        });
      }
    };
    load();
    const t = setInterval(load, 6000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const filtered = useMemo(
    () => filter === "all" ? alerts : alerts.filter((a) => a.level === filter),
    [alerts, filter],
  );

  const subscribe = async () => {
    setSubStatus("…");
    try {
      const res = (await api.subscribe({
        city, radius_km: radius, push_enabled: push, severity_threshold: "critical",
      })) as { subscription_id?: string };
      const msg = res.subscription_id ? `Subscribed · ${res.subscription_id}` : "Subscribed";
      setSubStatus(msg);
      toast("Subscription saved", "success");
    } catch {
      setSubStatus("Could not reach backend — try again");
      toast("Backend unreachable", "danger");
    }
    setTimeout(() => setSubStatus(null), 4000);
  };

  const exportCsv = () => {
    const header = "Date,Segment,Level,Message,SentCount\n";
    const body = ALERT_HISTORY
      .map((h) => `"${h.date}","${h.segment}",${h.level},"${h.msg.replace(/"/g, '""')}",${h.sent}`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "alert_history.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast("Exported alert_history.csv", "success");
  };

  const fillPct = ((radius - 1) / 24) * 100;

  return (
    <div className="page" data-screen-label="03 Alerts">
      <motion.div initial="hidden" animate="show" variants={fade} transition={{ duration: 0.35 }}
        style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <div className="t-section">Alerts</div>
          <div className="t-hero" style={{ marginTop: 6 }}>Alert Center</div>
          <div className="t-meta" style={{ marginTop: 10, maxWidth: 540 }}>
            Streaming severity-graded advisories from {alerts.length} active sensors. Filter by severity, subscribe to push, or export history.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} className="pulse-soft" />
            Live · 23 alerts/hr avg
          </span>
        </div>
      </motion.div>

      <div className="alerts-grid" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
        {/* Feed */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: 8 }}>
            <div className="t-title">Live Feed</div>
            <div style={{ display: "flex", gap: 6 }}>
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  className={`pill ${filter === f.value ? "is-active" : ""}`}
                  onClick={() => setFilter(f.value)}
                >{f.label}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
                No alerts in this severity level.
              </div>
            ) : filtered.map((a) => (
              <div key={a.id} className="alert-row anim-slidein">
                <SeverityBadge level={a.level} />
                <div>
                  <div style={{ fontSize: 13.5, color: "var(--text-primary)" }}>{a.road}</div>
                  <div className="t-meta" style={{ marginTop: 3 }}>{a.msg}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <span className="t-tick">{a.when}</span>
                  <button
                    className="btn btn-ghost"
                    style={{ height: 28, padding: "0 10px", fontSize: 11 }}
                    onClick={() => setDetails(a)}
                  >Details</button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Subscribe + rollup */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <div className="t-title" style={{ marginBottom: 4 }}>Push Subscription</div>
            <div className="t-meta" style={{ marginBottom: 18 }}>Get pinged when severity reaches your threshold in your zone.</div>

            <div className="t-label" style={{ marginBottom: 8 }}>Radius</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="t-stat-sm tabular" style={{ minWidth: 78 }}>
                {radius}<span className="t-meta" style={{ marginLeft: 4 }}>km</span>
              </span>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  type="range" min={1} max={25} value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                  style={{
                    appearance: "none", width: "100%", height: 3,
                    background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${fillPct}%, var(--bg-surface-2) ${fillPct}%, var(--bg-surface-2) 100%)`,
                    borderRadius: 999, outline: "none",
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span className="t-tick">1 km</span>
              <span className="t-tick">25 km</span>
            </div>

            <div className="t-label" style={{ marginTop: 18, marginBottom: 8 }}>City / segment</div>
            <div className="search" style={{ width: "100%" }}>
              <Icons.Pin size={12} />
              <input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>

            <div style={{
              marginTop: 18, padding: "12px 14px",
              background: push ? "var(--accent-soft)" : "var(--bg-surface-2)",
              borderRadius: 10,
              border: `1px solid ${push ? "rgba(232,132,60,0.25)" : "var(--border-subtle)"}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--text-primary)" }}>Enable Push Alerts</div>
                <div className="t-tick" style={{ marginTop: 3 }}>Critical only · 24/7</div>
              </div>
              <button
                onClick={() => setPush((p) => !p)}
                style={{
                  width: 40, height: 22, borderRadius: 999,
                  background: push ? "var(--accent)" : "var(--bg-surface)",
                  border: `1px solid ${push ? "var(--accent)" : "var(--border-subtle)"}`,
                  position: "relative", cursor: "pointer", transition: "all .15s ease",
                }}
              >
                <span style={{
                  position: "absolute", top: 2, left: push ? 20 : 2,
                  width: 16, height: 16, borderRadius: "50%",
                  background: push ? "#0C0C0D" : "var(--text-secondary)",
                  transition: "left .15s ease",
                }} />
              </button>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 12 }}
              onClick={subscribe}
            >Save subscription</button>
            {subStatus && (
              <div className="t-tick" style={{ marginTop: 8, textAlign: "center", color: "var(--accent)" }}>
                {subStatus}
              </div>
            )}
          </Card>

          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="t-meta">Notifications sent · last 24h</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                  <span className="t-stat tabular">128,402</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="t-tick">Avg latency</div>
                <div style={{ fontSize: 18, color: "var(--accent)", marginTop: 4 }}>1.4s</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginTop: 16 }}>
              {[
                { lab: "Critical", val: "312",  c: "var(--danger)" },
                { lab: "High",     val: "4.8k", c: "var(--danger)" },
                { lab: "Medium",   val: "38.2k", c: "var(--warning)" },
                { lab: "Low",      val: "85.1k", c: "var(--success)" },
              ].map((b) => (
                <div key={b.lab} style={{ padding: "10px 0", borderTop: "1px solid var(--border-subtle)" }}>
                  <div className="t-tick">{b.lab}</div>
                  <div style={{ fontSize: 15, color: b.c, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{b.val}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* History */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="t-section">History</div>
            <div className="t-title" style={{ marginTop: 4 }}>Alert History · Today</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="pill-mini"><Icons.Cal size={12} /> Today</span>
            <button className="btn btn-ghost" style={{ height: 32, padding: "0 14px", fontSize: 12 }}
              onClick={exportCsv}>
              Export CSV
            </button>
          </div>
        </div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "160px 220px 100px 1fr 90px", padding: "12px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
            <span className="t-label">Date · Time</span>
            <span className="t-label">Segment</span>
            <span className="t-label">Level</span>
            <span className="t-label">Message</span>
            <span className="t-label" style={{ textAlign: "right" }}>Sent</span>
          </div>
          {ALERT_HISTORY.map((h, i) => (
            <div
              key={i}
              style={{
                display: "grid", gridTemplateColumns: "160px 220px 100px 1fr 90px",
                padding: "14px 18px",
                borderBottom: i === ALERT_HISTORY.length - 1 ? "none" : "1px solid var(--border-subtle)",
                alignItems: "center",
              }}
            >
              <span className="t-meta tabular">{h.date}</span>
              <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{h.segment}</span>
              <span><SeverityBadge level={h.level} /></span>
              <span className="t-meta">{h.msg}</span>
              <span style={{ textAlign: "right", fontSize: 13, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{h.sent}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Details modal */}
      {details && (
        <div className="modal-backdrop" onClick={() => setDetails(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <SeverityBadge level={details.level} />
                <button className="btn-icon" onClick={() => setDetails(null)}><Icons.Close size={12} /></button>
              </div>
              <div className="t-title" style={{ marginBottom: 6 }}>{details.road}</div>
              <div className="t-meta" style={{ marginBottom: 16 }}>{details.msg}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="When"   v={details.when} />
                <Field label="Alert ID" v={String(details.id)} />
                <Field label="Severity" v={details.level} />
                <Field label="Status"  v="Active" />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                <button className="btn btn-primary" style={{ flex: 1 }}
                  onClick={() => { toast("Marshal dispatched"); setDetails(null); }}>
                  Dispatch marshal
                </button>
                <button className="btn btn-ghost" style={{ flex: 1 }}
                  onClick={() => { toast("Alert acknowledged"); setDetails(null); }}>
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, v }: { label: string; v: string }) {
  return (
    <div style={{ padding: "10px 12px", background: "var(--bg-surface-2)", borderRadius: 8 }}>
      <div className="t-label" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{v}</div>
    </div>
  );
}
