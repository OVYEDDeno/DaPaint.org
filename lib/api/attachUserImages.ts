// lib/api/attachUserImages.ts
import { supabase } from '../supabase';

export async function attachUserImagesToDaPaints<
  T extends { host_id: string; foe_id?: string | null },
>(dapaints: T[]) {
  const ids = Array.from(
    new Set(
      dapaints.flatMap(d => [d.host_id, d.foe_id].filter(Boolean) as string[])
    )
  );

  if (ids.length === 0)
    return dapaints.map(d => ({
      ...d,
      host_image_url: null,
      foe_image_url: null,
    }));

  const { data: users, error } = await supabase
    .from('users')
    .select('id, image_path')
    .in('id', ids);

  if (error) throw error;

  const map = new Map(users?.map(u => [u.id, u.image_path ?? null]) ?? []);

  return dapaints.map(d => ({
    ...d,
    host_image_url: map.get(d.host_id) ?? null,
    foe_image_url: d.foe_id ? (map.get(d.foe_id) ?? null) : null,
  }));
}
