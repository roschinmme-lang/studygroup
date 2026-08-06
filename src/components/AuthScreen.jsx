import React, { useState } from "react";
import { GraduationCap, Sun, Moon, ShieldCheck, MailCheck } from "lucide-react";
import { TIER_META } from "../data/mockData.js";

const TIER_OPTIONS = [
  { id: "JHS", label: "Junior High Student" },
  { id: "SHS", label: "Senior High Student" },
  { id: "UNI", label: "University Undergrad" },
];

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.9 5.1 29.7 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.8 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.9 5.1 29.7 3 24 3 16.3 3 9.6 7.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 45c5.6 0 10.7-2.1 14.5-5.6l-6.7-5.7C29.6 35.6 27 36.5 24 36.5c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.5 40.6 16.2 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.7 5.7C41.5 36 45 30.5 45 24c0-1.4-.1-2.7-.4-3.5z" />
    </svg>
  );
}

export default function AuthScreen({ signup, login, loginWithGoogle, theme, toggleTheme }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", tier: "UNI", school: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleGoogle() {
    setError(null);
    setGoogleSubmitting(true);
    try {
      await loginWithGoogle();
      // Browser navigates away to Google here — nothing else to do.
    } catch (err) {
      setError(err.message);
      setGoogleSubmitting(false);
    }
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
        const result = await signup({
          name: form.name,
          email: form.email,
          password: form.password,
          tier: form.tier,
          school: form.school,
        });
        if (result?.requiresConfirmation) {
          setPendingEmail(result.email);
        }
      } else {
        await login(form.email, form.password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (pendingEmail) {
    return (
      <div className="w-full h-full flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
        <div
          className="w-full max-w-md rounded-2xl p-6 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--accent)" }}
          >
            <MailCheck size={22} color="#050505" />
          </div>
          <h2 className="text-lg font-extrabold mb-2" style={{ color: "var(--text)" }}>
            Check your email
          </h2>
          <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
            We sent a confirmation link to <span style={{ color: "var(--text)", fontWeight: 600 }}>{pendingEmail}</span>.
            Click it, then come back and log in below.
          </p>
          <button
            onClick={() => {
              setPendingEmail(null);
              setMode("login");
              setForm((f) => ({ ...f, password: "", confirm: "" }));
            }}
            className="h-10 rounded-lg text-sm font-bold w-full"
            style={{ background: "var(--accent)", color: "#050505" }}
          >
            Back to log in
          </button>
        </div>
      </div>
    );
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

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleSubmitting}
          className="w-full h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 mb-4 transition-opacity"
          style={{ background: "#fff", color: "#050505", border: "1px solid var(--border)", opacity: googleSubmitting ? 0.6 : 1 }}
        >
          <GoogleIcon /> {googleSubmitting ? "Redirecting..." : "Continue with Google"}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
            or use email
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>

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
            placeholder={mode === "signup" ? "Gmail address (you@gmail.com)" : "Email address"}
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
            minLength={8}
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
                minLength={8}
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
          <ShieldCheck size={12} /> One account per email. Google sign-in verifies you own the account — no confirmation link needed.
        </div>
      </div>
    </div>
  );
}
