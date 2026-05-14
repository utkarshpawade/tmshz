// Abstract street-grid thumbnail (SVG). Deterministic per `seed` value so
// the same segment renders the same micro-map across re-renders.
"use client";

export function MiniMap({ seed = 1 }: { seed?: number }) {
  const W = 220, H = 86;
  const rng = (n: number) => {
    const x = Math.sin(seed * 9999 + n) * 10000;
    return x - Math.floor(x);
  };
  const roads: [number, number, number, number][] = [];
  for (let i = 0; i < 10; i++) {
    roads.push([rng(i * 2) * W, rng(i * 2 + 1) * H, rng(i * 2 + 10) * W, rng(i * 2 + 11) * H]);
  }
  const routePts: [number, number][] = [
    [W * 0.10, H * 0.70],
    [W * 0.25, H * 0.40 + rng(3) * 10],
    [W * 0.45, H * 0.55],
    [W * 0.65, H * 0.30 + rng(4) * 8],
    [W * 0.85, H * 0.45],
  ];
  const rd = routePts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const pinIdx = Math.floor(rng(5) * 3) + 1;

  return (
    <div style={{ position: "relative", width: "100%", height: H, borderRadius: 8, overflow: "hidden", background: "#0f1110" }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
        <rect width={W} height={H} fill="#0f1212" />
        <circle cx={W * 0.20} cy={H * 0.30} r="40" fill="#13201a" opacity="0.7" />
        <circle cx={W * 0.75} cy={H * 0.70} r="50" fill="#191b1a" opacity="0.6" />
        <path
          d={`M0 ${H * 0.6} Q ${W * 0.3} ${H * 0.8}, ${W * 0.6} ${H * 0.45} T ${W} ${H * 0.5}`}
          stroke="#1c2a30" strokeWidth="6" fill="none" opacity="0.6"
        />
        {roads.map((r, i) => (
          <line key={i} x1={r[0]} y1={r[1]} x2={r[2]} y2={r[3]} stroke="#262624" strokeWidth="0.7" opacity="0.8" />
        ))}
        <path d={rd} stroke="rgba(244,244,245,0.85)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d={rd} stroke="var(--accent)" strokeWidth="0.6" fill="none" strokeLinecap="round" opacity="0.5" />
        <g transform={`translate(${routePts[pinIdx][0]} ${routePts[pinIdx][1] - 6})`}>
          <circle r="6" fill="var(--accent)" opacity="0.25" />
          <circle r="3" fill="var(--accent)" />
          <circle r="1.4" fill="#0C0C0D" />
        </g>
      </svg>
    </div>
  );
}
