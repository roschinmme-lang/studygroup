import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { TIER_META } from "../data/mockData.js";

// Deliberately excludes `email` — that column's SELECT access is revoked
// for the `authenticated` role (see migration 009) so no one can read
// another user's email via the profiles table. Your own email still
// comes from the Supabase Auth session itself (session.user.email),
// not from this table.
const PROFILE_COLUMNS = "id, name, tier, tier_label, school, initials, color, minor, is_mentor, onboarded";

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function mapProfile(row, email) {
  return {
    id: row.id,
    name: row.name,
    email,
    tier: row.tier,
    tierLabel: row.tier_label,
    school: row.school,
    initials: row.initials,
    color: row.color,
    minor: row.minor,
    isMentor: row.is_mentor,
    onboarded: row.onboarded,
  };
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId, email) => {
    const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).single();
    if (error) {
      // Auth user exists but has no profile row yet — can happen for a
      // moment right after signup before the trigger commits. Not treated
      // as fatal; the caller can retry via onAuthStateChange.
      setUser(null);
      return;
    }
    setUser(mapProfile(data, email));
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) await loadProfile(data.session.user.id, data.session.user.email);
      if (mounted) setLoading(false);
    }
    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  /**
   * Returns { requiresConfirmation: false } if the account is created and
   * logged in immediately (email confirmation off), or
   * { requiresConfirmation: true, email } if a confirmation link was sent
   * and the account isn't usable yet.
   */
  const signup = useCallback(
    async ({ name, email, password, tier, school }) => {
      const cleanEmail = email.trim().toLowerCase();
      const meta = TIER_META[tier];
      if (!meta) throw new Error("Please select a valid academic tier.");
      if (!/^[^\s@]+@gmail\.com$/.test(cleanEmail)) {
        throw new Error("Please sign up with a real Gmail address (must end in @gmail.com).");
      }
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          // Read by the handle_new_user() database trigger to create the
          // profiles row — there's no session yet to insert as ourselves
          // when email confirmation is required.
          data: {
            name: name.trim(),
            tier,
            tier_label: meta.tierLabel,
            school: school.trim() || "Not specified",
            initials: initials(name),
            color: meta.color,
            minor: meta.minor,
          },
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });

      if (error) {
        if (/already registered|already exists/i.test(error.message)) {
          throw new Error(
            "An account with this email already exists. Each student can only have one Studygroup account — please log in instead."
          );
        }
        throw new Error(error.message);
      }
      if (!data.user) {
        throw new Error("Signup failed unexpectedly. Please try again.");
      }

      if (data.session) {
        await loadProfile(data.user.id, data.user.email);
        return { requiresConfirmation: false };
      }

      return { requiresConfirmation: true, email: cleanEmail };
    },
    [loadProfile]
  );

  const login = useCallback(
    async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) {
        if (/email not confirmed/i.test(error.message)) {
          throw new Error("Please confirm your email first — check your inbox for the confirmation link we sent.");
        }
        throw new Error(error.message);
      }
      await loadProfile(data.user.id, data.user.email);
    },
    [loadProfile]
  );

  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) throw new Error(error.message);
    // Supabase redirects the whole page to Google, then back — there's
    // nothing further to do here, onAuthStateChange picks up the session
    // once the browser returns. If the chosen account isn't @gmail.com,
    // the database trigger rejects it and the person is bounced back
    // with an error instead of a session.
  }, []);

  const completeOnboarding = useCallback(
    async ({ name, tier, school }) => {
      if (!user) return;
      const meta = TIER_META[tier];
      if (!meta) throw new Error("Please select a valid academic tier.");

      const { data, error } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          tier,
          tier_label: meta.tierLabel,
          school: school.trim() || "Not specified",
          initials: initials(name),
          color: meta.color,
          minor: meta.minor,
          onboarded: true,
        })
        .eq("id", user.id)
        .select(PROFILE_COLUMNS)
        .single();

      if (error) throw new Error(error.message);
      setUser(mapProfile(data, user.email));
    },
    [user]
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return { user, signup, login, loginWithGoogle, completeOnboarding, logout, loading };
}
