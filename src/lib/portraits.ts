import { PERSONALITIES } from "@/data/personalities";

export interface Portrait {
  src: string;
  /** Page de la photo sur Wikimedia Commons (crédit et licence). */
  credit: string;
}

/**
 * Portrait d'une personnalité, tiré de l'image principale de son article Wikipédia
 * (photos sous licence libre de Wikimedia Commons). Mis en cache 7 jours.
 */
async function fetchPortrait(wiki: string): Promise<Portrait | null> {
  try {
    const res = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wiki)}`, {
      headers: { "User-Agent": "BubbleBreaker/0.2 (https://bubble-breaker-psi.vercel.app)" },
      next: { revalidate: 7 * 24 * 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const thumb: string | undefined = json?.thumbnail?.source;
    const original: string | undefined = json?.originalimage?.source;
    if (!thumb && !original) return null;
    // Vignette élargie à 640 px pour un rendu net sur les cartes.
    const src = thumb ? thumb.replace(/\/\d+px-/, "/640px-") : original!;
    const file = (original ?? thumb ?? "").split("/").pop()?.replace(/^\d+px-/, "");
    const credit = file
      ? `https://commons.wikimedia.org/wiki/File:${decodeURIComponent(file)}`
      : json?.content_urls?.desktop?.page ?? "https://commons.wikimedia.org";
    return { src, credit };
  } catch {
    return null;
  }
}

export async function getPortraits(): Promise<Record<string, Portrait | null>> {
  const entries = await Promise.all(PERSONALITIES.map(async (p) => [p.slug, await fetchPortrait(p.wiki)] as const));
  return Object.fromEntries(entries);
}

export async function getPortrait(slug: string): Promise<Portrait | null> {
  const def = PERSONALITIES.find((p) => p.slug === slug);
  return def ? fetchPortrait(def.wiki) : null;
}
