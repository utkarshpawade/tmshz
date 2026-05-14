// Mobile-only experience for VeloCT — Traffic Management System.
// Only rendered at <= 768px (toggled by CSS .mobile-only). The web layout
// remains untouched. Designed to feel like a native operations cockpit:
// glassy app bar, hero greeting, KPI grid, live map slice, AI insights
// panel, and a floating tab bar for quick navigation.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icons } from "./icons";
import { CityMap } from "./MapSlot";
import { KpiHeatmap } from "./KpiHeatmap";
import { api, type StatsResponse, type HeatmapHighRiskZone } from "@/lib/api";

const TABS = [
  { href: "/dashboard", label: "Home",      icon: <Icons.Map size={16} /> },
  { href: "/routes",    label: "Routes",    icon: <Icons.Route size={16} /> },
  { href: "/alerts",    label: "Alerts",    icon: <Icons.Bell size={16} /> },
  { href: "/emergency", label: "Emergency", icon: <Icons.Amb size={16} /> },
  { href: "/analytics", label: "Insights",  icon: <Icons.Layer size={16} /> },
];

export function MobileShell({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname() || "/dashboard";
  const isHome = pathname.startsWith("/dashboard");
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [zones, setZones] = useState<HeatmapHighRiskZone[]>([]);

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
    api.heatmap().then((h) => setZones(h.high_risk_zones || [])).catch(() => {});
  }, []);

  return (
    <div className="m-shell">
      <MobileAppBar />
      {isHome ? (
        <div className="m-screen">
          <Greeting stats={stats} />
          <KpiGrid stats={stats} />
          <LiveSnap />
          <RiskList zones={zones} />
          <AiInsights stats={stats} />
          <QuickActions />
        </div>
      ) : (
        // For non-home pages, let the inner page own its padding so we don't
        // double up. The `m-screen-flush` modifier zeros the wrapper padding.
        <div className="m-screen m-screen-flush">{children}</div>
      )}
      <MobileTabBar pathname={pathname} />
    </div>
  );
}

function MobileAppBar() {
  return (
    <div className="m-appbar">
      <div className="m-brand">
        <span className="logo-mark">
          <svg width="22" height="22" viewBox="0 0 26 26">
            <g fill="#F4F4F5">
              <rect x="2"  y="6" width="3" height="14" rx="1.2" />
              <rect x="7"  y="2" width="3" height="22" rx="1.2" />
              <rect x="12" y="8" width="3" height="10" rx="1.2" />
              <rect x="17" y="4" width="3" height="18" rx="1.2" />
              <rect x="22" y="9" width="3" height="8"  rx="1.2" />
            </g>
          </svg>
        </span>
        <span className="logo-word">
          <span className="logo-name" style={{ fontSize: 18 }}>VeloCT</span>
          <span className="logo-sub" style={{ fontSize: 8 }}>AI-powered Traffic Congestion Predictor</span>
        </span>
      </div>
      <button
        className="btn-icon"
        aria-label="Notifications"
        style={{ position: "relative" }}
      >
        <Icons.Bell size={16} />
        <span
          style={{
            position: "absolute", top: -2, right: -2,
            width: 14, height: 14, borderRadius: "50%",
            background: "var(--danger)", color: "#fff",
            fontSize: 8, fontWeight: 600,
            display: "grid", placeItems: "center",
            border: "2px solid var(--bg-base)",
          }}
        >3</span>
      </button>
    </div>
  );
}

function Greeting({ stats }: { stats: StatsResponse | null }) {
  const hour = new Date().getHours();
  const greet = hour < 5 ? "Late shift" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const risk = Math.round(stats?.city_risk_score ?? 52);
  const label = risk > 75 ? "Critical" : risk > 55 ? "Medium" : risk > 35 ? "Watching" : "Calm";

  return (
    <div>
      <div className="t-section" style={{ marginBottom: 6 }}>Delhi NCR · Live</div>
      <div className="m-greet">{greet},<br />Dispatch.</div>
      <div className="m-sub">
        City risk <strong style={{ color: "var(--accent)" }}>{risk}</strong> · {label}.
        Tap any KPI to dive in.
      </div>
    </div>
  );
}

function KpiGrid({ stats }: { stats: StatsResponse | null }) {
  const items = [
    { label: "Avg speed",        value: stats?.avg_speed_kmh?.toFixed(0) ?? "26", unit: "km/h", tone: "success" as const, intensity: 70 },
    { label: "Active incidents", value: stats?.active_incidents?.toString() ?? "0", unit: "live", tone: "danger" as const,  intensity: (stats?.active_incidents ?? 0) * 10 + 20 },
    { label: "Open alerts",      value: stats?.alert_count?.toString() ?? "7",  unit: "today", tone: "warning" as const, intensity: (stats?.alert_count ?? 7) * 4 },
    { label: "Segments",         value: stats?.monitored_segments?.toString() ?? "15", unit: "of 15", tone: "accent" as const, intensity: 60 },
  ];
  return (
    <div className="m-kpis">
      {items.map((k) => (
        <div key={k.label} className="m-kpi">
          <span className="glow" />
          <div className="label">{k.label}</div>
          <div>
            <span className="value">{k.value}</span>
            <span className="unit">{k.unit}</span>
          </div>
          <KpiHeatmap
            label={k.label}
            value={Math.max(15, Math.min(100, k.intensity))}
            tone={k.tone}
            hours={12}
            showLegend={false}
          />
        </div>
      ))}
    </div>
  );
}

function LiveSnap() {
  return (
    <div className="m-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 8px" }}>
        <div className="m-card-title" style={{ marginBottom: 0 }}>Live Map</div>
        <Link href="/dashboard" className="m-pill" style={{ fontSize: 11 }}>
          Open full <Icons.ArrowR size={12} />
        </Link>
      </div>
      <div style={{ height: 240 }}>
        <CityMap height={240} showControls={false} showLegend={false} />
      </div>
    </div>
  );
}

function RiskList({ zones }: { zones: HeatmapHighRiskZone[] }) {
  const top = zones.slice(0, 4);
  return (
    <div className="m-card">
      <div className="m-card-title">Top High-Risk Zones</div>
      {top.length === 0 && <div className="t-meta">No live zones — backend offline.</div>}
      {top.map((z, i) => (
        <div className="m-row" key={z.segment_id ?? i}>
          <div>
            <div className="name">{z.name}</div>
            <div className="meta">peaks in {z.eta_peak_min} min · {z.congestion_label}</div>
          </div>
          <span
            style={{
              fontFamily: "Fraunces, serif",
              fontStyle: "italic", fontWeight: 700,
              fontSize: 18,
              color: z.risk_score >= 80 ? "var(--danger)" : z.risk_score >= 65 ? "var(--accent)" : "var(--warning)",
            }}
          >
            {Math.round(z.risk_score)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function AiInsights({ stats }: { stats: StatsResponse | null }) {
  return (
    <div className="m-card" style={{ borderColor: "rgba(232,132,60,0.32)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: "var(--accent)" }}><Icons.Sparkles size={14} /></span>
        <div className="m-card-title" style={{ marginBottom: 0 }}>AI Recommendation</div>
      </div>
      <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.55 }}>
        City running <strong>{stats?.operational_efficiency_pct?.toFixed(0) ?? "78"}%</strong> efficient.
        Dispatch a marshal to IFFCO Chowk in the next 8 min to prevent the predicted 91% surge.
      </div>
      <button className="btn btn-primary" style={{ width: "100%", marginTop: 12, height: 38 }}>
        <Icons.Zap size={12} /> Dispatch marshal
      </button>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { label: "Route",      icon: <Icons.Route size={14} />,    href: "/routes" },
    { label: "Emergency",  icon: <Icons.Amb size={14} />,      href: "/emergency" },
    { label: "Alerts",     icon: <Icons.Bell size={14} />,     href: "/alerts" },
    { label: "Analytics",  icon: <Icons.Layer size={14} />,    href: "/analytics" },
  ];
  return (
    <div className="m-card">
      <div className="m-card-title">Quick Actions</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="m-pill"
            style={{ justifyContent: "center", padding: "14px 12px", fontSize: 13, color: "var(--text-primary)" }}
          >
            {a.icon} {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function MobileTabBar({ pathname }: { pathname: string }) {
  return (
    <nav className="m-tabbar" aria-label="Primary">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={active ? "is-active" : ""}>
            {t.icon}
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
