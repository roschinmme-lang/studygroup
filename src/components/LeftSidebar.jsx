import React from "react";
import { X } from "lucide-react";
import { Avatar } from "./Shared.jsx";

const NAV_ITEMS = [
  { id: "feed", icon: "\u2b50", label: "Home Feed" },
  { id: "vibes", icon: "\u26a1", label: "Vibes Feed" },
  { id: "major", icon: "\ud83d\udcda", label: "My Major" },
  { id: "squads", icon: "\ud83d\udc65", label: "Study Squads" },
];

export default function LeftSidebar({ activeView, setActiveView, activeUser, squads, onSelectSquad, mobileOpen, onClose }) {
  const joinedSquads = squads.filter((s) => s.joined);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 md:z-auto w-[260px] sm:w-[280px] shrink-0 h-full overflow-y-auto px-3 py-4 transform transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-3 md:hidden">
          <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
            Menu
          </span>
          <button onClick={onClose} style={{ color: "var(--text-secondary)" }} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div
          className="flex items-center gap-3 px-2 py-2.5 rounded-xl mb-3"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
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
                onClick={() => {
                  setActiveView(it.id);
                  onClose?.();
                }}
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
                onClick={() => {
                  onSelectSquad(s.id);
                  onClose?.();
                }}
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
    </>
  );
}
