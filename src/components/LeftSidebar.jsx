import React from "react";
import { Avatar } from "./Shared.jsx";

const NAV_ITEMS = [
  { id: "feed", icon: "\u2b50", label: "Home Feed" },
  { id: "vibes", icon: "\u26a1", label: "Vibes Feed" },
  { id: "major", icon: "\ud83d\udcda", label: "My Major" },
  { id: "squads", icon: "\ud83d\udc65", label: "Study Squads" },
];

export default function LeftSidebar({ activeView, setActiveView, activeUser, squads, onSelectSquad }) {
  const joinedSquads = squads.filter((s) => s.joined);

  return (
    <aside
      className="w-[280px] shrink-0 h-full overflow-y-auto px-3 py-4"
      style={{ borderRight: "1px solid var(--border)" }}
    >
      <div
        className="flex items-center gap-3 px-2 py-2.5 rounded-xl mb-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <Avatar initials={activeUser.initials} color={activeUser.color} size={38} />
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
            {activeUser.name}
          </div>
          <div className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
            {activeUser.school}
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((it) => {
          const active = activeView === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setActiveView(it.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left"
              style={{
                background: active ? "var(--accent)" : "transparent",
                color: active ? "#050505" : "var(--text)",
              }}
            >
              <span className="text-base leading-none">{it.icon}</span>
              {it.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-6 px-3">
        <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--text-secondary)" }}>
          Your squads
        </div>
        {joinedSquads.length === 0 ? (
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            You haven't joined a squad yet.
          </div>
        ) : (
          joinedSquads.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectSquad(s.id)}
              className="w-full flex items-center gap-2 py-2 text-sm text-left hover:opacity-80"
              style={{ color: "var(--text)" }}
            >
              <div className="w-7 h-7 rounded-lg shrink-0" style={{ background: "var(--accent)", opacity: 0.85 }} />
              <span className="truncate">{s.name}</span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
