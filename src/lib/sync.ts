import type { SupabaseClient } from "@supabase/supabase-js";
import { PERSONALITIES } from "@/data/personalities";

/**
 * Aligne la table des personnalités sur la liste du code (src/data/personalities.ts) :
 * ajoute les nouvelles, met à jour les existantes, désactive celles retirées.
 */
export async function syncPersonalities(db: SupabaseClient): Promise<number> {
  const rows = PERSONALITIES.map(({ wiki: _wiki, ...p }) => ({ ...p, active: true }));
  const { error } = await db.from("personalities").upsert(rows, { onConflict: "slug" });
  if (error) throw error;

  const slugs = PERSONALITIES.map((p) => `"${p.slug}"`).join(",");
  const { error: e2 } = await db.from("personalities").update({ active: false }).not("slug", "in", `(${slugs})`);
  if (e2) throw e2;
  return rows.length;
}
