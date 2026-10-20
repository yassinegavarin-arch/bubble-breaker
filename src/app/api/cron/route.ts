import { NextResponse, type NextRequest } from "next/server";
import { classifyPending } from "@/lib/classify";
import { collect } from "@/lib/collect";
import { updateStories } from "@/lib/stories";
import { adminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tâche planifiée : collecte, regroupement en faits, score de viralité, classification IA.
 * Appel : GET /api/cron?step=all|collect|stories|classify
 * Protégée par l'en-tête Authorization: Bearer <CRON_SECRET> (envoyé automatiquement par Vercel Cron).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const started = Date.now();
  const deadline = started + 50_000;
  const step = req.nextUrl.searchParams.get("step") ?? "all";
  const db = adminClient();
  const result: Record<string, unknown> = { step };

  try {
    if (step === "all" || step === "collect") result.collect = await collect(db);
    if (step === "all" || step === "stories") result.stories = await updateStories(db);
    if ((step === "all" || step === "classify") && Date.now() < deadline) {
      result.classify = await classifyPending(db, deadline);
    }
    result.seconds = Math.round((Date.now() - started) / 100) / 10;
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ...result, error: String(err) }, { status: 500 });
  }
}
