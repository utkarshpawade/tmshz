"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import { CityMap } from "@/components/MapSlot";
import { Card } from "@/components/ui";
import { api } from "@/lib/api";
import { EMERGENCY_JUNCTIONS } from "@/lib/data";
import type { SignalJunction, VehicleType } from "@/lib/types";

interface EmergencyResponse {
  vehicle_type: string; origin: string; destination: string;
  distance_km: number;
  eta_with_clearance_min: number;
  eta_without_clearance_min: number;
  time_saved_min: number;
  junctions: Array<{ name: string; command: string; offset: string; state: SignalJunction["state"] }>;
  advisory: string;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span className="t-meta" style={{ fontSize: 12.5 }}>{k}</span>
      <span style={{ fontSize: 13, color: "var(--text-primary)", textAlign: "right" }}>{v}</span>
    </div>
  );
}

export default function EmergencyPage() {
  const [vtype, setVtype] = useState<VehicleType>("ambulance");
  const [from, setFrom] = useState("AIIMS, Ansari Nagar");
  const [to, setTo] = useState("Max Hospital, Saket");
  const [cleared, setCleared] = useState(true);
  const [plan, setPlan] = useState<EmergencyResponse | null>(null);

  const vehicles: { id: VehicleType; label: string; Icon: typeof Icons.Amb }[] = [
    { id: "ambulance", label: "Ambulance", Icon: Icons.Amb },
    { id: "fire",      label: "Fire",      Icon: Icons.Flame },
    { id: "police",    label: "Police",    Icon: Icons.Shield },
  ];

  const clearPath = async () => {
    try {
      const res = (await api.emergencyRoute({
        vehicle_type: vtype, origin: from, destination: to,
      })) as EmergencyResponse;
      setPlan(res);
    } catch { /* keep design defaults on failure */ }
  };

  const etaWith = plan?.eta_with_clearance_min ?? 7.5;
  const etaWithout = plan?.eta_without_clearance_min ?? 18;
  const saved = plan?.time_saved_min ?? 10.5;
  const junctions = plan
    ? plan.junctions.map((j) => ({ name: j.name, cmd: j.command, offsetSec: j.offset, state: j.state }))
    : EMERGENCY_JUNCTIONS;

  return (
    <div
      data-screen-label="04 Emergency"
      className="screen"
      style={{ padding: "14px 16px 16px", gap: 12, display: "flex", flexDirection: "column" }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "4px 4px 8px" }}>
        <div>
          <div
            className="t-hero"
            style={{
              background: "linear-gradient(90deg, var(--accent) 0%, #F4F4F5 60%)",
              WebkitBackgroundClip: "text", backgroundClip: "text",
              color: "transparent",
            }}
          >Emergency Routing</div>
          <div className="t-meta" style={{ marginTop: 10 }}>
            Priority-cleared corridor with cascading signal pre-emption · authorised dispatchers only.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            padding: "6px 12px", borderRadius: 999,
            background: "var(--accent-soft)", color: "var(--accent)",
            border: "1px solid rgba(232,132,60,0.25)", fontSize: 11.5, fontWeight: 500,
            letterSpacing: "0.04em", textTransform: "uppercase",
          }}>● Active Mission · Code A</span>
        </div>
      </div>

      <div
        className="emergency-grid"
        style={{ display: "grid", gridTemplateColumns: "300px 1fr 320px", gap: 12, flex: 1, minHeight: 0 }}
      >
        {/* Left: planner */}
        <div className="col scroll" style={{ gap: 12 }}>
          <Card>
            <div className="t-meta" style={{ marginBottom: 12 }}>Vehicle type</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {vehicles.map((v) => {
                const a = v.id === vtype;
                const Icon = v.Icon;
                return (
                  <button
                    key={v.id}
                    onClick={() => setVtype(v.id)}
                    style={{
                      padding: "14px 8px", borderRadius: 10,
                      background: a ? "var(--accent-soft)" : "var(--bg-surface-2)",
                      border: a ? "1px solid rgba(232,132,60,0.30)" : "1px solid var(--border-subtle)",
                      color: a ? "var(--accent)" : "var(--text-secondary)",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer",
                      transition: "background .15s ease, color .15s ease",
                    }}
                  >
                    <Icon size={20} />
                    <span style={{ fontSize: 12, fontWeight: a ? 500 : 400 }}>{v.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="t-meta" style={{ marginBottom: 12 }}>Mission origin &amp; destination</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="search" style={{ width: "100%" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }} />
                <input value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="search" style={{ width: "100%" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
                <input value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 14 }}
              onClick={clearPath}
            >
              <Icons.Sparkles size={14} /> Clear Path
            </button>
            <button className="btn btn-ghost" style={{ width: "100%", marginTop: 8 }}>Save as template</button>
          </Card>

          <Card>
            <div className="t-meta" style={{ marginBottom: 8 }}>Mission Brief</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Row k="Patient" v="Cardiac · Priority 1" />
              <Row k="Distance" v="7.8 km" />
              <Row k="Signals on path" v="7 junctions" />
              <Row k="Crew" v="EMT-2 · Driver-7" />
              <Row k="Hospital bed" v="Confirmed · ICU-3" />
            </div>
          </Card>
        </div>

        {/* Center map */}
        <div className="col" style={{ minHeight: 0, position: "relative", pointerEvents: "none" }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <CityMap showLegend={false} />
          </div>

          <div
            className="glass"
            style={{
              position: "absolute", left: 18, top: 18, padding: "12px 14px",
              display: "flex", alignItems: "center", gap: 12,
              borderColor: "rgba(232,132,60,0.32)", pointerEvents: "auto",
            }}
          >
            <span
              style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)" }}
              className="pulse-soft"
            />
            <div>
              <div style={{ fontSize: 12, color: "var(--text-primary)" }}>Priority corridor live</div>
              <div className="t-tick">Cascading 7 signals · ambulance unit AMB-12</div>
            </div>
          </div>

          <div style={{ position: "absolute", left: 18, right: 18, bottom: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, pointerEvents: "auto" }}>
            <div className="glass" style={{ padding: 16, borderColor: "rgba(255,255,255,0.10)" }}>
              <div className="t-label">ETA · Without clearance</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                <span
                  className="t-stat tabular"
                  style={{ color: "var(--text-secondary)", textDecoration: "line-through", textDecorationColor: "var(--text-tertiary)" }}
                >{etaWithout}</span>
                <span className="t-meta">min</span>
              </div>
              <div className="t-tick" style={{ marginTop: 4 }}>standard urban flow</div>
            </div>
            <div
              className="glass"
              style={{ padding: 16, borderColor: "rgba(232,132,60,0.35)", background: "rgba(40, 24, 16, 0.78)" }}
            >
              <div className="t-label" style={{ color: "var(--accent)" }}>ETA · With clearance</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                <span className="t-stat tabular" style={{ color: "var(--accent)" }}>{etaWith}</span>
                <span className="t-meta">min · saves {saved} min</span>
              </div>
              <div className="t-tick" style={{ marginTop: 4, color: "var(--accent)" }}>signal pre-emption active</div>
            </div>
          </div>
        </div>

        {/* Right: signal pre-emption */}
        <div className="col scroll" style={{ gap: 12, minHeight: 0 }}>
          <Card style={{ padding: 0, overflow: "hidden", flex: "none" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="t-title">Signal Pre-emption</div>
                <div className="t-tick" style={{ marginTop: 3 }}>7 junctions · cascading</div>
              </div>
              <button
                onClick={() => setCleared((c) => !c)}
                style={{
                  fontSize: 11, padding: "4px 10px", borderRadius: 999,
                  background: cleared ? "var(--accent-soft)" : "var(--bg-surface-2)",
                  color: cleared ? "var(--accent)" : "var(--text-secondary)",
                  border: `1px solid ${cleared ? "rgba(232,132,60,0.25)" : "var(--border-subtle)"}`,
                }}
              >{cleared ? "Auto · ON" : "Manual"}</button>
            </div>

            <div className="scroll" style={{ maxHeight: "calc(100vh - 360px)" }}>
              {junctions.map((j, i) => {
                const stateColor =
                  j.state === "cleared" ? "var(--success)" :
                  j.state === "staged"  ? "var(--accent)"  :
                                          "var(--text-tertiary)";
                const stateLab =
                  j.state === "cleared" ? "Cleared" :
                  j.state === "staged"  ? "Staged"  : "Pending";
                return (
                  <div
                    key={i}
                    style={{
                      padding: "14px 18px",
                      borderBottom: i === junctions.length - 1 ? "none" : "1px solid var(--border-subtle)",
                      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center",
                    }}
                  >
                    <div style={{ position: "relative", width: 22, display: "flex", justifyContent: "center" }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: stateColor,
                        boxShadow: j.state === "staged" ? "0 0 0 3px rgba(232,132,60,0.20)" : "none",
                      }} />
                      {i < junctions.length - 1 && (
                        <span style={{
                          position: "absolute", top: 14, bottom: -18, left: "50%", width: 1,
                          background: "var(--border-subtle)", transform: "translateX(-50%)",
                        }} />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{j.name}</div>
                      <div className="t-tick" style={{ marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {j.cmd}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="tabular" style={{ fontSize: 12, color: stateColor }}>{j.offsetSec}</div>
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>{stateLab}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icons.Sparkles size={12} />
              <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>System advisory</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-primary)", marginTop: 8, lineHeight: 1.5 }}>
              Re-route opposing flow at <span style={{ color: "var(--accent)" }}>Yusuf Sarai</span> to absorb the 38-second hold without spillback.
            </div>
            <button className="btn btn-ghost" style={{ marginTop: 12, width: "100%" }}>Apply advisory</button>
          </Card>
        </div>
      </div>
    </div>
  );
}
