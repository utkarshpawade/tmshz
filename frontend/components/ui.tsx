// Shared primitives — Card, StatNumber, badges, Logo. Style-classes come
// from globals.css; inline styles match the Claude design exactly.
import type { CSSProperties, ReactNode } from "react";
import { Icons } from "./icons";
import type { Severity, TrafficLevel } from "@/lib/types";

// ---- Status badges --------------------------------------------------------
export function StatusBadge({
  kind,
  label,
}: { kind: "online" | "offline" | "live"; label?: string }) {
  if (kind === "online") {
    return (
      <span className="badge online badge-dot">
        <span style={{ marginLeft: 2 }}>{label || "Online"}</span>
      </span>
    );
  }
  if (kind === "offline") {
    return (
      <span className="badge offline">
        <span className="tri" />
        <span>{label || "Offline"}</span>
      </span>
    );
  }
  return (
    <span className="badge live badge-dot">
      <span style={{ marginLeft: 2 }}>{label || "Live"}</span>
    </span>
  );
}

const SEV_MAP: Record<Severity, { bg: string; fg: string; br: string; txt: string }> = {
  low:      { bg: "rgba(95,185,95,0.10)",  fg: "#5FB95F", br: "rgba(95,185,95,0.22)",  txt: "Low" },
  medium:   { bg: "rgba(224,165,60,0.10)", fg: "#E0A53C", br: "rgba(224,165,60,0.25)", txt: "Medium" },
  high:     { bg: "rgba(219,75,69,0.10)",  fg: "#DB4B45", br: "rgba(219,75,69,0.28)",  txt: "High" },
  critical: { bg: "rgba(219,75,69,0.18)",  fg: "#FF6A63", br: "rgba(219,75,69,0.38)",  txt: "Critical" },
};

export function SeverityBadge({ level }: { level: Severity }) {
  const s = SEV_MAP[level];
  return (
    <span
      className={level === "critical" ? "pulse-soft" : ""}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "3px 10px", borderRadius: 9999,
        background: s.bg, color: s.fg, border: `1px solid ${s.br}`,
        fontSize: 11, fontWeight: 500, letterSpacing: "0.02em",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.fg }} />
      {s.txt}
    </span>
  );
}

export function TrafficLevelBadge({ level }: { level: TrafficLevel }) {
  const cls = { low: "traffic-low", medium: "traffic-med", high: "traffic-high" }[level];
  const txt = { low: "Light", medium: "Moderate", high: "Heavy" }[level];
  return (
    <span className={`badge ${cls}`} style={{ fontWeight: 500 }}>
      <span className="badge-dot" /> {txt}
    </span>
  );
}

export function CountBadge({ n }: { n: number }) {
  return <span className="badge-count">{n}</span>;
}

// ---- Card -----------------------------------------------------------------
export function Card({
  children, className = "", tight = false, arrow = true, style, onClick,
}: {
  children: ReactNode;
  className?: string;
  tight?: boolean;
  arrow?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`card ${tight ? "card-tight" : ""} ${className}`}
      style={style}
    >
      {arrow && (
        <span className="card-arrow"><Icons.Arrow size={12} /></span>
      )}
      {children}
    </div>
  );
}

// ---- Stat number ----------------------------------------------------------
export function StatNumber({
  value, unit, size = "stat",
}: { value: string | number; unit?: string; size?: "hero" | "stat" | "small" }) {
  const cls = size === "hero" ? "t-hero" : size === "small" ? "t-stat-sm" : "t-stat";
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span className={cls} style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
      {unit && (
        <span className="t-meta" style={{ fontSize: size === "hero" ? 16 : 13 }}>{unit}</span>
      )}
    </div>
  );
}

// ---- Logo -----------------------------------------------------------------
export function Logo() {
  return (
    <div className="logo">
      <span className="logo-mark">
        <svg width="26" height="26" viewBox="0 0 26 26">
          <g fill="#F4F4F5">
            <rect x="2"  y="6" width="3" height="14" rx="1.2" />
            <rect x="7"  y="2" width="3" height="22" rx="1.2" />
            <rect x="12" y="8" width="3" height="10" rx="1.2" />
            <rect x="17" y="4" width="3" height="18" rx="1.2" />
            <rect x="22" y="9" width="3" height="8"  rx="1.2" />
          </g>
        </svg>
      </span>
    </div>
  );
}
