import { PERSONALITIES } from "@/data/personalities";

export interface Portrait {
  src: string;
  /** Page de la photo sur Wikimedia Commons (crédit et licence). */
  credit: string;
}

const UA = "BubbleBreaker/0.2 (https://bubble-breaker-psi.vercel.app; contact via GitHub yassinegavarin-arch)";

interface WikiImages {
  /** URLs candidates, de la plus adaptée à la plus lourde. */
  candidates: string[];
  credit: string;
}

/** Image principale de l'article Wikipédia (photos sous licence libre de Wikimedia Commons). Cache 7 jours. */
export async function wikiImages(wiki: string): Promise<WikiImages | null> {
  try {
    const res = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wiki)}`, {
      headers: { "User-Agent": UA },
      next: { revalidate: 7 * 24 * 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const thumb: string | undefined = json?.thumbnail?.source;
    const original: string | undefined = json?.originalimage?.source;
    if (!thumb && !original) return null;
    // Wikimedia n'accepte que des largeurs standard : 500 px convient aux cartes.
    const candidates = [thumb?.replace(/\/\d+px-/, "/500px-"), thumb, original].filter((u): u is string => Boolean(u));
    const file = (original ?? thumb ?? "").split("/").pop()?.replace(/^\d+px-/, "");
    const credit = file
      ? `https://commons.wikimedia.org/wiki/File:${decodeURIComponent(file)}`
      : json?.content_urls?.desktop?.page ?? "https://commons.wikimedia.org";
    return { candidates: Array.from(new Set(candidates)), credit };
  } catch {
    return null;
  }
}

export { UA as WIKI_UA };

async function fetchPortrait(slug: string, wiki: string): Promise<Portrait | null> {
  const images = await wikiImages(wiki);
  // L'image est servie par notre propre route (/api/portrait), mise en cache par Vercel.
  return images ? { src: `/api/portrait/${slug}`, credit: images.credit } : null;
}

/** Titre Wikipédia d'une personnalité : liste du code, sinon base de données (fiches créées par recherche). */
export async function wikiTitle(slug: string): Promise<string | null> {
  const def = PERSONALITIES.find((p) => p.slug === slug);
  if (def) return def.wiki;
  const { publicClient } = await import("./supabase");
  const { data } = await publicClient().from("personalities").select("wiki").eq("slug", slug).maybeSingle();
  return (data?.wiki as string | undefined) ?? null;
}

export async function getPortraits(people: { slug: string; wiki?: string | null }[]): Promise<Record<string, Portrait | null>> {
  const entries = await Promise.all(
    people.map(async (p) => {
      const wiki = PERSONALITIES.find((d) => d.slug === p.slug)?.wiki ?? p.wiki;
      return [p.slug, wiki ? await fetchPortrait(p.slug, wiki) : null] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function getPortrait(slug: string): Promise<Portrait | null> {
  const wiki = await wikiTitle(slug);
  return wiki ? fetchPortrait(slug, wiki) : null;
}
