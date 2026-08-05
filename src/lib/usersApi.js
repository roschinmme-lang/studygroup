import { supabase } from "./supabaseClient.js";

/** Real signed-up students, excluding yourself, most recent first. */
export async function fetchSuggestedProfiles(currentUserId, limit = 8) {
  const { data, error } = await supabase
    .from("profiles")
.select("id, name, tier, school, initials, color, minor, is_mentor")    .neq("id", currentUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** The account flagged as the mentor contact, if one has been set up. */
export async function fetchMentor() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, initials, color")
    .eq("is_mentor", true)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
