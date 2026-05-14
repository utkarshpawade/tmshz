// Inline SVG icon set (Lucide-style) — ported from the Claude design.
import type { CSSProperties } from "react";

type IconProps = { size?: number };
type ChevronProps = IconProps & { dir?: "down" | "up" | "left" | "right" };

const s = (size: number) => ({ width: size, height: size });

export const I = {
  Arrow: ({ size = 14 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7" /><path d="M7 7h10v10" /></svg>
  ),
  ArrowR: ({ size = 14 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
  ),
  Chevron: ({ size = 14, dir = "down" }: ChevronProps) => {
    const r = { down: 0, up: 180, left: 90, right: -90 }[dir];
    return (
      <svg style={{ transform: `rotate(${r}deg)` } as CSSProperties} {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
    );
  },
  Search: ({ size = 14 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
  ),
  Bell: ({ size = 16 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
  ),
  Wifi: ({ size = 16 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13a10 10 0 0 1 14 0" /><path d="M8.5 16.5a5 5 0 0 1 7 0" /><path d="M2 8.82a15 15 0 0 1 20 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>
  ),
  Headset: ({ size = 16 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H4a2 2 0 0 1-1-1.73V14a9 9 0 0 1 18 0v5.27A2 2 0 0 1 20 21h-2a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" /></svg>
  ),
  Bus: ({ size = 14 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6v6" /><path d="M16 6v6" /><path d="M2 12h19.6" /><path d="M18 18h.01" /><path d="M6 18h.01" /><path d="M22 12.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v6.5" /><path d="M22 19h-2v2h-2v-2H6v2H4v-2H2v-7h20Z" /></svg>
  ),
  Car: ({ size = 14 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" /><circle cx="6.5" cy="16.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /></svg>
  ),
  Pin: ({ size = 14 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg>
  ),
  Signal: ({ size = 12 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12a10 10 0 0 1 20 0" /><path d="M5 12a7 7 0 0 1 14 0" /><path d="M8.5 12a3.5 3.5 0 0 1 7 0" /></svg>
  ),
  Plus: ({ size = 16 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
  ),
  Minus: ({ size = 16 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 12h14" /></svg>
  ),
  Gear: ({ size = 14 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  Send: ({ size = 16 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
  ),
  Sparkles: ({ size = 14 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8L4 11l6.1 1.9L12 18l1.9-5.1L20 11l-5.9-2.2Z" /><path d="M5 3v3" /><path d="M19 17v3" /><path d="M3.5 4.5h3" /><path d="M17.5 18.5h3" /></svg>
  ),
  Check: ({ size = 12 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
  ),
  Route: ({ size = 14 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3" /><circle cx="18" cy="5" r="3" /><path d="M6.7 17.3 17.3 6.7" /></svg>
  ),
  Map: ({ size = 14 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" /><path d="M9 3v15" /><path d="M15 6v15" /></svg>
  ),
  Amb: ({ size = 14 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 10H6" /><path d="M8 8v4" /><path d="M9 18h6" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.34a4 4 0 0 0-1.17-2.83l-2.66-2.66A4 4 0 0 0 15.34 7H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></svg>
  ),
  Flame: ({ size = 14 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
  ),
  Shield: ({ size = 14 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z" /></svg>
  ),
  Close: ({ size = 14 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
  ),
  Triangle: ({ size = 12 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 22 21H2Z" /></svg>
  ),
  Cal: ({ size = 14 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
  ),
  Layer: ({ size = 14 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18 8.27 4.34a2 2 0 0 1 0 3.53l-8.27 4.34a2 2 0 0 1-1.66 0L2.9 10.05a2 2 0 0 1 0-3.53l8.27-4.34a2 2 0 0 1 1.66 0Z" /><path d="m2 13 9.17 4.82a2 2 0 0 0 1.66 0L22 13" /><path d="m2 17 9.17 4.82a2 2 0 0 0 1.66 0L22 17" /></svg>
  ),
  Zap: ({ size = 14 }: IconProps) => (
    <svg {...s(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" /></svg>
  ),
};

// Alias — many components import this as `Icons`.
export const Icons = I;
export type IconKey = keyof typeof I;
