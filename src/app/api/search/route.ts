import { NextResponse, type NextRequest } from "next/server";
import { publicClient } from "@/lib/supabase";
import { searchPeople } from "@/lib/wikipedia";

export const dynamic = "force-dynamic";

/** Suggestions : uniquement des personnes ayant un article Wikipédia (garde-fou contre la recherche de particuliers). */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  try {
    const hits = await searchPeople(q);
    const { data } = hits.length
      ? await publicClient()
          .from("personalities")
          .select("slug, wikidata")
          .in(
            "wikidata",
            hits.map((h) => h.wikidata),
          )
      : { data: [] };
    const known = new Map((data ?? []).map((r) => [r.wikidata as string, r.slug as string]));
    return NextResponse.json({
      hits: hits.map((h) => ({
        wiki: h.wiki,
        label: h.label,
        description: h.description,
        thumb: h.thumbnail ? `/api/wikithumb?src=${encodeURIComponent(h.thumbnail)}` : null,
        slug: known.get(h.wikidata) ?? null,
      })),
    });
  } catch (err) {
    return NextResponse.json({ hits: [], error: String(err).slice(0, 200) }, { status: 502 });
  }
}
