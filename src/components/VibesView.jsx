import React, { useState, useEffect } from "react";
import { Play, ChevronUp, ChevronDown, Radio, MessageCircle, Send, ShieldAlert } from "lucide-react";
import { ReportMenu } from "./Shared.jsx";

export default function VibesView({ vibes, onReport, activeUser, index, setIndex }) {
  const [qaInput, setQaInput] = useState("");
  const [localQa, setLocalQa] = useState({});
  const [quarantinedIds, setQuarantinedIds] = useState({});

  const visibleVibes = vibes.filter((v) => !quarantinedIds[v.id]);
  const clamped = Math.min(index, Math.max(visibleVibes.length - 1, 0));
  const vibe = visibleVibes[clamped];

  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => Math.min(visibleVibes.length - 1, i + 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visibleVibes.length, setIndex]);

  if (!vibe) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--text-secondary)" }}>
        All clips in this session were removed by moderation.
      </div>
    );
  }

  const handleReport = (reason) => {
    if (reason.severity === "severe") {
      setQuarantinedIds((prev) => ({ ...prev, [vibe.id]: true }));
    }
    onReport({ id: vibe.id, authorName: vibe.author, content: vibe.title }, reason, "vibe");
  };

  const blocked = activeUser.tier === "JHS";
  const qaList = [...vibe.qa, ...(localQa[vibe.id] || [])];

  function submitQuestion() {
    if (!qaInput.trim()) return;
    setLocalQa((prev) => ({
      ...prev,
      [vibe.id]: [...(prev[vibe.id] || []), { q: qaInput.trim(), a: "Awaiting a mentor reply..." }],
    }));
    setQaInput("");
  }

  return (
    <div className="flex-1 flex justify-center items-start gap-5 py-6 px-4 overflow-hidden">
      {/* Video player */}
      <div className="flex flex-col items-center gap-3 shrink-0">
        <div
          className="relative rounded-2xl overflow-hidden shrink-0 transition-all duration-300"
          style={{ width: 260, height: Math.round((260 * 16) / 9), background: vibe.gradient, border: "1px solid var(--border)" }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/90 px-6 text-center">
            <Play size={34} fill="white" />
            <span className="text-sm font-semibold">{vibe.title}</span>
            <span className="text-[11px] opacity-80">
              {vibe.subject} \u2022 {vibe.author}
            </span>
          </div>
          <div className="absolute top-3 right-3">
            <div className="rounded-full backdrop-blur bg-black/30">
              <ReportMenu onReport={handleReport} />
            </div>
          </div>
          <div className="absolute bottom-3 left-3 right-3 text-[11px] text-white/90 bg-black/30 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
            <Radio size={11} /> auto-caption: {vibe.transcript[0]}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <ChevronUp size={16} />
          </button>
          <span>
            {clamped + 1} / {visibleVibes.length} \u00b7 \u2191 \u2193 to navigate
          </span>
          <button
            onClick={() => setIndex((i) => Math.min(visibleVibes.length - 1, i + 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <ChevronDown size={16} />
          </button>
        </div>
        {blocked && (
          <div
            className="w-[260px] flex items-start gap-2 text-xs font-medium px-3 py-2 rounded-lg"
            style={{ background: "rgba(226,75,74,0.1)", color: "#E24B4A" }}
          >
            <ShieldAlert size={14} className="shrink-0 mt-0.5" />
            Security Exception: JHS accounts have View-Only privileges.
          </div>
        )}
      </div>

      {/* Context sidebar: transcript + Q&A */}
      <div
        className="w-[340px] shrink-0 h-[462px] rounded-2xl flex flex-col overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <Radio size={14} style={{ color: "var(--accent-strong)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Auto transcript
          </span>
        </div>
        <div className="px-4 py-3 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 150 }}>
          {vibe.transcript.map((line, i) => (
            <p key={i} className="text-xs leading-relaxed" style={{ color: i === 0 ? "var(--text)" : "var(--text-secondary)" }}>
              {line}
            </p>
          ))}
        </div>

        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
        >
          <MessageCircle size={14} style={{ color: "var(--accent-strong)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Q&amp;A thread
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {qaList.map((item, i) => (
            <div key={i} className="text-xs">
              <p className="font-semibold mb-0.5" style={{ color: "var(--text)" }}>
                Q: {item.q}
              </p>
              <p style={{ color: "var(--text-secondary)" }}>A: {item.a}</p>
            </div>
          ))}
        </div>
        <div className="p-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
          <input
            value={qaInput}
            onChange={(e) => setQaInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitQuestion();
            }}
            placeholder="Ask a question..."
            className="flex-1 h-8 rounded-full px-3 text-xs outline-none"
            style={{ background: "var(--bg)", color: "var(--text)" }}
          />
          <button
            onClick={submitQuestion}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--accent)", color: "#050505" }}
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
