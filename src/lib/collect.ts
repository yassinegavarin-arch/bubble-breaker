import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchFeed, googleNewsUrl, type FeedItem } from "./rss";
import { hostname, mentions, normalize, stripHtml, truncate } from "./text";
import type { Personality, Source } from "./types";

const MAX_AGE_MS = 7 * 24 * 3600 * 1000;
const CONCURRENCY = 8;

interface Candidate {
  dedup_key: string;
  url: string;
  title: string;
  excerpt: string | null;
  source_id: number | null;
  source_name: string;
  domain: string | null;
  lang: string | null;
  published_at: string;
  personalityIds: Set<number>;
}

export interface CollectReport {
  feedsOk: number;
  feedsFailed: { url: string; error: string }[];
  itemsSeen: number;
  articlesNew: number;
  mentionsNew: number;
}

/** Exécute des tâches avec un nombre limité de requêtes simultanées. */
async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function findSource(domain: string | null, sources: Source[]): Source | null {
  if (!domain) return null;
  let best: Source | null = null;
  for (const s of sources) {
    if (domain === s.domain || domain.endsWith(`.${s.domain}`)) {
      if (!best || s.domain.length > best.domain.length) best = s;
    }
  }
  return best;
}

/** Google News termine ses titres par " - Nom du média". */
function cleanGoogleTitle(title: string, sourceName: string | null): string {
  if (sourceName && title.endsWith(` - ${sourceName}`)) return title.slice(0, -(sourceName.length + 3)).trim();
  const i = title.lastIndexOf(" - ");
  return i > 20 ? title.slice(0, i).trim() : title;
}

export async function collect(db: SupabaseClient): Promise<CollectReport> {
  const [{ data: people, error: e1 }, { data: sources, error: e2 }] = await Promise.all([
    db.from("personalities").select("*").eq("active", true),
    db.from("sources").select("*").eq("active", true),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const personalities = (people ?? []) as Personality[];
  const sourceList = (sources ?? []) as Source[];

  const candidates = new Map<string, Candidate>();
  const report: CollectReport = { feedsOk: 0, feedsFailed: [], itemsSeen: 0, articlesNew: 0, mentionsNew: 0 };
  const now = Date.now();

  function add(item: FeedItem, opts: { fromGoogle: boolean; lang: string | null; forced?: Source | null }, matches: Personality[]) {
    if (matches.length === 0 || !item.title || !item.link) return;
    const published = item.publishedAt ?? new Date();
    if (now - published.getTime() > MAX_AGE_MS) return;

    const domain = opts.forced?.domain ?? hostname(item.sourceUrl ?? "") ?? hostname(item.link);
    const source = opts.forced ?? findSource(domain, sourceList);
    const sourceName = source?.name ?? item.sourceName ?? domain ?? "Source inconnue";
    const title = opts.fromGoogle ? cleanGoogleTitle(item.title, item.sourceName) : item.title;
    const excerptText = opts.fromGoogle ? "" : stripHtml(item.description);
    const key = `${source?.domain ?? domain ?? sourceName}|${normalize(title).slice(0, 140)}`;

    const existing = candidates.get(key);
    if (existing) {
      matches.forEach((p) => existing.personalityIds.add(p.id));
      if (!opts.fromGoogle && existing.url.includes("news.google.com")) existing.url = item.link;
      return;
    }
    candidates.set(key, {
      dedup_key: key,
      url: item.link,
      title: truncate(title, 300),
      excerpt: excerptText ? truncate(excerptText, 280) : null,
      source_id: source?.id ?? null,
      source_name: sourceName,
      domain: source?.domain ?? domain,
      lang: opts.lang,
      published_at: published.toISOString(),
      personalityIds: new Set(matches.map((p) => p.id)),
    });
  }

  // 1. Google News : une recherche par personnalité et par édition
  const searches = personalities.flatMap((p) =>
    p.news_editions.map((edition) => ({
      p,
      edition,
      url: googleNewsUrl(p.search_terms.map((t) => `"${t}"`).join(" OR "), edition),
    })),
  );
  // 2. Flux RSS directs des médias
  const feeds = sourceList.filter((s) => s.feed_url);

  await Promise.all([
    pool(searches, CONCURRENCY, async ({ p, edition, url }) => {
      try {
        const items = await fetchFeed(url);
        report.feedsOk++;
        report.itemsSeen += items.length;
        for (const item of items) {
          // Google News renvoie parfois des résultats lâches : on exige le nom dans le titre.
          if (mentions(item.title, p.search_terms)) add(item, { fromGoogle: true, lang: edition }, [p]);
        }
      } catch (err) {
        report.feedsFailed.push({ url, error: String(err) });
      }
    }),
    pool(feeds, CONCURRENCY, async (source) => {
      try {
        const items = await fetchFeed(source.feed_url!);
        report.feedsOk++;
        report.itemsSeen += items.length;
        for (const item of items) {
          const text = `${item.title} ${stripHtml(item.description)}`;
          const matches = personalities.filter((p) => mentions(text, p.search_terms));
          add(item, { fromGoogle: false, lang: null, forced: source }, matches);
        }
        await db.from("sources").update({ last_ok_at: new Date().toISOString(), last_error: null }).eq("id", source.id);
      } catch (err) {
        report.feedsFailed.push({ url: source.feed_url!, error: String(err) });
        await db.from("sources").update({ last_error: String(err).slice(0, 300) }).eq("id", source.id);
      }
    }),
  ]);

  const all = Array.from(candidates.values());
  if (all.length === 0) return report;

  // Enregistrement des articles (les doublons sont ignorés)
  for (let i = 0; i < all.length; i += 500) {
    const chunk = all.slice(i, i + 500).map(({ personalityIds: _ignored, ...row }) => row);
    const { data, error } = await db
      .from("articles")
      .upsert(chunk, { onConflict: "dedup_key", ignoreDuplicates: true })
      .select("id");
    if (error) throw error;
    report.articlesNew += data?.length ?? 0;
  }

  // Récupération des identifiants, puis liens article / personnalité
  const idByKey = new Map<string, number>();
  for (let i = 0; i < all.length; i += 150) {
    const keys = all.slice(i, i + 150).map((c) => c.dedup_key);
    const { data, error } = await db.from("articles").select("id, dedup_key").in("dedup_key", keys);
    if (error) throw error;
    data?.forEach((row) => idByKey.set(row.dedup_key, row.id));
  }

  const links = all.flatMap((c) => {
    const articleId = idByKey.get(c.dedup_key);
    return articleId ? Array.from(c.personalityIds, (pid) => ({ article_id: articleId, personality_id: pid })) : [];
  });
  for (let i = 0; i < links.length; i += 500) {
    const { data, error } = await db
      .from("mentions")
      .upsert(links.slice(i, i + 500), { onConflict: "article_id,personality_id", ignoreDuplicates: true })
      .select("article_id");
    if (error) throw error;
    report.mentionsNew += data?.length ?? 0;
  }

  return report;
}
