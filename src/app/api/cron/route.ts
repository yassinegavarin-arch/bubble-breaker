import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyPending } from "@/lib/classify";
import { collect } from "@/lib/collect";
import { updateStories } from "@/lib/stories";
import { adminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Délai minimum entre deux déclenchements publics (sans CRON_SECRET). */
const COOLDOWN_ALL_MIN = 90;
const COOLDOWN_CLASSIFY_MIN = 10;

async function minutesSince(db: SupabaseClient, table: string, column: string): Promise<number> {
  const { data } = await db.from(table).select(column).not(column, "is", null).order(column, { ascending: false }).limit(1).maybeSingle();
  const value = (data as Record<string, string> | null)?.[column];
  return value ? (Date.now() - Date.parse(value)) / 60_000 : Infinity;
}

/**
 * Tâche planifiée : collecte, regroupement en faits, score de viralité, classification IA.
 * Appel : GET /api/cron?step=all|classify
 * Avec l'en-tête Authorization: Bearer <CRON_SECRET> (Vercel Cron) : exécution immédiate, toutes étapes.
 * Sans secret : autorisé pour "all" et "classify" uniquement, avec un délai minimum entre deux exécutions.
 * Les données traitées sont publiques ; le délai empêche d'épuiser les quotas gratuits.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const trusted = Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
  const step = req.nextUrl.searchParams.get("step") ?? "all";
  const db = adminClient();
  const result: Record<string, unknown> = { step };

  if (!trusted) {
    if (step !== "all" && step !== "classify") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const elapsed =
      step === "all" ? await minutesSince(db, "articles", "fetched_at") : await minutesSince(db, "mentions", "classified_at");
    const cooldown = step === "all" ? COOLDOWN_ALL_MIN : COOLDOWN_CLASSIFY_MIN;
    if (elapsed < cooldown) {
      return NextResponse.json(
        { step, skipped: `Dernière exécution il y a ${Math.round(elapsed)} min, prochaine possible dans ${Math.ceil(cooldown - elapsed)} min` },
        { status: 429 },
      );
    }
  }

  const started = Date.now();
  const deadline = started + (step === "classify" ? 270_000 : 56_000);

  try {
    if (step === "all" || step === "collect") result.collect = await collect(db);
    if (step === "all" || step === "stories") result.stories = await updateStories(db);
    if ((step === "all" || step === "classify") && Date.now() < deadline) {
      result.classify = await classifyPending(db, deadline, step === "classify" ? 600 : undefined);
    }
    result.seconds = Math.round((Date.now() - started) / 100) / 10;
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    const e = err as { message?: string; details?: string; hint?: string; code?: string };
    const message = e?.message ? [e.code, e.message, e.details, e.hint].filter(Boolean).join(" | ") : String(err);
    return NextResponse.json({ ...result, error: message }, { status: 500 });
  }
}
