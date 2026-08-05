import { supabase } from "./supabaseClient.js";
import { timeAgo } from "./format.js";

const NOTIF_SELECT = `
  id, type, read, created_at, post_id, message_id,
  actor:profiles!notifications_actor_id_fkey ( id, name, initials, color )
`;

function mapNotification(row) {
  return {
    id: row.id,
    type: row.type,
    read: row.read,
    time: timeAgo(row.created_at),
    postId: row.post_id,
    actor: {
      id: row.actor?.id,
      name: row.actor?.name ?? "Someone",
      initials: row.actor?.initials ?? "?",
      color: row.actor?.color ?? "#FFD000",
    },
  };
}

export async function fetchNotifications(userId, limit = 30) {
  const { data, error } = await supabase
    .from("notifications")
    .select(NOTIF_SELECT)
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapNotification);
}

export async function markNotificationRead(id) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(userId) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_id", userId)
    .eq("read", false);
  if (error) throw new Error(error.message);
}
