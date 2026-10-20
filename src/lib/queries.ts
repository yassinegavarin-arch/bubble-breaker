import { publicClient } from "./supabase";
import { MIN_CONFIDENCE, type FeedRow, type Personality, type Source } from "./types";

export async function getPersonalities(): Promise<Personality[]> {
  const { data, error } = await publicClient()
    .from("personalities")
    .select("*")
    .eq("active", true)
    .order("last_name");
  if (error) throw error;
  return (data ?? []) as Personality[];
}

export async function getPersonality(slug: string): Promise<Personality | null> {
  const { data, error } = await publicClient().from("personalities").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data as Personality) ?? null;
}

export async function getSources(): Promise<Source[]> {
  const { data, error } = await publicClient().from("sources").select("*").eq("active", true).order("name");
  if (error) throw error;
  return (data ?? []) as Source[];
}

function sinceIso(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

/** Articles classés (confiance suffisante, hors sujets exclus) d'une personnalité. */
export async function getFeed(personalityId: number, hours: number): Promise<FeedRow[]> {
  const { data, error } = await publicClient()
    .from("feed")
    .select("*")
    .eq("personality_id", personalityId)
    .neq("stance", "hors_sujet")
    .gte("confidence", MIN_CONFIDENCE)
    .gte("published_at", sinceIso(hours))
    .order("published_at", { ascending: false })
    .limit(3000);
  if (error) throw error;
  return (data ?? []) as FeedRow[];
}

/** Vue d'ensemble pour l'accueil : position et sensibilité de chaque article classé. */
export async function getOverview(hours: number): Promise<Pick<FeedRow, "personality_id" | "stance" | "leaning">[]> {
  const { data, error } = await publicClient()
    .from("feed")
    .select("personality_id, stance, leaning")
    .neq("stance", "hors_sujet")
    .gte("confidence", MIN_CONFIDENCE)
    .gte("published_at", sinceIso(hours))
    .limit(20000);
  if (error) throw error;
  return (data ?? []) as Pick<FeedRow, "personality_id" | "stance" | "leaning">[];
}

export async function getLastUpdate(): Promise<string | null> {
  const { data } = await publicClient()
    .from("articles")
    .select("fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.fetched_at ?? null;
}

/** Chiffres clés pour l'accueil : articles collectés sur 7 jours, articles classés, médias suivis. */
export async function getCounts(): Promise<{ articles: number; classified: number; sources: number }> {
  const db = publicClient();
  const since = sinceIso(7 * 24);
  const [a, c, s] = await Promise.all([
    db.from("articles").select("id", { count: "exact", head: true }).gte("published_at", since),
    db.from("mentions").select("article_id", { count: "exact", head: true }).not("classified_at", "is", null),
    db.from("sources").select("id", { count: "exact", head: true }).eq("active", true),
  ]);
  return { articles: a.count ?? 0, classified: c.count ?? 0, sources: s.count ?? 0 };
}
