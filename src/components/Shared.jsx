import React, { useState, useEffect, useRef } from "react";
import { Flag, MoreHorizontal, CheckCircle2 } from "lucide-react";
import { REPORT_REASONS } from "../data/mockData.js";

export function TierBadge({ tier }) {
  const styles = {
    JHS: { bg: "rgba(124,158,255,0.16)", fg: "#7C9EFF" },
    SHS: { bg: "rgba(255,138,101,0.16)", fg: "#FF8A65" },
    UNI: { bg: "rgba(255,208,0,0.18)", fg: "#B98F00" },
  };
  const s = styles[tier] || styles.UNI;
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: s.bg, color: s.fg, letterSpacing: "0.03em" }}
    >
      {tier}
    </span>
  );
}

export function Avatar({ initials, color, size = 40 }) {
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold shrink-0"
      style={{ width: size, height: size, background: color, color: "#050505", fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all duration-300"
      style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
    >
      <CheckCircle2 size={16} style={{ color: "var(--accent)" }} />
      {toast}
    </div>
  );
}

/** Reusable "Report post" dropdown, used on feed cards and Vibes clips. */
export function ReportMenu({ onReport, align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:opacity-80"
        style={{ color: "var(--text-secondary)" }}
        aria-label="Report options"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div
          className={`absolute top-9 ${align === "right" ? "right-0" : "left-0"} w-64 rounded-xl shadow-xl overflow-hidden z-30`}
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div
            className="px-3 py-2 text-xs font-semibold flex items-center gap-1.5"
            style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}
          >
            <Flag size={12} /> Report post
          </div>
          {REPORT_REASONS.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setOpen(false);
                onReport(r);
              }}
              className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:opacity-80 transition-colors"
              style={{ color: "var(--text)" }}
            >
              {r.label}
              {r.severity === "severe" && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(226,75,74,0.15)", color: "#E24B4A" }}
                >
                  SEVERE
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
