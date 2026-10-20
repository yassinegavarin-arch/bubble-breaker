export const LEANINGS = ["gauche", "centre-gauche", "centre", "centre-droit", "droite"] as const;
export type Leaning = (typeof LEANINGS)[number];

export const STANCES = ["favorable", "defavorable", "neutre", "hors_sujet"] as const;
export type Stance = (typeof STANCES)[number];

export const ARGUMENTS = [
  "économie",
  "social",
  "sécurité",
  "immigration",
  "justice",
  "probité",
  "institutions",
  "international",
  "environnement",
  "santé",
  "éducation",
  "culture et société",
  "personnalité",
  "campagne et sondages",
  "autre",
] as const;

export interface Personality {
  id: number;
  slug: string;
  first_name: string | null;
  last_name: string;
  country: string;
  role: string | null;
  search_terms: string[];
  news_editions: string[];
  active: boolean;
  wiki: string | null;
  wikidata: string | null;
  /** "curated" : liste éditoriale ; "search" : créée par une recherche de visiteur. */
  origin: "curated" | "search";
  last_viewed_at: string | null;
  created_at: string;
}

export interface Source {
  id: number;
  domain: string;
  name: string;
  country: string;
  leaning: Leaning;
  feed_url: string | null;
  active: boolean;
}

export interface FeedRow {
  personality_id: number;
  stance: Stance;
  confidence: number | null;
  satire: boolean | null;
  argument: string | null;
  justification: string | null;
  summary_fr: string | null;
  article_id: number;
  url: string;
  title: string;
  excerpt: string | null;
  source_name: string;
  domain: string | null;
  published_at: string;
  leaning: Leaning | null;
  story_id: number | null;
  story_score: number | null;
  is_viral: boolean | null;
  source_count: number | null;
  leaning_count: number | null;
  kind: "article" | "video" | null;
  social: boolean | null;
  video_id: string | null;
  views: number | null;
  likes: number | null;
  thumbnail: string | null;
  title_fr: string | null;
}

/** Seuil de confiance en dessous duquel un classement n'est pas affiché. */
export const MIN_CONFIDENCE = 0.7;

export function displayName(p: Pick<Personality, "first_name" | "last_name">): string {
  return p.first_name ? `${p.first_name} ${p.last_name}` : p.last_name;
}
