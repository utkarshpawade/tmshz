// TrafficBot -- floating chat that streams from the Groq-backed /api/chat.
// LLM-first: every reply comes from the Llama 3.3 model with live DB context
// and the last few turns of conversation passed in so follow-ups stay coherent.
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icons } from "./icons";
import { api } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

const SUGGESTIONS = [
  "How is NH-48 right now?",
  "What's the fastest route to Saket?",
  "City-wide risk forecast?",
  "Any critical alerts?",
  "Average speed across Delhi NCR?",
  "Best route from CP to Cyber City?",
];

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
    { id: 1, who: "bot",  text: "Hello -- I'm TrafficBot, powered by Llama 3.3 over your live Delhi NCR sensor data. Ask me about congestion, ETAs, alerts, or specific corridors." },
  ]);
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, streaming, open]);

  const submit = async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || streaming) return;

    // Build the history we'll send to the LLM from the existing thread.
    // We strip the very first synthetic greeting so the model isn't
    // primed by a templated line.
    const history = messages
      .filter((m, idx) => !(idx === 0 && m.who === "bot"))
      .map((m) => ({
        role: (m.who === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.text,
      }))
      .filter((t) => t.content.trim().length > 0);

    setMessages((m) => [...m, { id: Date.now(), who: "user", text: userText }]);
    setInput("");

    setStreaming(true);
    const botId = Date.now() + 1;
    setMessages((m) => [...m, { id: botId, who: "bot", text: "" }]);

    try {
      await api.chatStream(
        userText,
        (_chunk, acc) => {
          setMessages((m) => m.map((x) => (x.id === botId ? { ...x, text: acc } : x)));
        },
        history,
      );
    } catch {
      // Truly LLM-first: if the API is unreachable, tell the user instead
      // of substituting a hardcoded canned reply. No silent imposter text.
      const err =
        "I can't reach my live data stream right now — the backend looks offline. " +
        "Start it with `uvicorn main:app --port 8000` and ask me again.";
      setMessages((m) => m.map((x) => (x.id === botId ? { ...x, text: err } : x)));
    } finally {
      setStreaming(false);
    }
  };

  const last = messages[messages.length - 1];

  return (
    <>
      {/* Launcher */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`traffic-bot-launcher ${open ? "" : "glow-pulse"}`}
        style={{
          position: "fixed", right: 22, bottom: 22, zIndex: 80,
          width: 60, height: 60, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--accent), #c45a18)",
          border: "1px solid var(--accent)",
          boxShadow: "0 0 0 4px rgba(232,132,60,0.18), 0 12px 32px rgba(232,132,60,0.32)",
          display: "grid", placeItems: "center",
          color: "#0C0C0D", cursor: "pointer",
        }}
        title="Ask TrafficBot"
      >
        {open ? <Icons.Close size={20} /> : <Icons.Sparkles size={22} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="traffic-bot-panel"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              position: "fixed", right: 22, bottom: 96, zIndex: 79,
              width: 400, maxWidth: "calc(100vw - 44px)",
              height: 580, maxHeight: "calc(100vh - 140px)",
              background: "var(--bg-glass-strong)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              border: "1px solid var(--border-strong)",
              borderRadius: 18,
              boxShadow: "0 30px 80px rgba(0,0,0,0.65)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              transformOrigin: "bottom right",
            }}
          >
            {/* Header */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
                <Icons.Sparkles size={16} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>TrafficBot</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success)" }} />
                  Online · Llama 3.3 over live DB
                </div>
              </div>
              <button
                className="btn-icon"
                onClick={() => setMessages([{ id: Date.now(), who: "bot", text: "Fresh chat. What do you need to know?" }])}
                title="Reset chat"
              >
                <Icons.Gear size={12} />
              </button>
              <button className="btn-icon" onClick={() => setOpen(false)}><Icons.Close size={12} /></button>
            </div>

            {/* Thread */}
            <div
              ref={threadRef}
              className="scroll"
              style={{ flex: 1, padding: "16px 16px 10px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}
            >
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    alignSelf: m.who === "user" ? "flex-end" : "flex-start",
                    maxWidth: "86%", padding: "10px 14px", borderRadius: 14,
                    background: m.who === "user" ? "var(--bg-surface-2)" : "rgba(232,132,60,0.10)",
                    border: m.who === "user" ? "1px solid var(--border-subtle)" : "1px solid rgba(232,132,60,0.22)",
                    color: "var(--text-primary)", fontSize: 13.5, lineHeight: 1.55,
                    borderBottomRightRadius: m.who === "user" ? 4 : 14,
                    borderBottomLeftRadius:  m.who === "bot"  ? 4 : 14,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.text || (m.who === "bot" && streaming && last && m.id === last.id ? "thinking…" : "")}
                  {streaming && last && m.id === last.id && m.who === "bot" && m.text && <BlinkCaret />}
                </motion.div>
              ))}
            </div>

            {/* Suggestions */}
            <div style={{ padding: "0 16px 8px", display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SUGGESTIONS.slice(0, 4).map((q) => (
                <button
                  key={q}
                  onClick={() => submit(q)}
                  disabled={streaming}
                  style={{
                    padding: "6px 11px", borderRadius: 9999,
                    background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)", fontSize: 11, cursor: "pointer",
                  }}
                >{q}</button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); submit(); }}
              style={{ padding: 14, borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8 }}
            >
              <div className="search" style={{ flex: 1, width: "auto" }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about ETAs, routes, or risk…"
                  disabled={streaming}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: 44, padding: 0 }}
                disabled={streaming || !input.trim()}
              >
                <Icons.Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
