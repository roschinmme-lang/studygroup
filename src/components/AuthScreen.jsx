import React, { useState } from "react";
import { GraduationCap, Sun, Moon, ShieldCheck } from "lucide-react";
import { TIER_META } from "../data/mockData.js";

const TIER_OPTIONS = [
  { id: "JHS", label: "Junior High Student" },
  { id: "SHS", label: "Senior High Student" },
  { id: "UNI", label: "University Undergrad" },
];

export default function AuthScreen({ signup, login, theme, toggleTheme }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", tier: "UNI", school: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (mode === "signup" && form.password !== form.confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signup({
          name: form.name,
          email: form.email,
          password: form.password,
          tier: form.tier,
          school: form.school,
        });
      } else {
        await login(form.email, form.password);
      }
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
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg"
            style={{ background: "var(--accent)", color: "#050505" }}
          >
            S
          </div>
          <span className="font-extrabold text-lg tracking-tight" style={{ color: "var(--text)" }}>
            studygroup<span style={{ color: "var(--accent)" }}>.ph</span>
          </span>
        </div>
        <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
          {mode === "login" ? "Log in to your account" : "Create your account"}
        </p>

        <div className="flex mb-5 rounded-full p-1" style={{ background: "var(--bg)" }}>
          {["login", "signup"].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className="flex-1 h-8 rounded-full text-sm font-semibold transition-colors"
              style={{
                background: mode === m ? "var(--accent)" : "transparent",
                color: mode === m ? "#050505" : "var(--text-secondary)",
              }}
            >
              {m === "login" ? "Log In" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <input
              placeholder="Full name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
              className="h-10 rounded-lg px-3 text-sm outline-none"
              style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
            className="h-10 rounded-lg px-3 text-sm outline-none"
            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
          />

          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
            minLength={6}
            className="h-10 rounded-lg px-3 text-sm outline-none"
            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
          />

          {mode === "signup" && (
            <>
              <input
                type="password"
                placeholder="Confirm password"
                value={form.confirm}
                onChange={(e) => update("confirm", e.target.value)}
                required
                minLength={6}
                className="h-10 rounded-lg px-3 text-sm outline-none"
                style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
              />

              <input
                placeholder="School (optional)"
                value={form.school}
                onChange={(e) => update("school", e.target.value)}
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
                      onClick={() => update("tier", t.id)}
                      className="rounded-lg py-2 text-xs font-semibold transition-colors text-center"
                      style={{
                        background: form.tier === t.id ? TIER_META[t.id].color : "var(--bg)",
                        color: form.tier === t.id ? "#050505" : "var(--text-secondary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {t.id}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="text-xs font-medium px-3 py-2 rounded-lg" style={{ background: "rgba(226,75,74,0.1)", color: "#E24B4A" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="h-10 rounded-lg text-sm font-bold mt-1 transition-opacity"
            style={{ background: "var(--accent)", color: "#050505", opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
          </button>
        </form>

        <div className="flex items-center gap-1.5 text-[11px] mt-4" style={{ color: "var(--text-secondary)" }}>
          <ShieldCheck size={12} /> One account per email, backed by Supabase Auth.
        </div>
      </div>
    </div>
  );
}
