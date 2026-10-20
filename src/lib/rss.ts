import { XMLParser } from "fast-xml-parser";
import { stripHtml } from "./text";

export interface FeedItem {
  title: string;
  link: string;
  description: string;
  publishedAt: Date | null;
  sourceName: string | null;
  sourceUrl: string | null;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  processEntities: true,
  htmlEntities: true,
});

const USER_AGENT = "BubbleBreakerBot/0.1 (+https://github.com/yassinegavarin-arch/bubble-breaker)";

function text(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node === "object" && "#text" in (node as Record<string, unknown>)) {
    return String((node as Record<string, unknown>)["#text"] ?? "");
  }
  return "";
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Télécharge et lit un flux RSS 2.0 ou Atom. */
export async function fetchFeed(url: string, timeoutMs = 10_000): Promise<FeedItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const doc = parser.parse(xml);

  // RSS 2.0
  const rssItems = asArray(doc?.rss?.channel?.item);
  if (rssItems.length > 0) {
    return rssItems.map((it: Record<string, unknown>) => {
      const source = it.source as Record<string, unknown> | string | undefined;
      return {
        title: stripHtml(text(it.title)),
        link: text(it.link).trim(),
        description: text(it.description),
        publishedAt: parseDate(text(it.pubDate) || text(it["dc:date"])),
        sourceName: source ? stripHtml(text(source)) || null : null,
        sourceUrl: source && typeof source === "object" ? String(source["@_url"] ?? "") || null : null,
      };
    });
  }

  // Atom
  const entries = asArray(doc?.feed?.entry);
  return entries.map((e: Record<string, unknown>) => {
    const links = asArray(e.link as Record<string, unknown> | Record<string, unknown>[]);
    const alternate = links.find((l) => !l["@_rel"] || l["@_rel"] === "alternate") ?? links[0];
    return {
      title: stripHtml(text(e.title)),
      link: alternate ? String(alternate["@_href"] ?? "") : "",
      description: text(e.summary) || text(e.content),
      publishedAt: parseDate(text(e.published) || text(e.updated)),
      sourceName: null,
      sourceUrl: null,
    };
  });
}

const EDITIONS: Record<string, string> = {
  fr: "hl=fr&gl=FR&ceid=FR:fr",
  en: "hl=en-US&gl=US&ceid=US:en",
  pt: "hl=pt-BR&gl=BR&ceid=BR:pt-419",
  es: "hl=es-419&gl=AR&ceid=AR:es-419",
  it: "hl=it&gl=IT&ceid=IT:it",
  de: "hl=de&gl=DE&ceid=DE:de",
};

/** URL du flux Google News pour une recherche donnée, sur les 7 derniers jours. */
export function googleNewsUrl(query: string, edition: string): string {
  const params = EDITIONS[edition] ?? EDITIONS.fr;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:7d`)}&${params}`;
}
