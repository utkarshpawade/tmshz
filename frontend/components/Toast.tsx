"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";

type Toast = { id: number; text: string; kind?: "info" | "success" | "danger" };

interface ToastState {
  toasts: Toast[];
  push: (text: string, kind?: Toast["kind"]) => void;
  remove: (id: number) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (text, kind = "info") =>
    set((s) => ({ toasts: [...s.toasts, { id: Date.now() + Math.random(), text, kind }] })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(text: string, kind?: Toast["kind"]) {
  useToast.getState().push(text, kind);
}

export function ToastHost() {
  const toasts = useToast((s) => s.toasts);
  const remove = useToast((s) => s.remove);

  return (
    <div style={{ position: "fixed", bottom: 24, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 120, pointerEvents: "none" }}>
      {toasts.map((t) => (
        <Item key={t.id} t={t} onDone={() => remove(t.id)} />
      ))}
    </div>
  );
}

function Item({ t, onDone }: { t: Toast; onDone: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const dis = setTimeout(() => setVisible(false), 3000);
    const rem = setTimeout(onDone, 3500);
    return () => { clearTimeout(dis); clearTimeout(rem); };
  }, [onDone]);

  const color =
    t.kind === "success" ? "var(--success)" :
    t.kind === "danger"  ? "var(--danger)"  : "var(--accent)";

  return (
    <div
      className="toast"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(10px)",
        transition: "all .25s ease",
        pointerEvents: "auto",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      {t.text}
    </div>
  );
}
