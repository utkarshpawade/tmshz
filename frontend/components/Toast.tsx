"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { Icons } from "./icons";

type Kind = "info" | "success" | "danger" | "default";
type Toast = { id: number; text: string; kind?: Kind };

interface ToastState {
  toasts: Toast[];
  push: (text: string, kind?: Kind) => void;
  remove: (id: number) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (text, kind = "default") =>
    set((s) => ({ toasts: [...s.toasts, { id: Date.now() + Math.random(), text, kind }] })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(text: string, kind?: Kind) {
  useToast.getState().push(text, kind);
}

export function ToastHost() {
  const toasts = useToast((s) => s.toasts);
  const remove = useToast((s) => s.remove);

  return (
    <div className="toast-host">
      {toasts.map((t) => (
        <Item key={t.id} t={t} onDone={() => remove(t.id)} />
      ))}
    </div>
  );
}

function Item({ t, onDone }: { t: Toast; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const dismiss = setTimeout(() => setLeaving(true), 3200);
    const remove = setTimeout(onDone, 3500);
    return () => { clearTimeout(dismiss); clearTimeout(remove); };
  }, [onDone]);

  const kind: Kind = t.kind || "default";
  const cls = `toast toast-${kind} ${leaving ? "toast-exit" : "toast-enter"}`;

  const icon =
    kind === "success" ? <Icons.Check size={14} /> :
    kind === "danger"  ? <Icons.Triangle size={12} /> :
    kind === "info"    ? <Icons.Sparkles size={14} /> :
                         <Icons.Sparkles size={14} />;

  return (
    <div className={cls} role="status" aria-live="polite">
      <span className="toast-icon">{icon}</span>
      <span style={{ flex: 1 }}>{t.text}</span>
      <button
        aria-label="Dismiss"
        onClick={() => setLeaving(true)}
        style={{ color: "var(--text-tertiary)", display: "grid", placeItems: "center" }}
      >
        <Icons.Close size={12} />
      </button>
    </div>
  );
}
