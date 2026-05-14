"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Icons } from "@/components/icons";
import { CityMap } from "@/components/MapSlot";
import { Card } from "@/components/ui";
import { api } from "@/lib/api";
import { EMERGENCY_JUNCTIONS } from "@/lib/data";
import type { SignalJunction, VehicleType } from "@/lib/types";
import { toast } from "@/components/Toast";

interface EmergencyResponse {
  vehicle_type: string; origin: string; destination: string;
  distance_km: number;
  eta_with_clearance_min: number;
  eta_without_clearance_min: number;
  time_saved_min: number;
  junctions: Array<{ name: string; command: string; offset: string; state: SignalJunction["state"] }>;
  advisory: string;
}

const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "1px solid var(--border-subtle)" }}>
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
  const [busy, setBusy] = useState(false);

  const vehicles: { id: VehicleType; label: string; Icon: typeof Icons.Amb }[] = [
    { id: "ambulance", label: "Ambulance", Icon: Icons.Amb },
    { id: "fire",      label: "Fire",      Icon: Icons.Flame },
    { id: "police",    label: "Police",    Icon: Icons.Shield },
  ];

  const clearPath = async () => {
    setBusy(true);
    try {
      const res = (await api.emergencyRoute({
        vehicle_type: vtype, origin: from, destination: to,
      })) as EmergencyResponse;
      setPlan(res);
      toast(`Path cleared — ${res.junctions.length} junctions pre-empted`, "success");
    } catch {
      toast("Backend unreachable — using cached plan", "danger");
    } finally {
      setBusy(false);
    }
  };

  const etaWith = plan?.eta_with_clearance_min ?? 7.5;
  const etaWithout = plan?.eta_without_clearance_min ?? 18;
  const saved = plan?.time_saved_min ?? 10.5;
  const junctions = plan
    ? plan.junctions.map((j) => ({ name: j.name, cmd: j.command, offsetSec: j.offset, state: j.state }))
    : EMERGENCY_JUNCTIONS;

  return (
    <div className="page" data-screen-label="04 Emergency">
      <motion.div initial="hidden" animate="show" variants={fade} transition={{ duration: 0.35 }}
        style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <div className="t-section">Emergency</div>
          <div className="t-hero" style={{ marginTop: 6,
            background: "linear-gradient(90deg, var(--accent) 0%, #F4F4F5 60%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>Priority Corridor</div>
          <div className="t-meta" style={{ marginTop: 10, maxWidth: 540 }}>
            Cascading signal pre-emption for ambulance, fire, and police units. Authorised dispatchers only.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            padding: "6px 12px", borderRadius: 999,
            background: "var(--accent-soft)", color: "var(--accent)",
            border: "1px solid rgba(232,132,60,0.25)", fontSize: 11.5, fontWeight: 500,
            letterSpacing: "0.04em", textTransform: "uppercase",
          }} className="pulse-soft">● Active Mission · Code A</span>
        </div>
      </motion.div>

      <div className="emergency-grid" style={{ display: "grid", gridTemplateColumns: "320px 1fr 360px", gap: 14 }}>
        {/* Left: planner */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                      transition: "all .15s ease",
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
            <button className="btn btn-primary" style={{ width: "100%", marginTop: 14 }} onClick={clearPath} disabled={busy}>
              <Icons.Sparkles size={14} /> {busy ? "Clearing…" : "Clear Path"}
            </button>
            <button className="btn btn-ghost" style={{ width: "100%", marginTop: 8 }}
              onClick={() => { localStorage.setItem("emergency-template", JSON.stringify({ vtype, from, to })); toast("Template saved locally", "success"); }}>
              Save as template
            </button>
            <button className="btn btn-ghost" style={{ width: "100%", marginTop: 8 }}
              onClick={() => {
                const t = localStorage.getItem("emergency-template");
                if (!t) return toast("No template saved yet");
                const p = JSON.parse(t);
                setVtype(p.vtype); setFrom(p.from); setTo(p.to);
                toast("Template loaded");
              }}>
              Load template
            </button>
          </Card>

          <Card>
            <div className="t-meta" style={{ marginBottom: 8 }}>Mission Brief</div>
            <Row k="Patient" v="Cardiac · Priority 1" />
            <Row k="Distance" v={`${plan?.distance_km ?? 7.8} km`} />
            <Row k="Signals on path" v={`${junctions.length} junctions`} />
            <Row k="Crew" v="EMT-2 · Driver-7" />
            <Row k="Hospital bed" v="Confirmed · ICU-3" />
          </Card>
        </div>

        {/* Center map */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <CityMap height={560} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Card style={{ borderColor: "var(--border-strong)" }}>
              <div className="t-label">ETA · Without clearance</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                <span
                  className="t-stat tabular"
                  style={{ color: "var(--text-secondary)", textDecoration: "line-through", textDecorationColor: "var(--text-tertiary)" }}
                >{etaWithout}</span>
                <span className="t-meta">min</span>
              </div>
              <div className="t-tick" style={{ marginTop: 4 }}>standard urban flow</div>
            </Card>
            <Card style={{ borderColor: "rgba(232,132,60,0.35)", background: "rgba(40, 24, 16, 0.78)" }}>
              <div className="t-label" style={{ color: "var(--accent)" }}>ETA · With clearance</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                <span className="t-stat tabular" style={{ color: "var(--accent)" }}>{etaWith}</span>
                <span className="t-meta">min · saves {saved} min</span>
              </div>
              <div className="t-tick" style={{ marginTop: 4, color: "var(--accent)" }}>signal pre-emption active</div>
            </Card>
          </div>
        </div>

        {/* Right: signal pre-emption */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="t-title">Signal Pre-emption</div>
                <div className="t-tick" style={{ marginTop: 3 }}>{junctions.length} junctions · cascading</div>
              </div>
              <button
                onClick={() => setCleared((c) => !c)}
                style={{
                  fontSize: 11, padding: "4px 10px", borderRadius: 999,
                  background: cleared ? "var(--accent-soft)" : "var(--bg-surface-2)",
                  color: cleared ? "var(--accent)" : "var(--text-secondary)",
                  border: `1px solid ${cleared ? "rgba(232,132,60,0.25)" : "var(--border-subtle)"}`,
                  cursor: "pointer",
                }}
              >{cleared ? "Auto · ON" : "Manual"}</button>
            </div>

            <div>
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
                      <div className="t-tick" style={{ marginTop: 3 }}>{j.cmd}</div>
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
              {plan?.advisory || "Re-route opposing flow at Yusuf Sarai to absorb the 38-second hold without spillback."}
            </div>
            <button className="btn btn-ghost" style={{ marginTop: 12, width: "100%" }}
              onClick={() => toast("Advisory applied to dispatch system", "success")}>
              Apply advisory
            </button>
          </Card>
        </div>
      </div>

      {/* Mission history */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="t-section">Mission Log</div>
            <div className="t-title" style={{ marginTop: 4 }}>Recent Code-A Dispatches</div>
          </div>
        </div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 130px 1fr 120px 80px", padding: "12px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
            <span className="t-label">Code</span>
            <span className="t-label">Vehicle</span>
            <span className="t-label">Route</span>
            <span className="t-label">ETA</span>
            <span className="t-label" style={{ textAlign: "right" }}>Saved</span>
          </div>
          {[
            { code: "A-0421", veh: "Ambulance",  rt: "AIIMS → Max Saket",           eta: "7.5 min",  saved: "10.5m" },
            { code: "A-0420", veh: "Fire",       rt: "Saket Fire Stn → Vasant Kunj", eta: "9.2 min",  saved: "8.4m" },
            { code: "A-0419", veh: "Police",     rt: "Vasant Vihar → Janakpuri",     eta: "12.1 min", saved: "6.7m" },
            { code: "A-0418", veh: "Ambulance",  rt: "Apollo → Mahaveer Enclave",    eta: "8.8 min",  saved: "9.2m" },
          ].map((m, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 130px 1fr 120px 80px", padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{m.code}</span>
              <span className="t-meta">{m.veh}</span>
              <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{m.rt}</span>
              <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{m.eta}</span>
              <span style={{ fontSize: 12, color: "var(--success)", textAlign: "right" }}>{m.saved}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
