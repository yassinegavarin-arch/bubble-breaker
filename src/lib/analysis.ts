import { LEANINGS, type FeedRow, type Leaning, type Stance } from "./types";
import { isSocial } from "./viral";

export interface StoryCard {
  key: string;
  headline: string;
  url: string;
  summary: string | null;
  justification: string | null;
  confidence: number | null;
  satire: boolean;
  argument: string | null;
  score: number;
  isViral: boolean;
  /** L'histoire relaie un contenu viral des réseaux sociaux. */
  social: boolean;
  firstSeen: string;
  articles: Pick<FeedRow, "article_id" | "url" | "title" | "source_name" | "leaning" | "published_at">[];
  leanings: Leaning[];
}

/** Regroupe les articles d'une même position par fait, du plus viral au moins viral. */
export function storyCards(rows: FeedRow[], stance: Stance, onlySocial = false): StoryCard[] {
  const groups = new Map<string, FeedRow[]>();
  for (const r of rows) {
    if (r.stance !== stance || r.kind === "video") continue;
    const key = r.story_id != null ? `s${r.story_id}` : `a${r.article_id}`;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const cards = Array.from(groups, ([key, list]) => {
    const sorted = [...list].sort((a, b) => Date.parse(a.published_at) - Date.parse(b.published_at));
    const lead = [...list].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
    const leanings = LEANINGS.filter((l) => list.some((r) => r.leaning === l));
    return {
      key,
      headline: lead.title_fr || lead.title,
      url: lead.url,
      summary: lead.summary_fr,
      justification: lead.justification,
      confidence: lead.confidence,
      satire: Boolean(lead.satire),
      argument: lead.argument,
      score: Number(lead.story_score ?? 0),
      isViral: Boolean(lead.is_viral),
      social: list.some((r) => r.social || isSocial(r.title, r.domain)),
      firstSeen: sorted[0].published_at,
      articles: sorted.map(({ article_id, url, title, title_fr, source_name, leaning, published_at }) => ({
        article_id,
        url,
        title: title_fr || title,
        source_name,
        leaning,
        published_at,
      })),
      leanings,
    };
  });

  return cards
    .filter((c) => !onlySocial || c.social)
    .sort((a, b) => b.score - a.score || b.articles.length - a.articles.length || Date.parse(b.firstSeen) - Date.parse(a.firstSeen));
}

export interface Balance {
  favorable: number;
  defavorable: number;
  neutre: number;
  total: number;
  /** Solde en points : part favorable moins part défavorable (de -100 à +100). */
  net: number;
}

export function balance(rows: Pick<FeedRow, "stance">[]): Balance {
  const favorable = rows.filter((r) => r.stance === "favorable").length;
  const defavorable = rows.filter((r) => r.stance === "defavorable").length;
  const neutre = rows.filter((r) => r.stance === "neutre").length;
  const total = favorable + defavorable + neutre;
  return { favorable, defavorable, neutre, total, net: total ? Math.round(((favorable - defavorable) / total) * 100) : 0 };
}

/** Minimum d'articles pour qu'une sensibilité compte dans l'écart de bulle. */
export const MIN_BUCKET = 5;

export interface Thermometer {
  buckets: { leaning: Leaning | "non classé"; balance: Balance }[];
  overall: Balance;
  /** Écart, en points, entre la sensibilité la plus favorable et la plus défavorable. */
  gap: number | null;
  warmest: Leaning | null;
  coldest: Leaning | null;
}

export function thermometer(rows: Pick<FeedRow, "stance" | "leaning">[]): Thermometer {
  const buckets: Thermometer["buckets"] = LEANINGS.map((l) => ({ leaning: l, balance: balance(rows.filter((r) => r.leaning === l)) }));
  const unknown = rows.filter((r) => !r.leaning);
  if (unknown.length) buckets.push({ leaning: "non classé", balance: balance(unknown) });

  const eligible = buckets.filter((b) => b.leaning !== "non classé" && b.balance.total >= MIN_BUCKET);
  let gap: number | null = null;
  let warmest: Leaning | null = null;
  let coldest: Leaning | null = null;
  if (eligible.length >= 2) {
    const sorted = [...eligible].sort((a, b) => b.balance.net - a.balance.net);
    warmest = sorted[0].leaning as Leaning;
    coldest = sorted[sorted.length - 1].leaning as Leaning;
    gap = sorted[0].balance.net - sorted[sorted.length - 1].balance.net;
  }
  return { buckets, overall: balance(rows), gap, warmest, coldest };
}

/** Les arguments les plus fréquents d'un camp, avec un exemple de titre. */
export function topArguments(rows: FeedRow[], stance: Stance, n = 3) {
  const counts = new Map<string, { count: number; example: FeedRow }>();
  for (const r of rows) {
    if (r.stance !== stance || !r.argument || r.argument === "autre") continue;
    const entry = counts.get(r.argument);
    if (entry) {
      entry.count++;
      if ((r.story_score ?? 0) > (entry.example.story_score ?? 0)) entry.example = r;
    } else counts.set(r.argument, { count: 1, example: r });
  }
  return Array.from(counts, ([argument, v]) => ({ argument, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/** Vidéos d'une position, des plus vues aux moins vues. */
export function topVideos(rows: FeedRow[], stance: Stance, n = 8): FeedRow[] {
  const seen = new Set<string>();
  return rows
    .filter((r) => r.kind === "video" && r.stance === stance && r.video_id)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .filter((r) => (seen.has(r.video_id!) ? false : (seen.add(r.video_id!), true)))
    .slice(0, n);
}
