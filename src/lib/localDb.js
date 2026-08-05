// ------------------------------------------------------------------
// Local "database", backed by the browser's localStorage.
// This exists so the app has real accounts and real persistence while
// developing on localhost, before wiring up Supabase. Every function
// here is written so it can be swapped for a real Supabase call later
// without changing how the rest of the app calls it (same function
// names, same shapes going in and out).
//
// NOTE: passwords are stored in plain text in localStorage. That is
// only acceptable because this is a local-only prototype running on
// your own machine. Do not ship this auth approach to production —
// Supabase (or any real backend) will handle hashing and sessions
// properly.
// ------------------------------------------------------------------

import { TIER_META } from "../data/mockData.js";

const LS_KEYS = {
  USERS: "studygroup_users",
  SESSION: "studygroup_session",
  POSTS: "studygroup_posts",
  MODLOG: "studygroup_modlog",
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* ---------------------------- Users ---------------------------- */

export function getUsers() {
  return read(LS_KEYS.USERS, []);
}

function saveUsers(users) {
  write(LS_KEYS.USERS, users);
}

export function findUserByEmail(email) {
  const clean = email.trim().toLowerCase();
  return getUsers().find((u) => u.email === clean) || null;
}

export function findUserById(id) {
  return getUsers().find((u) => u.id === id) || null;
}

/**
 * Creates a new account. Throws if an account with that email already
 * exists — this is what enforces "one account per user."
 */
export function createUser({ name, email, password, tier, school }) {
  const cleanEmail = email.trim().toLowerCase();

  if (findUserByEmail(cleanEmail)) {
    throw new Error(
      "An account with this email already exists. Each student can only have one Studygroup account — please log in instead."
    );
  }
  if (!name.trim()) throw new Error("Please enter your full name.");
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) throw new Error("Please enter a valid email address.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  if (!TIER_META[tier]) throw new Error("Please select a valid academic tier.");

  const meta = TIER_META[tier];
  const users = getUsers();
  const user = {
    id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    email: cleanEmail,
    password,
    tier,
    tierLabel: meta.tierLabel,
    school: school.trim() || "Not specified",
    initials: initials(name),
    color: meta.color,
    minor: meta.minor,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  saveUsers(users);
  return user;
}

export function verifyLogin(email, password) {
  const user = findUserByEmail(email);
  if (!user) throw new Error("No account found with that email. Try signing up instead.");
  if (user.password !== password) throw new Error("Incorrect password.");
  return user;
}

/* --------------------------- Session ---------------------------- */

export function getSession() {
  return read(LS_KEYS.SESSION, null);
}

export function setSession(userId) {
  write(LS_KEYS.SESSION, { userId });
}

export function clearSession() {
  localStorage.removeItem(LS_KEYS.SESSION);
}

export function getSessionUser() {
  const session = getSession();
  if (!session) return null;
  return findUserById(session.userId);
}

/* ---------------------------- Posts ------------------------------ */

export function getPosts(seedIfEmpty) {
  const existing = read(LS_KEYS.POSTS, null);
  if (existing) return existing;
  write(LS_KEYS.POSTS, seedIfEmpty);
  return seedIfEmpty;
}

export function savePosts(posts) {
  write(LS_KEYS.POSTS, posts);
}

/* -------------------------- Mod log ------------------------------- */

export function getModLog() {
  return read(LS_KEYS.MODLOG, []);
}

export function saveModLog(log) {
  write(LS_KEYS.MODLOG, log);
}
