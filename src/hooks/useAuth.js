import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { TIER_META } from "../data/mockData.js";

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function mapProfile(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    tier: row.tier,
    tierLabel: row.tier_label,
    school: row.school,
    initials: row.initials,
    color: row.color,
    minor: row.minor,
    isMentor: row.is_mentor,
  };
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error) {
      // Auth user exists but has no profile row yet (e.g. signup got interrupted).
      setUser(null);
      return;
    }
    setUser(mapProfile(data));
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) await loadProfile(data.session.user.id);
      if (mounted) setLoading(false);
    }
    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signup = useCallback(async ({ name, email, password, tier, school }) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
    if (error) {
      if (/already registered|already exists/i.test(error.message)) {
        throw new Error("An account with this email already exists. Each student can only have one Studygroup account — please log in instead.");
      }
      throw new Error(error.message);
    }
    if (!data.user) {
      throw new Error("Signup succeeded but no user was returned. Check that email confirmations are disabled in your Supabase project for local testing.");
    }
    if (!data.session) {
      throw new Error("Account created, but email confirmation is required before you can log in. Disable \"Confirm email\" in Supabase (Authentication → Providers → Email) for local testing, or check your inbox to confirm.");
    }

    const meta = TIER_META[tier];
    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: data.user.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        tier,
        tier_label: meta.tierLabel,
        school: school.trim() || "Not specified",
        initials: initials(name),
        color: meta.color,
        minor: meta.minor,
      })
      .select()
      .single();

    if (profileError) throw new Error(profileError.message);

    const mapped = mapProfile(profileRow);
    setUser(mapped);
    return mapped;
  }, []);

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw new Error(error.message);
    await loadProfile(data.user.id);
  }, [loadProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return { user, signup, login, logout, loading };
}
