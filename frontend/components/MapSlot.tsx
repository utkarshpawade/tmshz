// Transparent passthrough where the global Leaflet map shows through.
// Renders the floating chrome (zoom controls + legend) inside the slot.
"use client";

import type { ReactNode } from "react";
import { Icons } from "./icons";
import { DELHI_CENTER } from "@/lib/data";

export function MapControls() {
  const m = () =>
    (typeof window !== "undefined" ? window.__mapInstance : undefined);
  const zoomIn = () => {
    const map = m();
    if (map) map.setZoom(map.getZoom() + 1, { animate: false });
  };
  const zoomOut = () => {
    const map = m();
    if (map) map.setZoom(map.getZoom() - 1, { animate: false });
  };
  const recenter = () => {
    const map = m();
    if (map) map.setView(DELHI_CENTER, 11, { animate: false });
  };
  return (
    <div
      style={{
        position: "absolute", left: 18, bottom: 18,
        display: "flex", flexDirection: "column", gap: 8,
        pointerEvents: "auto",
      }}
    >
      <button className="btn-icon" onClick={zoomIn} title="Zoom in"><Icons.Plus size={14} /></button>
      <button className="btn-icon" onClick={recenter} title="Recenter"><Icons.Gear size={14} /></button>
      <button className="btn-icon" onClick={zoomOut} title="Zoom out"><Icons.Minus size={14} /></button>
    </div>
  );
}

export function MapLegend({
  items,
}: { items?: { c: string; t: string }[] }) {
  const list = items ?? [
    { c: "var(--success)", t: "Free" },
    { c: "var(--warning)", t: "Slow" },
    { c: "var(--danger)",  t: "Heavy" },
  ];
  return (
    <div
      className="glass"
      style={{
        position: "absolute", right: 14, bottom: 14, padding: "10px 12px",
        display: "flex", alignItems: "center", gap: 14, fontSize: 11,
        color: "var(--text-secondary)", pointerEvents: "auto",
      }}
    >
      {list.map((x, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 2, background: x.c, borderRadius: 2 }} />
          {x.t}
        </span>
      ))}
    </div>
  );
}

export function CityMap({
  showControls = true, showLegend = true, legend, children,
}: {
  showControls?: boolean;
  showLegend?: boolean;
  legend?: { c: string; t: string }[];
  children?: ReactNode;
}) {
  return (
    <div className="map-slot">
      {children}
      {showControls && <MapControls />}
      {showLegend && <MapLegend items={legend} />}
    </div>
  );
}
