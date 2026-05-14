// Charts (Recharts). Tuned to match the design's hand-rolled SVG look:
// 1.5px accent lines, gradient fill, dashed target line, muted gridlines.
"use client";

import {
  Area, AreaChart, RadialBar, RadialBarChart, ReferenceLine,
  ResponsiveContainer, XAxis, YAxis,
} from "recharts";

const ACCENT = "#E8843C";
const TERT = "#5C5C60";
const BORDER = "rgba(255,255,255,0.07)";

// ---- Sparkline (KPI inline mini-chart) -----------------------------------
export function Sparkline({
  data, color = ACCENT, height = 36,
}: { data: number[]; color?: string; height?: number }) {
  const rows = data.map((v, i) => ({ i, v }));
  const id = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="i" hide />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Operational efficiency stream chart ---------------------------------
export function StreamChart({
  data, target = 80, xLabels = [], height = 110,
}: { data: number[]; target?: number; xLabels?: string[]; height?: number }) {
  const rows = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 4, bottom: 18, left: 4 }}>
          <defs>
            <linearGradient id="streamGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="i" tickLine={false} axisLine={false}
            tick={{ fill: TERT, fontSize: 9 }}
            ticks={xLabels.map((_, idx) =>
              Math.round((idx / (xLabels.length - 1)) * (data.length - 1))
            )}
            tickFormatter={(_v, idx) => xLabels[idx] ?? ""}
            interval={0}
          />
          <YAxis hide domain={[60, 105]} />
          <ReferenceLine y={target} stroke={TERT} strokeDasharray="4 4" strokeWidth={0.8} />
          {[25, 50, 75].map((p) => (
            <ReferenceLine key={p} y={60 + (p / 100) * 45} stroke={BORDER} strokeWidth={0.6} />
          ))}
          <Area type="monotone" dataKey="v" stroke={ACCENT} strokeWidth={1.5} fill="url(#streamGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- 60-minute forecast chart --------------------------------------------
export function ForecastChart({
  data, height = 80,
}: { data: number[]; height?: number }) {
  const rows = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 6, right: 4, bottom: 12, left: 4 }}>
          <defs>
            <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="i" hide />
          <YAxis hide domain={[20, 100]} />
          <ReferenceLine y={70} stroke={TERT} strokeDasharray="3 3" strokeWidth={0.6} />
          <Area type="monotone" dataKey="v" stroke={ACCENT} strokeWidth={1.5} fill="url(#fcGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Radial congestion-risk gauge ----------------------------------------
export function Gauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const color =
    v > 80 ? "#DB4B45" : v > 60 ? ACCENT : v > 40 ? "#E0A53C" : "#5FB95F";
  const sevLabel = v > 80 ? "Critical" : v > 60 ? "High" : v > 40 ? "Medium" : "Low";

  // Recharts RadialBarChart from 225° -> -45° = 270° sweep (matches design).
  const data = [{ name: "risk", value: v, fill: color }];

  return (
    <div style={{ position: "relative", width: 160, height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={data}
          innerRadius={52}
          outerRadius={68}
          startAngle={225}
          endAngle={-45}
          barSize={8}
        >
          <RadialBar
            background={{ fill: "#1E1E20" }}
            cornerRadius={6}
            dataKey="value"
            fill={color}
            isAnimationActive
          />
        </RadialBarChart>
      </ResponsiveContainer>
      {/* Absolutely-centered label stack — uses the SVG's geometric center,
          not the bottom-heavy default of grid place-items. */}
      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
          transform: "translateY(-6px)",
        }}
      >
        <span className="t-stat-sm tabular" style={{ color, lineHeight: 1 }}>{v}</span>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {sevLabel} Risk
        </span>
      </div>
    </div>
  );
}
