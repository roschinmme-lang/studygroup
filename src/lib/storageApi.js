import { supabase } from "./supabaseClient.js";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export function validateImageFile(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Images must be under 8MB.");
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
