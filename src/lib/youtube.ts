import type { SupabaseClient } from "@supabase/supabase-js";
import { mentions, stripHtml, truncate } from "./text";
import type { Personality } from "./types";

/**
 * Vidéos YouTube les plus vues de la semaine sur chaque personnalité (API YouTube Data v3, gratuite).
 * Quota gratuit : 10 000 unités par jour. Une recherche coûte 100 unités : 21 personnalités toutes les
 * 6 heures consomment environ 8 400 unités par jour.
 */
const API = "https://www.googleapis.com/youtube/v3";
const MIN_INTERVAL_H = 6;
const MAX_RESULTS = 15;

interface SearchItem {
  id: { videoId?: string };
}
interface VideoItem {
  id: string;
  snippet: { title: string; description: string; channelTitle: string; publishedAt: string };
  statistics?: { viewCount?: string; likeCount?: string };
}

async function yt<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY!;
  const qs = new URLSearchParams({ ...params, key });
  const res = await fetch(`${API}/${path}?${qs}`, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (!res.ok) throw new Error(`YouTube ${path} HTTP ${res.status} : ${(await res.text()).slice(0, 160)}`);
  return res.json() as Promise<T>;
}

/** Langue de recherche : français pour les personnalités françaises, langue du pays sinon. */
function language(p: Personality): string {
  return p.news_editions.find((e) => e !== "fr") ?? "fr";
}

export interface YouTubeReport {
  skipped?: string;
  searches: number;
  videos: number;
  mentionsNew: number;
  errors: string[];
}

export async function collectYouTube(db: SupabaseClient, force = false): Promise<YouTubeReport> {
  const report: YouTubeReport = { searches: 0, videos: 0, mentionsNew: 0, errors: [] };
  if (!process.env.YOUTUBE_API_KEY) return { ...report, skipped: "YOUTUBE_API_KEY absente" };

  if (!force) {
    const { data: last } = await db
      .from("articles")
      .select("fetched_at")
      .eq("kind", "video")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const hours = last ? (Date.now() - Date.parse(last.fetched_at)) / 3_600_000 : Infinity;
    if (hours < MIN_INTERVAL_H) return { ...report, skipped: `dernière collecte il y a ${hours.toFixed(1)} h` };
  }

  const { data: people, error } = await db.from("personalities").select("*").eq("active", true);
  if (error) throw error;
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const rows: Record<string, unknown>[] = [];
  const links: { key: string; personality_id: number }[] = [];

  await Promise.all(
    ((people ?? []) as Personality[]).map(async (p) => {
      try {
        const lang = language(p);
        const search = await yt<{ items: SearchItem[] }>("search", {
          part: "id",
          type: "video",
          order: "viewCount",
          maxResults: String(MAX_RESULTS),
          publishedAfter: since,
          q: p.search_terms.join(" | "),
          relevanceLanguage: lang,
        });
        report.searches++;
        const ids = search.items.map((i) => i.id.videoId).filter((v): v is string => Boolean(v));
        if (ids.length === 0) return;
        const details = await yt<{ items: VideoItem[] }>("videos", { part: "snippet,statistics", id: ids.join(",") });
        for (const v of details.items) {
          const text = `${v.snippet.title} ${v.snippet.description}`;
          if (!mentions(text, p.search_terms)) continue;
          const key = `youtube|${v.id}`;
          rows.push({
            dedup_key: key,
            url: `https://www.youtube.com/watch?v=${v.id}`,
            title: truncate(stripHtml(v.snippet.title), 300),
            excerpt: truncate(stripHtml(v.snippet.description).replace(/\s+/g, " "), 280) || null,
            source_id: null,
            source_name: v.snippet.channelTitle,
            domain: "youtube.com",
            lang,
            published_at: v.snippet.publishedAt,
            fetched_at: new Date().toISOString(),
            kind: "video",
            social: true,
            video_id: v.id,
            views: Number(v.statistics?.viewCount ?? 0),
            likes: v.statistics?.likeCount ? Number(v.statistics.likeCount) : null,
            thumbnail: `/api/thumb/${v.id}`,
          });
          links.push({ key, personality_id: p.id });
        }
      } catch (err) {
        report.errors.push(`${p.slug} : ${String(err).slice(0, 160)}`);
      }
    }),
  );

  if (rows.length === 0) return report;

  // Une même vidéo peut concerner plusieurs personnalités : une seule ligne par vidéo.
  const unique = Array.from(new Map(rows.map((r) => [r.dedup_key as string, r])).values());
  const { data: saved, error: e1 } = await db.from("articles").upsert(unique, { onConflict: "dedup_key" }).select("id, dedup_key");
  if (e1) throw e1;
  report.videos = unique.length;

  const idByKey = new Map((saved ?? []).map((r) => [r.dedup_key as string, r.id as number]));
  const mentionRows = links
    .map((l) => ({ article_id: idByKey.get(l.key), personality_id: l.personality_id }))
    .filter((m): m is { article_id: number; personality_id: number } => m.article_id != null);
  const { data: inserted, error: e2 } = await db
    .from("mentions")
    .upsert(mentionRows, { onConflict: "article_id,personality_id", ignoreDuplicates: true })
    .select("article_id");
  if (e2) throw e2;
  report.mentionsNew = inserted?.length ?? 0;
  return report;
}
