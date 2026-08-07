import React from "react";
import { Sun, Moon, Search, Home, Zap, Users, LogOut, Menu, PanelRightOpen } from "lucide-react";
import { Avatar, TierBadge } from "./Shared.jsx";
import NotificationsBell from "./NotificationsBell.jsx";

export default function TopNav({
  theme,
  toggleTheme,
  activeView,
  setActiveView,
  activeUser,
  onLogout,
  userMenuOpen,
  setUserMenuOpen,
  onOpenLeftMenu,
  onOpenRightPanel,
  onOpenDM,
  onError,
}) {
  const navTabs = [
    { id: "feed", icon: Home, label: "Home" },
    { id: "vibes", icon: Zap, label: "Vibes" },
    { id: "squads", icon: Users, label: "Squads" },
  ];

  return (
    <header
      className="safe-top h-14 shrink-0 flex items-center px-2.5 sm:px-4 gap-1.5 sm:gap-4 transition-colors duration-300"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <button
        onClick={onOpenLeftMenu}
        className="md:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ color: "var(--text)" }}
        aria-label="Open menu"
      >
        <Menu size={19} />
      </button>

      <div className="flex items-center gap-1.5 sm:gap-2 md:w-[280px] shrink-0">
        <div
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-lg shrink-0"
          style={{ background: "var(--accent)", color: "#050505" }}
        >
          S
        </div>
        <span className="font-extrabold text-lg tracking-tight hidden sm:inline" style={{ color: "var(--text)" }}>
          studygroup<span style={{ color: "var(--accent)" }}>.ph</span>
        </span>
      </div>

      <div className="flex-1 max-w-md hidden sm:block">
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

      <nav className="hidden md:flex items-center gap-1 ml-auto">
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

      <div className="flex items-center gap-1 sm:gap-3 ml-auto md:ml-0 shrink-0 relative">
        <button
          onClick={onOpenRightPanel}
          className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center"
          style={{ background: "var(--bg)", color: "var(--text)" }}
          aria-label="Open directory & moderation panel"
        >
          <PanelRightOpen size={16} />
        </button>

        <NotificationsBell currentUser={activeUser} onOpenDM={onOpenDM} onError={onError} />

        <button
          onClick={toggleTheme}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "var(--bg)", color: "var(--text)" }}
          aria-label="Toggle dark mode"
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <button onClick={() => setUserMenuOpen((o) => !o)} className="flex items-center gap-2 shrink-0">
          <Avatar initials={activeUser.initials} color={activeUser.color} size={32} />
        </button>

        {userMenuOpen && (
          <div
            className="absolute top-11 right-0 w-64 max-w-[85vw] rounded-xl shadow-xl overflow-hidden z-40"
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
