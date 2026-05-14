// Real interactive map using TomTom raster tiles + Traffic Flow + Traffic Incidents.
// - Drag, zoom, click-to-query are all native Leaflet behaviors.
// - Click anywhere -> queries TomTom Flow Segment Data API for that point.
// - Toggle Traffic Flow / Incidents / Heatmap overlays.
// - Renders backend segments + alerts as overlays.
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Icons } from "./icons";
import { api, type HeatmapHighRiskZone } from "@/lib/api";

const TOMTOM_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || "";

const DELHI_CENTER: [number, number] = [28.6139, 77.2090];

type Segment = {
  id: number;
  name: string;
  code?: string;
  segment_type: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  geometry?: { coordinates?: number[][] } | null;
};

type FlowPoint = {
  currentSpeed: number;
  freeFlowSpeed: number;
  currentTravelTime: number;
  freeFlowTravelTime: number;
  confidence: number;
  roadClosure: boolean;
};

interface Props {
  height?: number | string;
  showControls?: boolean;
  initialZoom?: number;
  center?: [number, number];
  onPointSelect?: (latlng: [number, number], flow: FlowPoint | null) => void;
  fitToSegments?: boolean;
  showLegend?: boolean;
}

export function TrafficMap({
  height = 520,
  showControls = true,
  initialZoom = 11,
  center = DELHI_CENTER,
  onPointSelect,
  fitToSegments = true,
  showLegend = true,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const baseLayerRef = useRef<import("leaflet").TileLayer | null>(null);
  const trafficLayerRef = useRef<import("leaflet").TileLayer | null>(null);
  const incidentsLayerRef = useRef<import("leaflet").TileLayer | null>(null);
  const heatmapGroupRef = useRef<import("leaflet").LayerGroup | null>(null);
  const segmentsGroupRef = useRef<import("leaflet").LayerGroup | null>(null);
  const queryMarkerRef = useRef<import("leaflet").Marker | null>(null);

  const [traffic, setTraffic] = useState(true);
  const [incidents, setIncidents] = useState(true);
  const [heatmap, setHeatmap] = useState(false);
  const [mapTheme, setMapTheme] = useState<"dark" | "light">("dark");
  const [hasKey, setHasKey] = useState(!!TOMTOM_KEY);
  const [loadingFlow, setLoadingFlow] = useState(false);
  const [popup, setPopup] = useState<{ lat: number; lng: number; flow: FlowPoint | null; address?: string } | null>(null);

  // Build the base-tile URL for a given theme (TomTom if keyed, CARTO otherwise).
  const baseTileUrl = (theme: "dark" | "light") => {
    if (TOMTOM_KEY) {
      const style = theme === "dark" ? "night" : "main";
      return `https://api.tomtom.com/map/1/tile/basic/${style}/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`;
    }
    return theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  };

  const flowTileUrl = (theme: "dark" | "light") =>
    `https://api.tomtom.com/traffic/map/4/tile/flow/${theme === "dark" ? "relative-dark" : "relative"}/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`;

  // Initialize the map
  useEffect(() => {
    let cancelled = false;
    if (!hostRef.current) return;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !hostRef.current || mapRef.current) return;

      const map = L.map(hostRef.current, {
        center,
        zoom: initialZoom,
        zoomControl: false,
        attributionControl: true,
        preferCanvas: false,
        worldCopyJump: true,
      });

      // Base tiles -- starts dark; togglable to light via the controls.
      const base = L.tileLayer(baseTileUrl("dark"), {
        maxZoom: TOMTOM_KEY ? 22 : 19,
        attribution: TOMTOM_KEY
          ? '&copy; <a href="https://www.tomtom.com">TomTom</a>'
          : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
      }).addTo(map);
      baseLayerRef.current = base;
      if (!TOMTOM_KEY) setHasKey(false);

      // Traffic flow + incidents layers (TomTom)
      if (TOMTOM_KEY) {
        const flow = L.tileLayer(flowTileUrl("dark"), { maxZoom: 22, opacity: 0.85 });
        const inc = L.tileLayer(
          `https://api.tomtom.com/traffic/map/4/tile/incidents/s3/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`,
          { maxZoom: 22, opacity: 0.95 },
        );
        if (traffic) flow.addTo(map);
        if (incidents) inc.addTo(map);
        trafficLayerRef.current = flow;
        incidentsLayerRef.current = inc;
      }

      heatmapGroupRef.current = L.layerGroup();
      segmentsGroupRef.current = L.layerGroup().addTo(map);

      // Click -> query Flow API
      map.on("click", async (e: import("leaflet").LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        await queryPoint(lat, lng);
      });

      mapRef.current = map;

      // Load segments + heatmap from backend (best-effort)
      try {
        const raw = await fetch("/api/segments", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : []));
        const segs = (Array.isArray(raw) ? raw : []) as Segment[];
        drawSegments(segs);
      } catch { /* fine -- backend may be down */ }
      try {
        const h = await api.heatmap();
        drawHighRiskZones(h.high_risk_zones);
      } catch { /* fine */ }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawSegments = useCallback(async (segs: Segment[]) => {
    const L = (await import("leaflet")).default;
    const grp = segmentsGroupRef.current;
    if (!grp) return;
    grp.clearLayers();

    // Per-type road palette. Casing is the dark outer outline; surface is the
    // tinted road body; centerline is the dashed lane marker that animates.
    const PALETTE: Record<string, { surface: string; centerline: string; weight: number }> = {
      highway:  { surface: "#E8843C", centerline: "#FFE6CC", weight: 7 },
      arterial: { surface: "#F4A261", centerline: "#FFFFFF", weight: 6 },
      corridor: { surface: "#5FB95F", centerline: "#FFFFFF", weight: 6 },
      junction: { surface: "#DB4B45", centerline: "#FFE6E6", weight: 5 },
      _default: { surface: "#E8843C", centerline: "#FFFFFF", weight: 6 },
    };

    segs.forEach((s) => {
      const coords =
        s.geometry?.coordinates && s.geometry.coordinates.length > 0
          ? (s.geometry.coordinates as number[][]).map((c) => [c[1], c[0]] as [number, number])
          : [
              [s.start_lat, s.start_lng] as [number, number],
              [s.end_lat, s.end_lng] as [number, number],
            ];

      const p = PALETTE[s.segment_type] || PALETTE._default;

      // 1) Outer casing — dark, soft so it blends with the basemap
      const casing = L.polyline(coords, {
        color: "#0C0C0D",
        opacity: 0.55,
        weight: p.weight + 4,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      });

      // 2) Road surface — tinted by segment type
      const surface = L.polyline(coords, {
        color: p.surface,
        opacity: 0.92,
        weight: p.weight,
        lineCap: "round",
        lineJoin: "round",
        className: "hwy-surface",
      });

      // 3) Animated centerline — dashed white lane markers that flow
      const centerline = L.polyline(coords, {
        color: p.centerline,
        opacity: 0.95,
        weight: Math.max(1.5, p.weight - 4),
        lineCap: "butt",
        dashArray: "14 18",
        className: "hwy-flow",
      });

      const tooltip = `
        <div style="font-size:11px;line-height:1.45;min-width:140px">
          <div style="font-weight:600;color:${p.surface};text-transform:uppercase;letter-spacing:0.08em;font-size:9px;margin-bottom:3px">${escapeHtml(s.segment_type)}</div>
          <div style="color:#F4F4F5;font-weight:600">${escapeHtml(s.name)}</div>
          <div style="color:#9A9AA0;margin-top:2px">click to query live flow</div>
        </div>`;
      surface.bindTooltip(tooltip, { sticky: true, direction: "top", offset: [0, -6] });
      surface.on("click", async (e) => {
        e.originalEvent?.stopPropagation();
        const mid = coords[Math.floor(coords.length / 2)];
        await queryPoint(mid[0], mid[1], s.name);
      });
      // hover lift
      surface.on("mouseover", () => surface.setStyle({ weight: p.weight + 2, opacity: 1 }));
      surface.on("mouseout",  () => surface.setStyle({ weight: p.weight,     opacity: 0.92 }));

      casing.addTo(grp);
      surface.addTo(grp);
      centerline.addTo(grp);
    });

    if (fitToSegments && segs.length > 0 && mapRef.current) {
      const all = segs.flatMap((s) => [
        [s.start_lat, s.start_lng] as [number, number],
        [s.end_lat, s.end_lng] as [number, number],
      ]);
      mapRef.current.fitBounds(L.latLngBounds(all), { padding: [40, 40] });
    }
  }, [fitToSegments]);

  const drawHighRiskZones = useCallback(async (zones: HeatmapHighRiskZone[]) => {
    const L = (await import("leaflet")).default;
    const grp = heatmapGroupRef.current;
    if (!grp) return;
    grp.clearLayers();
    zones.forEach((z) => {
      const r = 280 + (z.risk_score / 100) * 700;
      const intense = z.risk_score >= 75;
      L.circle([z.lat, z.lng], {
        radius: r * 2,
        color: intense ? "#DB4B45" : "#E0A53C",
        weight: 1,
        opacity: 0.5,
        dashArray: "4 8",
        fillColor: intense ? "#DB4B45" : "#E0A53C",
        fillOpacity: 0.10,
      }).addTo(grp);
      L.circle([z.lat, z.lng], {
        radius: r,
        color: intense ? "#DB4B45" : "#E0A53C",
        weight: 0,
        fillColor: intense ? "#DB4B45" : "#E0A53C",
        fillOpacity: 0.18,
      }).addTo(grp);
      L.marker([z.lat, z.lng], {
        icon: L.divIcon({
          className: "lf-icon",
          html: `<div class="${intense ? "incident-mark" : "warning-mark"}"></div>`,
          iconSize: [18, 18], iconAnchor: [9, 9],
        }),
      })
        .bindPopup(
          `<div style="min-width:160px"><strong>${escapeHtml(z.name)}</strong><br/>
           Risk <span style="color:${intense ? "#DB4B45" : "#E0A53C"}">${Math.round(z.risk_score)}%</span> ·
           ${z.congestion_label}<br/>Peaks in ${z.eta_peak_min} min</div>`,
        )
        .addTo(grp);
    });
  }, []);

  // Toggle traffic / incidents / heatmap layers
  useEffect(() => {
    const map = mapRef.current;
    const layer = trafficLayerRef.current;
    if (!map || !layer) return;
    if (traffic) layer.addTo(map);
    else layer.remove();
  }, [traffic]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = incidentsLayerRef.current;
    if (!map || !layer) return;
    if (incidents) layer.addTo(map);
    else layer.remove();
  }, [incidents]);

  useEffect(() => {
    const map = mapRef.current;
    const grp = heatmapGroupRef.current;
    if (!map || !grp) return;
    if (heatmap) grp.addTo(map);
    else grp.remove();
  }, [heatmap]);

  // Re-skin tiles when the user flips dark <-> light.
  useEffect(() => {
    const base = baseLayerRef.current;
    if (base) base.setUrl(baseTileUrl(mapTheme));
    const flow = trafficLayerRef.current;
    if (flow && TOMTOM_KEY) flow.setUrl(flowTileUrl(mapTheme));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapTheme]);

  // Query the TomTom Flow Segment Data API for a point
  const queryPoint = useCallback(async (lat: number, lng: number, knownName?: string) => {
    setLoadingFlow(true);
    const L = (await import("leaflet")).default;
    const map = mapRef.current;
    if (!map) { setLoadingFlow(false); return; }

    // Place / move marker
    if (queryMarkerRef.current) {
      queryMarkerRef.current.setLatLng([lat, lng]);
    } else {
      queryMarkerRef.current = L.marker([lat, lng], {
        icon: L.divIcon({
          className: "lf-icon",
          html: '<div class="hotspot-mark"><span></span></div>',
          iconSize: [64, 64], iconAnchor: [32, 32],
        }),
      }).addTo(map);
    }

    let flow: FlowPoint | null = null;
    let address = knownName;

    if (TOMTOM_KEY) {
      // Flow segment data (returns the road segment containing the point)
      try {
        const r = await fetch(
          `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative-dark/10/json?point=${lat},${lng}&unit=KMPH&key=${TOMTOM_KEY}`,
        );
        if (r.ok) {
          const data = await r.json();
          const fd = data?.flowSegmentData;
          if (fd) {
            flow = {
              currentSpeed: fd.currentSpeed,
              freeFlowSpeed: fd.freeFlowSpeed,
              currentTravelTime: fd.currentTravelTime,
              freeFlowTravelTime: fd.freeFlowTravelTime,
              confidence: fd.confidence,
              roadClosure: fd.roadClosure,
            };
          }
        }
      } catch { /* network issue -- show no-data popup */ }

      // Reverse geocode for the road name
      if (!address) {
        try {
          const r = await fetch(
            `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${TOMTOM_KEY}`,
          );
          if (r.ok) {
            const data = await r.json();
            const a = data?.addresses?.[0]?.address;
            address = a?.freeformAddress || a?.streetName || undefined;
          }
        } catch { /* fine */ }
      }
    }

    setPopup({ lat, lng, flow, address });
    setLoadingFlow(false);
    onPointSelect?.([lat, lng], flow);
  }, [onPointSelect]);

  return (
    <div className={`map-wrap ${mapTheme === "light" ? "light-map" : ""}`} style={{ height }}>
      <div ref={hostRef} className="map-host" style={{ height: "100%", width: "100%" }} />

      {/* Zoom controls */}
      {showControls && (
        <div className="map-ctrl is-zoom" style={{ right: 12, bottom: 12, flexDirection: "column" }}>
          <button title="Zoom in" onClick={() => mapRef.current?.zoomIn()}><Icons.Plus size={14} /></button>
          <button title="Reset view" onClick={() => mapRef.current?.setView(center, initialZoom)}>
            <Icons.Map size={14} />
          </button>
          <button title="Zoom out" onClick={() => mapRef.current?.zoomOut()}><Icons.Minus size={14} /></button>
        </div>
      )}

      {/* Layer toggles */}
      {showControls && (
        <div className="map-ctrl" style={{ left: 12, top: 12, flexDirection: "row" }}>
          <button
            className={traffic ? "is-active" : ""}
            onClick={() => setTraffic((v) => !v)}
            title={hasKey ? "Toggle live traffic flow" : "TomTom key missing — set NEXT_PUBLIC_TOMTOM_API_KEY"}
            disabled={!hasKey}
          >
            <Icons.Route size={14} />
            <span style={{ marginLeft: 6, fontSize: 11 }}>Traffic</span>
          </button>
          <button
            className={incidents ? "is-active" : ""}
            onClick={() => setIncidents((v) => !v)}
            title="Toggle traffic incidents"
            disabled={!hasKey}
          >
            <Icons.Triangle size={14} />
            <span style={{ marginLeft: 6, fontSize: 11 }}>Incidents</span>
          </button>
          <button
            className={heatmap ? "is-active" : ""}
            onClick={() => setHeatmap((v) => !v)}
            title="Toggle congestion heatmap (from your data)"
          >
            <Icons.Layer size={14} />
            <span style={{ marginLeft: 6, fontSize: 11 }}>Heatmap</span>
          </button>
          <button
            className={mapTheme === "light" ? "is-active" : ""}
            onClick={() => setMapTheme((v) => (v === "dark" ? "light" : "dark"))}
            title={mapTheme === "dark" ? "Switch map to light mode" : "Switch map to dark mode"}
          >
            <Icons.Sparkles size={14} />
            <span style={{ marginLeft: 6, fontSize: 11 }}>{mapTheme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>
      )}

      {/* Legend */}
      {showLegend && hasKey && (
        <div
          className="glass map-legend"
          style={{
            position: "absolute", right: 12, top: 12, padding: "10px 12px",
            display: "flex", flexDirection: "column", gap: 6,
            fontSize: 11, color: "var(--text-secondary)", zIndex: 4,
          }}
        >
          <div className="t-label" style={{ marginBottom: 2 }}>Traffic Flow</div>
          <Row color="#5FB95F" label="Free flowing" />
          <Row color="#E0A53C" label="Slow" />
          <Row color="#E8843C" label="Congested" />
          <Row color="#DB4B45" label="Standstill" />
        </div>
      )}

      {/* No-key banner */}
      {!hasKey && (
        <div
          style={{
            position: "absolute", left: 12, bottom: 12,
            padding: "8px 12px", fontSize: 11,
            background: "var(--danger-soft)",
            color: "var(--danger)",
            border: "1px solid rgba(219,75,69,0.30)",
            borderRadius: 8, zIndex: 4,
            maxWidth: 360,
          }}
        >
          <strong>TomTom API key missing.</strong> Add <code>NEXT_PUBLIC_TOMTOM_API_KEY</code> to .env to enable
          live traffic flow + incidents. The map is functional with OSM tiles.
        </div>
      )}

      {/* Flow popup */}
      {popup && (
        <div
          className="glass-strong anim-fadeup"
          style={{
            position: "absolute", left: 12, bottom: 12, padding: "14px 16px",
            width: 280, zIndex: 5, pointerEvents: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div className="t-title" style={{ fontSize: 13 }}>
              {popup.address || `Pin · ${popup.lat.toFixed(4)}, ${popup.lng.toFixed(4)}`}
            </div>
            <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={() => setPopup(null)}>
              <Icons.Close size={11} />
            </button>
          </div>
          {loadingFlow ? (
            <div className="t-meta" style={{ fontSize: 12 }}>
              <span className="spin" style={{ display: "inline-block", width: 12, height: 12, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%", marginRight: 8, verticalAlign: "middle" }} />
              Querying live flow...
            </div>
          ) : popup.flow ? (
            <FlowSummary flow={popup.flow} />
          ) : (
            <div className="t-meta" style={{ fontSize: 12 }}>
              No flow data available for this point. Try clicking a major road.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 18, height: 3, borderRadius: 2, background: color, display: "inline-block" }} />
      {label}
    </div>
  );
}

function FlowSummary({ flow }: { flow: FlowPoint }) {
  const ratio = flow.freeFlowSpeed > 0 ? flow.currentSpeed / flow.freeFlowSpeed : 1;
  const status =
    ratio >= 0.85 ? { label: "Free flowing", c: "var(--success)" } :
    ratio >= 0.60 ? { label: "Moderate",     c: "var(--warning)" } :
    ratio >= 0.35 ? { label: "Congested",    c: "var(--accent)" } :
                    { label: "Standstill",   c: "var(--danger)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span className="t-stat-sm tabular" style={{ color: status.c }}>{Math.round(flow.currentSpeed)}</span>
        <span className="t-meta">km/h · current</span>
      </div>
      <div className="t-tick">
        Free-flow {Math.round(flow.freeFlowSpeed)} km/h · ratio {(ratio * 100).toFixed(0)}%
      </div>
      <div
        style={{
          height: 6, borderRadius: 999, background: "var(--bg-surface-2)",
          overflow: "hidden", position: "relative",
        }}
      >
        <div
          style={{
            width: `${Math.min(100, ratio * 100)}%`, height: "100%",
            background: status.c, transition: "width .4s ease",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span
          className="badge"
          style={{
            color: status.c, background: "transparent",
            borderColor: status.c, fontSize: 10, padding: "2px 8px",
          }}
        >
          <span className="badge-dot" /> {status.label}
        </span>
        <span className="t-tick">
          Confidence {(flow.confidence * 100).toFixed(0)}%
        </span>
      </div>
      {flow.roadClosure && (
        <div style={{ color: "var(--danger)", fontSize: 11, fontWeight: 500 }}>
          ROAD CLOSURE reported on this segment
        </div>
      )}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c),
  );
}
