// Compatibility shim — pages still import { CityMap } from MapSlot, but now
// it renders the real interactive TrafficMap component.
"use client";

import dynamic from "next/dynamic";

const TrafficMap = dynamic(
  () => import("./TrafficMap").then((m) => m.TrafficMap),
  { ssr: false, loading: () => <div className="shimmer map-wrap" style={{ height: 520 }} /> },
);

export function CityMap({
  showControls = true,
  showLegend = true,
  height = 520,
}: {
  showControls?: boolean;
  showLegend?: boolean;
  height?: number | string;
}) {
  return <TrafficMap showControls={showControls} showLegend={showLegend} height={height} />;
}

// Re-export the underlying map for direct use in pages that want richer props.
export { TrafficMap } from "./TrafficMap";
