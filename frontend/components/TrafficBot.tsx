// Floating TrafficBot — accent-bordered launcher, glass chat window,
// streaming token-by-token replies. Phase 5 replaces canned with /api/chat.
"use client";

import { useEffect, useRef, useState } from "react";
import { Icons } from "./icons";
import { api } from "@/lib/api";
import { CHATBOT_CANNED } from "@/lib/data";
import type { ChatMessage } from "@/lib/types";

function BlinkCaret() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn((o) => !o), 480);
    return () => clearInterval(t);
  }, []);
  return (
    <span
      style={{
        display: "inline-block", width: 7, height: 12,
        background: "var(--accent)", verticalAlign: "text-bottom",
        marginLeft: 3, opacity: on ? 1 : 0, transition: "opacity .1s",
      }}
    />
  );
}

export function TrafficBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, who: "bot",  text: "Hello — I'm TrafficBot. Ask about live conditions, ETAs, or congestion forecasts across Delhi NCR." },
    { id: 2, who: "user", text: "What's MG Road like right now?" },
    { id: 3, who: "bot",  text: "MG Road is heavy — average speed 18 km/h, predicted to peak at 87% risk in ~22 min. Consider the Inner Ring → Dhaula Kuan reroute (saves 9 min, ₹115 toll)." },
  ]);
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, streaming, open]);

  const submit = async () => {
    if (!input.trim() || streaming) return;
    const userText = input.trim();
    setMessages((m) => [...m, { id: Date.now(), who: "user", text: userText }]);
    setInput("");

    setStreaming(true);
    const botId = Date.now() + 1;
    setMessages((m) => [...m, { id: botId, who: "bot", text: "" }]);

    try {
      await api.chatStream(userText, (_chunk, acc) => {
        setMessages((m) => m.map((x) => (x.id === botId ? { ...x, text: acc } : x)));
      });
    } catch {
      // Backend unreachable — fall through to a canned reply so the demo
      // never shows an empty bubble.
      const reply = CHATBOT_CANNED[Math.floor(Math.random() * CHATBOT_CANNED.length)];
      let i = 0;
      await new Promise<void>((resolve) => {
        const tick = () => {
          i += 2 + Math.floor(Math.random() * 3);
          setMessages((m) => m.map((x) => (x.id === botId ? { ...x, text: reply.slice(0, i) } : x)));
          if (i < reply.length) window.setTimeout(tick, 18);
          else resolve();
        };
        window.setTimeout(tick, 250);
      });
    } finally {
      setStreaming(false);
    }
  };

  const last = messages[messages.length - 1];

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed", right: 22, bottom: 22, zIndex: 60,
          width: 56, height: 56, borderRadius: "50%",
          background: "var(--bg-surface)",
          border: "1px solid var(--accent)",
          boxShadow: "0 0 0 4px rgba(232,132,60,0.10), 0 12px 28px rgba(0,0,0,0.45)",
          display: "grid", placeItems: "center",
          color: "var(--accent)", cursor: "pointer",
          transition: "transform .2s ease",
          transform: open ? "scale(0.92)" : "scale(1)",
        }}
      >
        {open ? <Icons.Close size={18} /> : <Icons.Sparkles size={20} />}
      </button>

      {/* Chat window */}
      <div
        style={{
          position: "fixed", right: 22, bottom: 90, zIndex: 59,
          width: 380, maxWidth: "calc(100vw - 44px)",
          height: 540, maxHeight: "calc(100vh - 120px)",
          background: "var(--bg-glass)",
          backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 16,
          boxShadow: "0 30px 60px rgba(0,0,0,0.55)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transform: open ? "translateY(0) scale(1)" : "translateY(12px) scale(0.98)",
          transition: "transform .2s ease, opacity .2s ease",
          transformOrigin: "bottom right",
        }}
      >
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
            <Icons.Sparkles size={16} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>TrafficBot</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success)" }} />
              Online · powered by city graph v3.1
            </div>
          </div>
          <button className="btn-icon" onClick={() => setOpen(false)}><Icons.Close size={12} /></button>
        </div>

        {/* Thread */}
        <div
          ref={threadRef}
          className="scroll"
          style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}
        >
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.who === "user" ? "flex-end" : "flex-start",
                maxWidth: "86%", padding: "10px 14px", borderRadius: 12,
                background: m.who === "user" ? "var(--bg-surface-2)" : "rgba(232,132,60,0.08)",
                border: m.who === "user" ? "1px solid var(--border-subtle)" : "1px solid rgba(232,132,60,0.20)",
                color: "var(--text-primary)", fontSize: 13, lineHeight: 1.5,
                borderBottomRightRadius: m.who === "user" ? 4 : 12,
                borderBottomLeftRadius:  m.who === "bot"  ? 4 : 12,
              }}
            >
              {m.text}
              {streaming && last && m.id === last.id && m.who === "bot" && <BlinkCaret />}
            </div>
          ))}
        </div>

        {/* Suggestions */}
        <div style={{ padding: "8px 16px 0", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["How is NH-48?", "Fastest to Saket?", "Risk now?"].map((q) => (
            <button
              key={q}
              onClick={() => setInput(q)}
              style={{
                padding: "5px 10px", borderRadius: 9999,
                background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)", fontSize: 11, cursor: "pointer",
              }}
            >{q}</button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          style={{ padding: 14, borderTop: "1px solid var(--border-subtle)", marginTop: 8, display: "flex", gap: 8 }}
        >
          <div className="search" style={{ flex: 1, width: "auto" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about ETAs, routes, or risk…"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: 40, padding: 0 }}
            disabled={streaming || !input.trim()}
          >
            <Icons.Send size={14} />
          </button>
        </form>
      </div>
    </>
  );
}
