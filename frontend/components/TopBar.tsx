// Sticky top bar — logo + pill nav (Next Link) + search + system icons.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "./icons";
import { Logo } from "./ui";

const NAV: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Live Map" },
  { href: "/routes",    label: "Routes" },
  { href: "/alerts",    label: "Alerts" },
  { href: "/emergency", label: "Emergency" },
  { href: "/analytics", label: "Analytics" },
];

export function TopBar() {
  const pathname = usePathname() || "/dashboard";
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

      <div className="search">
        <Icons.Search size={14} />
        <input placeholder="Search corridors, junctions, vehicles..." />
        <span className="kbd">Ctrl+Shift+F</span>
      </div>

      <button className="btn-icon" title="Connectivity"><Icons.Wifi size={16} /></button>
      <button className="btn-icon" title="Support"><Icons.Headset size={16} /></button>
      <button className="btn-icon" title="Notifications" style={{ position: "relative" }}>
        <Icons.Bell size={16} />
        <span
          style={{
            position: "absolute", top: -2, right: -2,
            width: 16, height: 16, borderRadius: "50%",
            background: "var(--danger)", color: "#fff",
            fontSize: 9, fontWeight: 500,
            display: "grid", placeItems: "center",
            border: "2px solid var(--bg-base)",
          }}
        >3</span>
      </button>
      <button
        style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, #3a3530, #1c1a18)",
          border: "1px solid var(--border-strong)",
          color: "var(--text-secondary)",
          fontSize: 12, fontWeight: 500, marginLeft: 4,
          display: "grid", placeItems: "center", cursor: "pointer",
        }}
      >RK</button>
    </div>
  );
}
