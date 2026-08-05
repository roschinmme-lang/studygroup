import React from "react";
import { Sun, Moon, Search, Home, Zap, Users, LogOut } from "lucide-react";
import { Avatar, TierBadge } from "./Shared.jsx";

export default function TopNav({
  theme,
  toggleTheme,
  activeView,
  setActiveView,
  activeUser,
  onLogout,
  userMenuOpen,
  setUserMenuOpen,
}) {
  const navTabs = [
    { id: "feed", icon: Home, label: "Home" },
    { id: "vibes", icon: Zap, label: "Vibes" },
    { id: "squads", icon: Users, label: "Squads" },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 h-14 flex items-center px-4 gap-4 z-50 transition-colors duration-300"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2 w-[280px] shrink-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg shrink-0"
          style={{ background: "var(--accent)", color: "#050505" }}
        >
          S
        </div>
        <span className="font-extrabold text-lg tracking-tight" style={{ color: "var(--text)" }}>
          studygroup<span style={{ color: "var(--accent)" }}>.ph</span>
        </span>
      </div>

      <div className="flex-1 max-w-md">
        <div
          className="flex items-center gap-2 h-9 px-3 rounded-full transition-colors"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        >
          <Search size={16} style={{ color: "var(--text-secondary)" }} />
          <input
            placeholder="Search Studygroup"
            className="bg-transparent outline-none text-sm w-full"
            style={{ color: "var(--text)" }}
          />
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-1">
        {navTabs.map((t) => {
          const Icon = t.icon;
          const active = activeView === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveView(t.id)}
              className="relative px-5 h-14 flex items-center justify-center transition-colors"
              style={{ color: active ? "var(--accent)" : "var(--text-secondary)" }}
              title={t.label}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              {active && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-[3px] rounded-t-full"
                  style={{ background: "var(--accent)" }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 ml-auto shrink-0 relative">
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "var(--bg)", color: "var(--text)" }}
          aria-label="Toggle dark mode"
        >
          {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        <button onClick={() => setUserMenuOpen((o) => !o)} className="flex items-center gap-2">
          <Avatar initials={activeUser.initials} color={activeUser.color} size={34} />
        </button>

        {userMenuOpen && (
          <div
            className="absolute top-11 right-0 w-64 rounded-xl shadow-xl overflow-hidden z-40"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3 px-3 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <Avatar initials={activeUser.initials} color={activeUser.color} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                    {activeUser.name}
                  </span>
                  <TierBadge tier={activeUser.tier} />
                </div>
                <div className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                  {activeUser.email}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setUserMenuOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium hover:opacity-80 transition-colors"
              style={{ color: "#E24B4A" }}
            >
              <LogOut size={15} /> Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
