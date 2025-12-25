// lib/profilePics.ts
import { supabase } from "../lib/supabase";

export function getProfilePicUrl(imagePath?: string | null, cacheBust: boolean = false) {
  if (!imagePath) return null;
  const { data } = supabase.storage.from("profile_pics").getPublicUrl(imagePath);
  
  // Add cache busting parameter if requested
  if (cacheBust) {
    return `${data.publicUrl}?t=${Date.now()}`;
  }
  
  return data.publicUrl;
}