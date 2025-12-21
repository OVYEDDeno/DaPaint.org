// lib/profilePics.ts
import { supabase } from "../lib/supabase";

export function getProfilePicUrl(imagePath?: string | null) {
  if (!imagePath) return null;
  const { data } = supabase.storage.from("profile_pics").getPublicUrl(imagePath);
  return data.publicUrl;
}
