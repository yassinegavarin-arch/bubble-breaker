import type { SupabaseClient } from "@supabase/supabase-js";
import { jaccard, keywords } from "./text";
import type { Personality } from "./types";

/** Seuil de ressemblance entre deux titres pour les considérer comme le même fait. */
const SIMILARITY = 0.3;
/** Un fait reste « ouvert » 48 h après son premier article. */
const STORY_WINDOW_MS = 48 * 3600 * 1000;
/** Fenêtre « vitesse » : articles parus dans les 12 premières heures. */
const EARLY_WINDOW_MS = 12 * 3600 * 1000;
/** Un fait est viral s'il atteint ce score ET ce nombre minimum de médias différents. */
export const VIRAL_SCORE = 80;
export const VIRAL_MIN_SOURCES = 3;

interface StoryRow {
  id: number;
  personality_id: number;
  tokens: string[];
  headline: string;
  first_seen: string;
  last_seen: string;
  article_count: number;
  source_count: number;
  leaning_count: number;
  early_count: number;
  score: number;
  is_viral: boolean;
}

interface PendingMention {
  article_id: number;
  personality_id: number;
  articles: { title: string; published_at: string };
}

interface WorkingStory {
  id?: number;
  tokens: string[];
  headline: string;
  first: number;
  members: { article_id: number }[];
}

/** Rang centile (0 à 100) de chaque valeur dans la série. */
function percentiles(values: number[]): number[] {
  if (values.length <= 1) return values.map(() => 100);
  const sorted = [...values].sort((a, b) => a - b);
  return values.map((v) => {
    const below = sorted.filter((x) => x < v).length;
    const equal = sorted.filter((x) => x === v).length;
    return Math.round(((below + 0.5 * equal) / values.length) * 100);
  });
}

/**
 * 1. Rattache chaque nouvel article à un fait existant ou en crée un.
 * 2. Recalcule les compteurs et le score de viralité des faits des 7 derniers jours.
 */
export async function updateStories(db: SupabaseClient): Promise<{ assigned: number; created: number; scored: number }> {
  const { data: people, error } = await db.from("personalities").select("id, search_terms").eq("active", true);
  if (error) throw error;

  let assigned = 0;
  let created = 0;
  let scored = 0;

  for (const p of (people ?? []) as Pick<Personality, "id" | "search_terms">[]) {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const { data: pending, error: e1 } = await db
      .from("mentions")
      .select("article_id, personality_id, articles!inner(title, published_at)")
      .eq("personality_id", p.id)
      .is("story_id", null)
      .gte("articles.published_at", since)
      .limit(1000);
    if (e1) throw e1;

    if (pending && pending.length > 0) {
      const { data: openStories, error: e2 } = await db
        .from("stories")
        .select("id, tokens, headline, first_seen")
        .eq("personality_id", p.id)
        .gte("first_seen", new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString());
      if (e2) throw e2;

      const working: WorkingStory[] = (openStories ?? []).map((s) => ({
        id: s.id,
        tokens: s.tokens,
        headline: s.headline,
        first: Date.parse(s.first_seen),
        members: [],
      }));

      const rows = (pending as unknown as PendingMention[]).sort(
        (a, b) => Date.parse(a.articles.published_at) - Date.parse(b.articles.published_at),
      );

      for (const m of rows) {
        const t = Date.parse(m.articles.published_at);
        const tokens = keywords(m.articles.title, p.search_terms);
        let best: WorkingStory | null = null;
        let bestSim = SIMILARITY;
        for (const s of working) {
          if (Math.abs(t - s.first) > STORY_WINDOW_MS) continue;
          const sim = jaccard(tokens, s.tokens);
          if (sim >= bestSim) {
            best = s;
            bestSim = sim;
          }
        }
        if (best) {
          best.members.push({ article_id: m.article_id });
        } else {
          working.push({ tokens, headline: m.articles.title, first: t, members: [{ article_id: m.article_id }] });
        }
      }

      // Création des nouveaux faits
      const fresh = working.filter((s) => s.id === undefined);
      for (let i = 0; i < fresh.length; i += 200) {
        const chunk = fresh.slice(i, i + 200);
        const { data, error: e3 } = await db
          .from("stories")
          .insert(
            chunk.map((s) => ({
              personality_id: p.id,
              tokens: s.tokens,
              headline: s.headline,
              first_seen: new Date(s.first).toISOString(),
              last_seen: new Date(s.first).toISOString(),
            })),
          )
          .select("id");
        if (e3) throw e3;
        data?.forEach((row, j) => (chunk[j].id = row.id));
        created += chunk.length;
      }

      // Rattachement des articles
      const updates = working.flatMap((s) =>
        s.members.map((m) => ({ article_id: m.article_id, personality_id: p.id, story_id: s.id })),
      );
      for (let i = 0; i < updates.length; i += 500) {
        const { error: e4 } = await db
          .from("mentions")
          .upsert(updates.slice(i, i + 500), { onConflict: "article_id,personality_id" });
        if (e4) throw e4;
      }
      assigned += updates.length;
    }

    scored += await rescore(db, p.id, since);
  }

  return { assigned, created, scored };
}

/** Score de viralité : volume (40 %), reprise par plusieurs sensibilités (35 %), vitesse (25 %). */
async function rescore(db: SupabaseClient, personalityId: number, since: string): Promise<number> {
  const { data: stories, error } = await db
    .from("stories")
    .select("*")
    .eq("personality_id", personalityId)
    .gte("last_seen", since);
  if (error) throw error;
  if (!stories || stories.length === 0) return 0;

  const { data: members, error: e2 } = await db
    .from("mentions")
    .select("story_id, articles!inner(domain, source_name, published_at, sources(leaning))")
    .eq("personality_id", personalityId)
    .not("story_id", "is", null)
    .gte("articles.published_at", new Date(Date.parse(since) - 4 * 24 * 3600 * 1000).toISOString())
    .limit(10000);
  if (e2) throw e2;

  type Member = {
    story_id: number;
    articles: { domain: string | null; source_name: string; published_at: string; sources: { leaning: string } | null };
  };
  const byStory = new Map<number, Member[]>();
  for (const m of (members ?? []) as unknown as Member[]) {
    const list = byStory.get(m.story_id) ?? [];
    list.push(m);
    byStory.set(m.story_id, list);
  }

  const rows = (stories as StoryRow[]).map((s) => {
    const list = byStory.get(s.id) ?? [];
    const times = list.map((m) => Date.parse(m.articles.published_at)).sort((a, b) => a - b);
    const first = times[0] ?? Date.parse(s.first_seen);
    const last = times[times.length - 1] ?? Date.parse(s.last_seen);
    return {
      ...s,
      first_seen: new Date(first).toISOString(),
      last_seen: new Date(last).toISOString(),
      article_count: list.length,
      source_count: new Set(list.map((m) => m.articles.domain ?? m.articles.source_name)).size,
      leaning_count: new Set(list.map((m) => m.articles.sources?.leaning).filter(Boolean)).size,
      early_count: times.filter((t) => t - first <= EARLY_WINDOW_MS).length,
    };
  });

  const pVolume = percentiles(rows.map((r) => r.source_count));
  const pSpread = percentiles(rows.map((r) => r.leaning_count));
  const pSpeed = percentiles(rows.map((r) => r.early_count));

  const scoredRows = rows.map((r, i) => {
    const score = Math.round((0.4 * pVolume[i] + 0.35 * pSpread[i] + 0.25 * pSpeed[i]) * 10) / 10;
    return { ...r, score, is_viral: score >= VIRAL_SCORE && r.source_count >= VIRAL_MIN_SOURCES };
  });

  for (let i = 0; i < scoredRows.length; i += 500) {
    const { error: e3 } = await db.from("stories").upsert(scoredRows.slice(i, i + 500), { onConflict: "id" });
    if (e3) throw e3;
  }
  return scoredRows.length;
}
