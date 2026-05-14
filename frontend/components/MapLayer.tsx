// Global Leaflet map — mounted once at the app root as a fixed inset:0
// z-index:0 background layer. All congestion polylines, incident markers,
// the dashed risk circle, the forecast chip, and the AI route are real
// Leaflet layers pinned to Delhi NCR lat/lng. The singleton is exposed on
// `window.__mapInstance` so the MapControls can drive it from any screen.
"use client";

import { useEffect, useRef } from "react";
import {
  AI_ROUTE_POLYLINE, DELHI_CENTER, HOTSPOT, INCIDENT_MARKERS, NETWORK,
  ROAD_LABELS, SENSOR_MARKERS, WARNING_MARKERS,
} from "@/lib/data";

declare global {
  interface Window {
    __mapInstance?: import("leaflet").Map;
    __mapInitialised?: boolean;
  }
}

const COL = {
  free: "#5FB95F",
  moderate: "#E0A53C",
  heavy: "#DB4B45",
  severe: "#9F2F2B",
};

export function MapLayer() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current || window.__mapInstance) return;

    let animTimer: ReturnType<typeof setInterval> | undefined;
    let onResize: (() => void) | undefined;

    (async () => {
      const L = (await import("leaflet")).default;
      if (!ref.current || window.__mapInstance) return;

      const map = L.map(ref.current, {
        center: DELHI_CENTER,
        zoom: 11,
        zoomControl: false,
        attributionControl: true,
        preferCanvas: true,
        worldCopyJump: true,
        fadeAnimation: false,
      });

      // Esri World Imagery — satellite base
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Tiles © Esri" },
      ).addTo(map);

      // Soft label layer (places + roads) on top for orientation
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, opacity: 0.55 },
      ).addTo(map);

      const draw = (coords: number[][], level: keyof typeof COL, weight = 5) => {
        const ll = coords as [number, number][];
        L.polyline(ll, { color: "#000", opacity: 0.55, weight: weight + 3, lineCap: "round" }).addTo(map);
        return L.polyline(ll, { color: COL[level], opacity: 0.92, weight, lineCap: "round", lineJoin: "round" }).addTo(map);
      };

      draw(NETWORK.ringRoad as unknown as number[][], "moderate", 5);
      draw(NETWORK.nh48     as unknown as number[][], "heavy",    5);
      draw(NETWORK.dnd      as unknown as number[][], "severe",   5.5);
      draw(NETWORK.mgRoad   as unknown as number[][], "severe",   4.5);
      draw(NETWORK.noidaExpy as unknown as number[][], "heavy",   5);
      draw(NETWORK.outerRingN as unknown as number[][], "moderate", 4.5);
      draw(NETWORK.eastPeri as unknown as number[][], "free",     4);

      // Animated white dashes over the severe segment (DND)
      const severeOverlay = L.polyline(
        NETWORK.dnd as unknown as [number, number][],
        { color: "#fff", opacity: 0.45, weight: 2, dashArray: "4 14", lineCap: "round" },
      ).addTo(map);
      let off = 0;
      animTimer = setInterval(() => {
        off -= 1;
        const el = (severeOverlay as unknown as { getElement?: () => SVGPathElement | null }).getElement?.();
        if (el) el.setAttribute("stroke-dashoffset", String(off));
      }, 60);

      // Risk dashed circle around MG hotspot
      L.circle(HOTSPOT, {
        radius: 1800, color: "#E8843C", weight: 1, opacity: 0.55,
        dashArray: "6 8", fillColor: "#E8843C", fillOpacity: 0.08, interactive: false,
      }).addTo(map);
      L.circle(HOTSPOT, {
        radius: 900, color: "#E8843C", weight: 0,
        fillColor: "#E8843C", fillOpacity: 0.10, interactive: false,
      }).addTo(map);

      // Hotspot pin
      L.marker(HOTSPOT, {
        icon: L.divIcon({
          className: "lf-icon",
          html: '<div class="hotspot-mark"><span></span></div>',
          iconSize: [84, 84], iconAnchor: [42, 42],
        }),
        interactive: false,
      }).addTo(map);

      INCIDENT_MARKERS.forEach((c) =>
        L.marker(c, {
          icon: L.divIcon({
            className: "lf-icon",
            html: '<div class="incident-mark"></div>',
            iconSize: [18, 18], iconAnchor: [9, 9],
          }),
          interactive: false,
        }).addTo(map),
      );

      WARNING_MARKERS.forEach((c) =>
        L.marker(c, {
          icon: L.divIcon({
            className: "lf-icon",
            html: '<div class="warning-mark"></div>',
            iconSize: [16, 16], iconAnchor: [8, 8],
          }),
          interactive: false,
        }).addTo(map),
      );

      SENSOR_MARKERS.forEach((c) =>
        L.marker(c, {
          icon: L.divIcon({
            className: "lf-icon",
            html: '<div class="sensor-mark"></div>',
            iconSize: [12, 12], iconAnchor: [6, 6],
          }),
          interactive: false,
        }).addTo(map),
      );

      ROAD_LABELS.forEach(({ c, t }) =>
        L.marker(c, {
          icon: L.divIcon({
            className: "lf-icon",
            html: `<div class="label-mark">${t}</div>`,
            iconSize: [120, 14], iconAnchor: [60, 7],
          }),
          interactive: false,
        }).addTo(map),
      );

      // Floating Congestion Forecast chip
      L.marker(HOTSPOT, {
        icon: L.divIcon({
          className: "forecast-chip-icon",
          html: `
            <div class="forecast-chip">
              <div class="t-label" style="color:var(--text-tertiary); margin-bottom: 4px;">Congestion Forecast</div>
              <div style="display:flex; align-items:baseline; gap: 6px;">
                <span class="t-stat-sm">87</span>
                <span class="t-meta">% risk · MG Road Jn</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px; margin-top:8px;">
                <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--accent);"></span>
                <span style="font-size: 11px; color:var(--text-secondary);">peaks in <span style="color:var(--accent);">~22 min</span> · next hour</span>
              </div>
            </div>`,
          iconSize: [260, 92], iconAnchor: [-30, 110],
        }),
        interactive: false,
      }).addTo(map);

      // AI Recommended route (stays drawn so it's visible on /routes too)
      L.polyline(AI_ROUTE_POLYLINE, {
        color: "#E8843C", weight: 4, opacity: 0.7,
        dashArray: "6 6", lineCap: "round",
      }).addTo(map);

      window.__mapInstance = map;

      onResize = () => map.invalidateSize();
      window.addEventListener("resize", onResize);
    })();

    return () => {
      if (animTimer) clearInterval(animTimer);
      if (onResize) window.removeEventListener("resize", onResize);
      // Singleton: keep the map alive across React re-renders. Only the
      // browser tab unload truly tears it down.
    };
  }, []);

  return <div id="global-map" ref={ref} />;
}
