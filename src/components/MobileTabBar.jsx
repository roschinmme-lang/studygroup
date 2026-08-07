import React from "react";
import { Home, Zap, Users } from "lucide-react";

const TABS = [
  { id: "feed", icon: Home, label: "Home" },
  { id: "vibes", icon: Zap, label: "Vibes" },
  { id: "squads", icon: Users, label: "Squads" },
];

export default function MobileTabBar({ activeView, setActiveView }) {
  return (
    <nav
      className="safe-bottom md:hidden shrink-0 h-14 flex items-stretch"
      style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
    >
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = activeView === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setActiveView(t.id)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium"
            style={{ color: active ? "var(--accent-strong)" : "var(--text-secondary)" }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
