import { supabase } from "./supabaseClient.js";
import { timeAgo } from "./format.js";

const VIBE_SELECT = `
  id, title, subject, video_url, created_at, author_id,
  author:profiles!vibes_author_id_fkey ( name, initials, color ),
  vibe_comments ( id, text, created_at, author:profiles!vibe_comments_author_id_fkey ( name ) )
`;

function mapVibe(row) {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    videoUrl: row.video_url,
    time: timeAgo(row.created_at),
    authorName: row.author?.name ?? "Unknown",
    authorInitials: row.author?.initials ?? "?",
    authorColor: row.author?.color ?? "#FFD000",
    comments: (row.vibe_comments ?? [])
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((c) => ({ author: c.author?.name ?? "Unknown", text: c.text })),
  };
}

export async function fetchVibes() {
  const { data, error } = await supabase
    .from("vibes")
    .select(VIBE_SELECT)
    .eq("quarantined", false)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapVibe);
}

export async function createVibe({ authorId, title, subject, videoUrl }) {
  const { error } = await supabase.from("vibes").insert({
    author_id: authorId,
    title: title.trim(),
    subject: subject?.trim() || null,
    video_url: videoUrl,
  });
  if (error) throw new Error(error.message);
}

export async function quarantineVibe(vibeId) {
  const { error } = await supabase.from("vibes").update({ quarantined: true }).eq("id", vibeId);
  if (error) throw new Error(error.message);
}

export async function addVibeComment({ vibeId, authorId, text }) {
  const { error } = await supabase.from("vibe_comments").insert({ vibe_id: vibeId, author_id: authorId, text });
  if (error) throw new Error(error.message);
}
