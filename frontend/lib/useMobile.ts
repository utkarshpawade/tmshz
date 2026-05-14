"use client";

import { useEffect, useState } from "react";

// Returns true on viewports <= 768px. SSR-safe: starts false on the server
// and on first client paint, then flips after mount so the markup matches.
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [breakpoint]);

  return isMobile;
}
