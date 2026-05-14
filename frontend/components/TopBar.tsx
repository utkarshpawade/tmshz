"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icons } from "./icons";
import { Logo } from "./ui";
import { toast } from "./Toast";

const NAV: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Live Map" },
  { href: "/routes",    label: "Routes" },
  { href: "/alerts",    label: "Alerts" },
  { href: "/emergency", label: "Emergency" },
  { href: "/analytics", label: "Analytics" },
];

const SEARCH_TARGETS: { name: string; href: string; kind: string }[] = [
  { name: "MG Road Corridor",  href: "/dashboard?focus=mg-road",  kind: "Corridor" },
  { name: "NH-48 Gurgaon",     href: "/dashboard?focus=nh-48",    kind: "Highway" },
  { name: "DND Flyway",        href: "/dashboard?focus=dnd",      kind: "Flyway" },
  { name: "Ring Road North",   href: "/dashboard?focus=ring",     kind: "Arterial" },
  { name: "IFFCO Chowk",       href: "/dashboard?focus=iffco",    kind: "Junction" },
  { name: "Connaught Place",   href: "/routes?from=Connaught%20Place",      kind: "Origin" },
  { name: "Cyber City",        href: "/routes?to=Cyber%20City",   kind: "Destination" },
  { name: "AIIMS",             href: "/emergency?from=AIIMS",     kind: "Hospital" },
  { name: "Max Hospital Saket",href: "/emergency?to=Max%20Hospital", kind: "Hospital" },
  { name: "Alert Center",      href: "/alerts",                   kind: "Page" },
  { name: "Analytics Dashboard", href: "/analytics",              kind: "Page" },
  { name: "Emergency Routing", href: "/emergency",                kind: "Page" },
];

export function TopBar() {
  const pathname = usePathname() || "/dashboard";
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Global keyboard shortcut: Ctrl+Shift+F to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchRef.current?.focus();
        setShowSearch(true);
      }
      if (e.key === "Escape") {
        setShowSearch(false); setShowNotif(false); setShowProfile(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const results = query.trim()
    ? SEARCH_TARGETS.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 7)
    : SEARCH_TARGETS.slice(0, 6);

  const selectResult = (href: string) => {
    setShowSearch(false); setQuery("");
    router.push(href);
  };

  return (
    <div className="topbar">
      <Logo />
      <div className="pill-row" style={{ marginLeft: 4 }}>
        {NAV.map((n) => {
          const active = pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`pill ${active ? "is-active" : ""}`}
            >
              {n.label}
            </Link>
          );
        })}
      </div>

      <div className="spacer" />

      {/* Search */}
      <div style={{ position: "relative" }}>
        <div className="search" onClick={() => setShowSearch(true)}>
          <Icons.Search size={14} />
          <input
            ref={searchRef}
            placeholder="Search corridors, junctions, pages..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            onKeyDown={(e) => { if (e.key === "Enter" && results[0]) selectResult(results[0].href); }}
          />
          <span className="kbd">Ctrl+Shift+F</span>
        </div>
        {showSearch && (
          <>
            <div onClick={() => setShowSearch(false)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
            <div
              style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)",
                width: 360, maxHeight: 400, overflow: "auto",
                background: "var(--bg-glass-strong)",
                backdropFilter: "blur(16px)",
                border: "1px solid var(--border-strong)",
                borderRadius: 12, padding: 6,
                boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
                zIndex: 61,
              }}
              className="anim-fadeup"
            >
              {results.length === 0 ? (
                <div style={{ padding: "12px 14px", color: "var(--text-tertiary)", fontSize: 12 }}>
                  No matches for &quot;{query}&quot;
                </div>
              ) : (
                results.map((r) => (
                  <button
                    key={r.href + r.name}
                    onClick={() => selectResult(r.href)}
                    style={{
                      width: "100%", textAlign: "left",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                      padding: "10px 12px", borderRadius: 8,
                      color: "var(--text-primary)", fontSize: 13,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Icons.Pin size={12} /> {r.name}
                    </span>
                    <span className="t-tick">{r.kind}</span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <button
        className="btn-icon"
        title="Connectivity status"
        onClick={() => toast("Stream healthy — 14 sensors online, 4 offline", "success")}
      >
        <Icons.Wifi size={16} />
      </button>
      <button
        className="btn-icon"
        title="Support"
        onClick={() => toast("Support: ops@traffic.delhi.gov.in · +91 11 2000-0000", "info")}
      >
        <Icons.Headset size={16} />
      </button>

      {/* Notifications */}
      <div style={{ position: "relative" }}>
        <button
          className="btn-icon"
          title="Notifications"
          style={{ position: "relative" }}
          onClick={() => setShowNotif((v) => !v)}
        >
          <Icons.Bell size={16} />
          <span
            style={{
              position: "absolute", top: -2, right: -2,
              width: 16, height: 16, borderRadius: "50%",
              background: "var(--danger)", color: "#fff",
              fontSize: 9, fontWeight: 600,
              display: "grid", placeItems: "center",
              border: "2px solid var(--bg-base)",
            }}
          >3</span>
        </button>
        {showNotif && (
          <>
            <div onClick={() => setShowNotif(false)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
            <div
              className="anim-fadeup"
              style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)",
                width: 340, maxHeight: 420, overflow: "auto",
                background: "var(--bg-glass-strong)", backdropFilter: "blur(16px)",
                border: "1px solid var(--border-strong)",
                borderRadius: 12, padding: 12,
                boxShadow: "0 20px 50px rgba(0,0,0,0.55)", zIndex: 61,
              }}
            >
              <div className="t-title" style={{ marginBottom: 10 }}>Notifications</div>
              {[
                { title: "Critical · MG Road", body: "92% congestion in 8 min — reroute via Inner Ring", t: "2m" },
                { title: "High · NH-48 Gurgaon", body: "IFFCO Chowk surge — average speed 14 km/h", t: "8m" },
                { title: "System", body: "Friday rush simulation completed successfully", t: "14m" },
              ].map((n, i) => (
                <div key={i} style={{ padding: 10, borderRadius: 8, marginBottom: 6, background: "var(--bg-surface-2)" }}>
                  <div style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 2 }}>{n.title}</div>
                  <div className="t-meta" style={{ fontSize: 12 }}>{n.body}</div>
                  <div className="t-tick" style={{ marginTop: 4 }}>{n.t} ago</div>
                </div>
              ))}
              <button className="btn btn-ghost" style={{ width: "100%", marginTop: 4, height: 32, fontSize: 12 }}
                onClick={() => { setShowNotif(false); router.push("/alerts"); }}>
                Open Alert Center
              </button>
            </div>
          </>
        )}
      </div>

      {/* Profile */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setShowProfile((v) => !v)}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg, #3a3530, #1c1a18)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-primary)",
            fontSize: 12, fontWeight: 600, marginLeft: 4,
            display: "grid", placeItems: "center", cursor: "pointer",
          }}
        >SS</button>
        {showProfile && (
          <>
            <div onClick={() => setShowProfile(false)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
            <div
              className="anim-fadeup"
              style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)",
                width: 240,
                background: "var(--bg-glass-strong)", backdropFilter: "blur(16px)",
                border: "1px solid var(--border-strong)",
                borderRadius: 12, padding: 8,
                boxShadow: "0 20px 50px rgba(0,0,0,0.55)", zIndex: 61,
              }}
            >
              <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)", marginBottom: 6 }}>
                <div style={{ fontSize: 13, color: "var(--text-primary)" }}>Sunil Sharma</div>
                <div className="t-tick">Dispatch Lead · Delhi NCR</div>
              </div>
              {[
                { label: "Profile", action: () => toast("Profile editor coming soon") },
                { label: "Settings", action: () => toast("Preferences saved — auto theme") },
                { label: "Keyboard Shortcuts", action: () => toast("Ctrl+Shift+F = Search · Esc = Close") },
                { label: "Sign out", action: () => toast("Session ended (demo)", "danger") },
              ].map((m) => (
                <button
                  key={m.label}
                  onClick={() => { m.action(); setShowProfile(false); }}
                  style={{ width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 8, fontSize: 13, color: "var(--text-primary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >{m.label}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
