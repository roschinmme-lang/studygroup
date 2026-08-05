import { supabase } from "./supabaseClient.js";

export async function fetchThread(userId, otherId) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, recipient_id, text, created_at")
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function sendMessage({ senderId, recipientId, text }) {
  const { error } = await supabase.from("messages").insert({ sender_id: senderId, recipient_id: recipientId, text });
  if (error) throw new Error(error.message);
}
