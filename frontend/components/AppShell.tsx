"use client";

import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { MobileShell } from "./MobileShell";
import { useIsMobile } from "@/lib/useMobile";

// Picks ONE shell at a time so dashboard content is never duplicated.
// Server renders the desktop shell by default; on first client paint, if
// the viewport is <= 768px we swap to the mobile shell.
export function AppShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileShell>{children}</MobileShell>;
  }

  return (
    <div className="shell">
      <TopBar />
      <main className="screen">{children}</main>
    </div>
  );
}
