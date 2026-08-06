import React, { useState } from "react";
import { GraduationCap, Sun, Moon } from "lucide-react";
import { TIER_META } from "../data/mockData.js";

const TIER_OPTIONS = [
  { id: "JHS", label: "Junior High Student" },
  { id: "SHS", label: "Senior High Student" },
  { id: "UNI", label: "University Undergrad" },
];

export default function OnboardingScreen({ user, completeOnboarding, logout, theme, toggleTheme }) {
  const [name, setName] = useState(user.name || "");
  const [tier, setTier] = useState("UNI");
  const [school, setSchool] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await completeOnboarding({ name, tier, school });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full h-full flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        aria-label="Toggle dark mode"
      >
        {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
      </button>

      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-lg font-extrabold mb-1" style={{ color: "var(--text)" }}>
          Almost there, {user.name?.split(" ")[0] || "there"}
        </h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
          Google doesn't tell us your school or academic tier — fill those in to finish setting
          up your account.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-10 rounded-lg px-3 text-sm outline-none"
            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
          />

          <input
            placeholder="School (optional)"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="h-10 rounded-lg px-3 text-sm outline-none"
            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
          />

          <div>
            <label className="text-xs font-semibold flex items-center gap-1.5 mb-1.5" style={{ color: "var(--text-secondary)" }}>
              <GraduationCap size={13} /> Academic tier
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIER_OPTIONS.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTier(t.id)}
                  className="rounded-lg py-2 text-xs font-semibold transition-colors text-center"
                  style={{
                    background: tier === t.id ? TIER_META[t.id].color : "var(--bg)",
                    color: tier === t.id ? "#050505" : "var(--text-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {t.id}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-xs font-medium px-3 py-2 rounded-lg" style={{ background: "rgba(226,75,74,0.1)", color: "#E24B4A" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="h-10 rounded-lg text-sm font-bold mt-1 transition-opacity"
            style={{ background: "var(--accent)", color: "#050505", opacity: submitting || !name.trim() ? 0.6 : 1 }}
          >
            {submitting ? "Saving..." : "Finish setup"}
          </button>

          <button
            type="button"
            onClick={logout}
            className="text-xs font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Not you? Log out
          </button>
        </form>
      </div>
    </div>
  );
}
