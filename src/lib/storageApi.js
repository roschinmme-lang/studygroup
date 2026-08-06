import { supabase } from "./supabaseClient.js";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB — Supabase's default per-file cap on most plans

export function validateImageFile(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Images must be under 8MB.");
  }
}

export function validateVideoFile(file) {
  if (!file.type.startsWith("video/")) {
    throw new Error("Please choose a video file.");
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("Videos must be under 50MB. Trim your clip and try again.");
  }
}

export async function uploadPostImage(file, userId) {
  validateImageFile(file);
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from("post-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("post-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadVibeVideo(file, userId) {
  validateVideoFile(file);
  const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from("vibe-videos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("vibe-videos").getPublicUrl(path);
  return data.publicUrl;
}
