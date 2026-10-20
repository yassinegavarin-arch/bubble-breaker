import type { SupabaseClient } from "@supabase/supabase-js";
import { PERSONALITIES } from "@/data/personalities";
import { VIRAL_SOURCES } from "./viral";

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

/** Supprime les signalements de plus de 12 mois (durée annoncée dans la politique de confidentialité). */
export async function purgeOldReports(db: SupabaseClient): Promise<void> {
  const limit = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
  await db.from("reports").delete().lt("created_at", limit);
}

/** Ajoute les sites spécialisés dans la reprise de contenus viraux à la liste des médias. */
export async function syncViralSources(db: SupabaseClient): Promise<void> {
  const { error } = await db
    .from("sources")
    .upsert(VIRAL_SOURCES.map((s) => ({ ...s, active: true })), { onConflict: "domain", ignoreDuplicates: true });
  if (error) throw error;
}
