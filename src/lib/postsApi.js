import { supabase } from "./supabaseClient.js";
import { timeAgo, formatTimestamp } from "./format.js";

const POST_SELECT = `
  id, content, squad, created_at, author_id, image_url,
  author:profiles!posts_author_id_fkey ( name, tier, initials, color ),
  comments ( id, text, created_at, author:profiles!comments_author_id_fkey ( name ) ),
  post_likes ( user_id )
`;

/** Maps a raw Supabase row into the shape the UI components expect. */
function mapPost(row, currentUserId) {
  return {
    id: row.id,
    authorName: row.author?.name ?? "Unknown",
    authorTier: row.author?.tier ?? "UNI",
    authorInitials: row.author?.initials ?? "?",
    authorColor: row.author?.color ?? "#FFD000",
    time: timeAgo(row.created_at),
    squad: row.squad,
    content: row.content,
    imageUrl: row.image_url,
    likes: row.post_likes?.length ?? 0,
    likedByMe: (row.post_likes ?? []).some((l) => l.user_id === currentUserId),
    commentsList: (row.comments ?? [])
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((c) => ({ author: c.author?.name ?? "Unknown", text: c.text })),
  };
}

export async function fetchPosts(currentUserId) {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("quarantined", false)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapPost(row, currentUserId));
}

export async function createPost({ authorId, content, squad = "Your feed", imageUrl = null }) {
  const { error } = await supabase.from("posts").insert({ author_id: authorId, content, squad, image_url: imageUrl });
  if (error) throw new Error(error.message);
}

export async function addComment({ postId, authorId, text }) {
  const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: authorId, text });
  if (error) throw new Error(error.message);
}

export async function toggleLike({ postId, userId, currentlyLiked }) {
  if (currentlyLiked) {
    const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
    if (error) throw new Error(error.message);
  }
}

export async function quarantinePost(postId) {
  const { error } = await supabase.from("posts").update({ quarantined: true }).eq("id", postId);
  if (error) throw new Error(error.message);
}

function mapModLogRow(row) {
  return {
    id: row.id,
    reasonLabel: row.reason_label,
    targetSnippet: row.target_snippet,
    timestamp: formatTimestamp(row.created_at),
    device: row.device,
    lockout: row.lockout,
  };
}

export async function fetchModLog() {
  const { data, error } = await supabase.from("mod_log").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapModLogRow);
}

export async function insertModLogEntry({ reasonLabel, targetSnippet, device, lockout }) {
  const { data, error } = await supabase
    .from("mod_log")
    .insert({ reason_label: reasonLabel, target_snippet: targetSnippet, device, lockout })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapModLogRow(data);
}
