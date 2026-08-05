import React, { useState, useEffect } from "react";
import { AlertTriangle, ShieldAlert, Lock, GraduationCap, X } from "lucide-react";
import { Avatar, TierBadge } from "./Shared.jsx";
import { MOD_SYSTEM_NOTES } from "../data/mockData.js";
import { fetchSuggestedProfiles, fetchMentor } from "../lib/usersApi.js";

function ProfileCard({ profile, mentor, onOpenDM, onMentorMissing }) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <Avatar initials={profile.initials} color={profile.color} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
            {profile.name}
          </span>
          <TierBadge tier={profile.tier} />
          {profile.is_mentor && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0"
              style={{ background: "rgba(255,208,0,0.18)", color: "#B98F00" }}
            >
              <GraduationCap size={10} /> MENTOR
            </span>
          )}
        </div>
        <div className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
          {profile.school}
        </div>
      </div>
      {profile.minor ? (
        <div className="flex flex-col gap-1 items-end shrink-0">
          <button
            disabled
            title="Send DM (Restricted): older accounts cannot initiate direct messages with minor accounts."
            className="text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1 cursor-not-allowed"
            style={{ background: "var(--bg)", color: "var(--text-secondary)" }}
          >
            <Lock size={10} /> Send DM
          </button>
          <button
            onClick={() => (mentor ? onOpenDM(mentor) : onMentorMissing())}
            className="text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{ background: "var(--accent)", color: "#050505" }}
          >
            Message Mentor
          </button>
        </div>
      ) : (
        <button
          onClick={() => onOpenDM(profile)}
          className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0"
          style={{ background: "var(--accent)", color: "#050505" }}
        >
          Send DM
        </button>
      )}
    </div>
  );
}

function ModerationLogEntry({ entry }) {
  return (
    <div className="text-xs px-3 py-2.5 rounded-lg mb-2" style={{ background: "rgba(226,75,74,0.08)", borderLeft: "3px solid #E24B4A" }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold" style={{ color: "#E24B4A" }}>
          {entry.reasonLabel}
        </span>
        <span style={{ color: "var(--text-secondary)" }}>{entry.timestamp}</span>
      </div>
      <p className="mb-1 truncate" style={{ color: "var(--text)" }}>
        Target: {entry.targetSnippet}
      </p>
      <p style={{ color: "var(--text-secondary)" }}>{entry.device}</p>
      <p className="mt-1 font-medium flex items-center gap-1" style={{ color: "#E24B4A" }}>
        <Lock size={10} /> {entry.lockout}
      </p>
    </div>
  );
}

export default function RightSidebar({ modLog, currentUser, onToast, mobileOpen, onClose, onOpenDM }) {
  const [profiles, setProfiles] = useState([]);
  const [mentor, setMentor] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    fetchSuggestedProfiles(currentUser.id)
      .then(setProfiles)
      .catch((err) => onToast?.(err.message));
    fetchMentor()
      .then(setMentor)
      .catch(() => {});
  }, [currentUser, onToast]);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed lg:static inset-y-0 right-0 z-40 lg:z-auto w-[300px] sm:w-[320px] shrink-0 h-full overflow-y-auto px-4 py-4 transform transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-3 lg:hidden">
          <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
            Directory &amp; moderation
          </span>
          <button onClick={onClose} style={{ color: "var(--text-secondary)" }} aria-label="Close panel">
            <X size={18} />
          </button>
        </div>

      <section className="mb-5">
        <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--text-secondary)" }}>
          Student profiles
        </div>
        <div className="rounded-xl px-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {profiles.length === 0 ? (
            <div className="py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
              No other students have signed up yet. Invite your squad!
            </div>
          ) : (
            profiles.map((p) => (
              <ProfileCard
                key={p.id}
                profile={p}
                mentor={mentor}
                onOpenDM={onOpenDM}
                onMentorMissing={() => onToast?.("No mentor account has been set up yet.")}
              />
            ))
          )}
        </div>
      </section>

      <section className="mb-5">
        <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--text-secondary)" }}>
          System warnings
        </div>
        <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {MOD_SYSTEM_NOTES.map((n, i) => (
            <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: "var(--accent-strong)" }} />
              {n}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
          <ShieldAlert size={13} /> Moderation activity center
        </div>
        {modLog.length === 0 ? (
          <div
            className="rounded-xl p-3 text-xs"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            No offenses logged this session. The quarantine kill-switch is armed and idle.
          </div>
        ) : (
          modLog.map((entry) => <ModerationLogEntry key={entry.id} entry={entry} />)
        )}
      </section>

      </aside>
    </>
  );
}
