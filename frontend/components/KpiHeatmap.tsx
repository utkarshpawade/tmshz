// KPI Heatmap — a deterministic 24-hour intensity strip used on KPI cards.
// Each cell represents one hour; intensity is driven by the KPI's current
// value plus a hash of its label so it looks plausible and stable.
"use client";

import { useMemo } from "react";

type Tone = "accent" | "danger" | "success" | "warning" | "info";

const TONE_COLORS: Record<Tone, string> = {
  accent:  "232, 132, 60",
  danger:  "219, 75, 69",
  success: "95, 185, 95",
  warning: "224, 165, 60",
  info:    "79, 182, 242",
};

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

export function KpiHeatmap({
  label,
  value,
  tone = "accent",
  hours = 24,
  showLegend = true,
}: {
  label: string;
  value: number;
  tone?: Tone;
  hours?: number;
  showLegend?: boolean;
}) {
  const cells = useMemo(() => {
    const seed = hash(label) || 1;
    const norm = Math.max(0.05, Math.min(1, value / 100));
    return Array.from({ length: hours }, (_, i) => {
      // pseudo-random but stable per (label, i)
      const r = ((seed * (i + 7)) % 211) / 211;
      const peak = i >= 7 && i <= 10 ? 0.35 : i >= 17 && i <= 20 ? 0.35 : 0;
      const intensity = Math.max(0, Math.min(1, norm * 0.65 + r * 0.45 + peak));
      return intensity;
    });
  }, [label, value, hours]);

  const rgb = TONE_COLORS[tone];

  return (
    <div>
      <div
        className="kpi-heat"
        style={{ gridTemplateColumns: `repeat(${hours}, 1fr)` }}
        aria-label={`${label} 24-hour intensity`}
      >
        {cells.map((c, i) => (
          <span
            key={i}
            className="cell"
            title={`${i.toString().padStart(2, "0")}:00 · ${(c * 100).toFixed(0)}%`}
            style={{
              background: `rgba(${rgb}, ${0.08 + c * 0.78})`,
              boxShadow:
                c > 0.75
                  ? `0 0 8px rgba(${rgb}, 0.55)`
                  : c > 0.5
                    ? `0 0 4px rgba(${rgb}, 0.35)`
                    : "none",
            }}
          />
        ))}
      </div>
      {showLegend && (
        <div className="kpi-heat-legend">
          <span>low</span>
          <span className="swatch" style={{ background: `rgba(${rgb}, 0.15)` }} />
          <span className="swatch" style={{ background: `rgba(${rgb}, 0.40)` }} />
          <span className="swatch" style={{ background: `rgba(${rgb}, 0.70)` }} />
          <span className="swatch" style={{ background: `rgba(${rgb}, 0.95)` }} />
          <span>peak</span>
          <span style={{ marginLeft: "auto" }}>last 24h</span>
        </div>
      )}
    </div>
  );
}
