import { supabase } from "./supabaseClient.js";

export async function fetchSquads(currentUserId) {
  const { data, error } = await supabase
    .from("squads")
    .select("id, name, description, created_at, squad_members ( user_id )")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    memberCount: s.squad_members?.length ?? 0,
    joined: (s.squad_members ?? []).some((m) => m.user_id === currentUserId),
  }));
}

export async function joinSquad(squadId, userId) {
  const { error } = await supabase.from("squad_members").insert({ squad_id: squadId, user_id: userId });
  if (error) throw new Error(error.message);
}

export async function leaveSquad(squadId, userId) {
  const { error } = await supabase.from("squad_members").delete().eq("squad_id", squadId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function createSquad({ name, description, creatorId }) {
  const { data, error } = await supabase.from("squads").insert({ name: name.trim(), description: description?.trim() || null }).select().single();
  if (error) {
    if (/duplicate key|unique/i.test(error.message)) {
      throw new Error("A squad with that name already exists.");
    }
    throw new Error(error.message);
  }
  await joinSquad(data.id, creatorId);
  return data;
}
