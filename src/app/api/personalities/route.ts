import { after, NextResponse, type NextRequest } from "next/server";
import { classifyPending } from "@/lib/classify";
import { collect } from "@/lib/collect";
import { updateStories } from "@/lib/stories";
import { adminClient } from "@/lib/supabase";
import type { Personality } from "@/lib/types";
import { resolvePerson } from "@/lib/wikipedia";
import { collectYouTube } from "@/lib/youtube";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Limites anti-abus. */
const MAX_PER_DAY = 40;
const MAX_TOTAL = 400;

/**
 * Crée la fiche d'une personnalité publique à partir de son article Wikipédia,
 * puis lance immédiatement sa collecte et son classement (en arrière-plan).
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { wiki?: string };
  const wiki = String(body.wiki ?? "").slice(0, 200);
  if (!wiki) return NextResponse.json({ error: "Article Wikipédia manquant" }, { status: 400 });

  const person = await resolvePerson(wiki);
  if (!person) {
    return NextResponse.json(
      { error: "Seules les personnalités publiques disposant d'un article Wikipédia peuvent être recherchées." },
      { status: 422 },
    );
  }

  const db = adminClient();
  // Déjà suivie (liste choisie ou recherche précédente) : identifiant Wikidata ou titre d'article.
  const titles = Array.from(new Set([wiki, person.wiki].map((t) => `"${t.replace(/"/g, "")}"`)));
  const { data: matches } = await db
    .from("personalities")
    .select("slug, active, wikidata")
    .or(`wikidata.eq.${person.wikidata},wiki.in.(${titles.join(",")})`)
    .limit(1);
  const existing = matches?.[0];
  if (existing) {
    const patch: Record<string, unknown> = {};
    if (!existing.active) patch.active = true;
    if (!existing.wikidata) patch.wikidata = person.wikidata;
    if (Object.keys(patch).length) await db.from("personalities").update(patch).eq("slug", existing.slug);
    return NextResponse.json({ slug: existing.slug, created: false });
  }

  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [{ count: today }, { count: total }] = await Promise.all([
    db.from("personalities").select("id", { count: "exact", head: true }).eq("origin", "search").gte("created_at", dayAgo),
    db.from("personalities").select("id", { count: "exact", head: true }).eq("origin", "search"),
  ]);
  if ((today ?? 0) >= MAX_PER_DAY || (total ?? 0) >= MAX_TOTAL) {
    return NextResponse.json({ error: "Trop de nouvelles fiches aujourd'hui, réessayez demain." }, { status: 429 });
  }

  // Slug déjà pris par une autre personne : on le distingue avec l'identifiant Wikidata.
  const { data: clash } = await db.from("personalities").select("id").eq("slug", person.slug).maybeSingle();
  const slug = clash ? `${person.slug}-${person.wikidata.toLowerCase()}` : person.slug;

  const { data: inserted, error } = await db
    .from("personalities")
    .insert({ ...person, slug, origin: "search", active: true, last_viewed_at: new Date().toISOString() })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const p = inserted as Personality;
  after(async () => {
    const started = Date.now();
    try {
      await collect(db, [p]);
      await collectYouTube(db, false, [p]).catch(() => null);
      await updateStories(db, [p.id]);
      await classifyPending(db, started + 270_000, 150, p.id);
    } catch (err) {
      console.error("Création de fiche :", err);
    }
  });

  return NextResponse.json({ slug, created: true });
}
