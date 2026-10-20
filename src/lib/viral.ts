/**
 * Contenus viraux des réseaux sociaux, captés à travers la presse qui les relaie :
 * articles « vidéo virale », « fait le buzz », « sur TikTok », et sites spécialisés
 * dans la reprise de posts viraux.
 */
import { normalize } from "./text";
import type { Leaning } from "./types";

/** Mots ajoutés aux recherches Google News pour cibler les reprises de contenus viraux. */
export const VIRAL_QUERY: Record<string, string> = {
  fr: '(vidéo OR viral OR virale OR buzz OR TikTok OR "sur X" OR "réseaux sociaux" OR internautes OR tollé)',
  en: '(viral OR video OR TikTok OR "on X" OR "social media" OR backlash OR clip)',
  pt: '(viral OR vídeo OR TikTok OR "redes sociais" OR viraliza OR polêmica)',
  es: '(viral OR video OR TikTok OR "redes sociales" OR polémica)',
  it: '(virale OR video OR TikTok OR social OR polemica)',
  de: '(viral OR Video OR TikTok OR "sozialen Medien" OR Shitstorm)',
};

/** Expressions qui signalent un article consacré à un contenu viral (titres, toutes langues). */
const SOCIAL_PATTERNS = [
  "video virale", "videos virales", "viral", "virale", "buzz", "tiktok", "instagram", "snapchat", "twitter",
  "sur x", "on x", "reseaux sociaux", "social media", "internautes", "tolle", "fait reagir", "enflamme la toile",
  "affole la toile", "devient virale", "goes viral", "went viral", "slammed", "backlash", "clip", "meme",
  "redes sociais", "redes sociales", "viraliza", "viralizou", "shitstorm", "sozialen medien", "youtube",
].map((p) => ` ${normalize(p)} `);

/** Sites dont le métier est de reprendre des posts viraux (reconnus quelle que soit la formulation du titre). */
export const VIRAL_SOURCES: { domain: string; name: string; country: string; leaning: Leaning }[] = [
  { domain: "konbini.com", name: "Konbini", country: "FR", leaning: "centre-gauche" },
  { domain: "brut.media", name: "Brut", country: "FR", leaning: "centre-gauche" },
  { domain: "actu.fr", name: "actu.fr", country: "FR", leaning: "centre" },
  { domain: "observers.france24.com", name: "Les Observateurs (France 24)", country: "FR", leaning: "centre" },
  { domain: "mediaite.com", name: "Mediaite", country: "US", leaning: "centre-gauche" },
  { domain: "dailydot.com", name: "The Daily Dot", country: "US", leaning: "centre-gauche" },
  { domain: "rawstory.com", name: "Raw Story", country: "US", leaning: "gauche" },
  { domain: "mediamatters.org", name: "Media Matters", country: "US", leaning: "gauche" },
  { domain: "thedailybeast.com", name: "The Daily Beast", country: "US", leaning: "gauche" },
  { domain: "newsweek.com", name: "Newsweek", country: "US", leaning: "centre" },
  { domain: "unilad.com", name: "UNILAD", country: "GB", leaning: "centre" },
  { domain: "ladbible.com", name: "LADbible", country: "GB", leaning: "centre" },
  { domain: "twitchy.com", name: "Twitchy", country: "US", leaning: "droite" },
  { domain: "dailycaller.com", name: "The Daily Caller", country: "US", leaning: "droite" },
  { domain: "theblaze.com", name: "TheBlaze", country: "US", leaning: "droite" },
  { domain: "townhall.com", name: "Townhall", country: "US", leaning: "droite" },
  { domain: "freebeacon.com", name: "Washington Free Beacon", country: "US", leaning: "droite" },
  { domain: "metropoles.com", name: "Metrópoles", country: "BR", leaning: "centre" },
  { domain: "revistaforum.com.br", name: "Revista Fórum", country: "BR", leaning: "gauche" },
  { domain: "oantagonista.com.br", name: "O Antagonista", country: "BR", leaning: "droite" },
  { domain: "poder360.com.br", name: "Poder360", country: "BR", leaning: "centre" },
];

const VIRAL_DOMAINS = new Set(VIRAL_SOURCES.map((s) => s.domain));

/** Vrai si l'article relaie un contenu viral des réseaux sociaux. */
export function isSocial(title: string, domain: string | null | undefined): boolean {
  if (domain && (VIRAL_DOMAINS.has(domain) || domain === "youtube.com")) return true;
  const t = ` ${normalize(title)} `;
  return SOCIAL_PATTERNS.some((p) => t.includes(p));
}
