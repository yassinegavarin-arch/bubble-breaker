import { NextResponse, type NextRequest } from "next/server";
import { publicClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const REASONS = ["mauvais_camp", "satire", "hors_sujet", "illicite", "autre"];

/** Signalement d'un classement erroné, envoyé depuis une carte. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const articleId = Number(form.get("article_id"));
  const personalityId = Number(form.get("personality_id"));
  const reason = String(form.get("reason") ?? "");
  const comment = String(form.get("comment") ?? "").slice(0, 500) || null;
  const back = String(form.get("back") ?? "/");

  if (!Number.isInteger(articleId) || !Number.isInteger(personalityId) || !REASONS.includes(reason)) {
    return NextResponse.json({ error: "Signalement invalide" }, { status: 400 });
  }

  const { error } = await publicClient()
    .from("reports")
    .insert({ article_id: articleId, personality_id: personalityId, reason, comment });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const target = back.startsWith("/") ? back : "/";
  return NextResponse.redirect(new URL(`${target}${target.includes("?") ? "&" : "?"}merci=1`, req.url), 303);
}
