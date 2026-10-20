import type { SupabaseClient } from "@supabase/supabase-js";
import { ARGUMENTS, STANCES, displayName, type Stance } from "./types";

export const PROMPT_VERSION = "v1";
const CHUNK = 10;

interface Todo {
  article_id: number;
  personality_id: number;
  articles: { title: string; excerpt: string | null; source_name: string };
  personalities: { first_name: string | null; last_name: string; role: string | null };
}

interface Verdict {
  id: number;
  stance: Stance;
  confidence: number;
  satire: boolean;
  argument: string;
  justification: string;
  summary_fr: string;
}

const SYSTEM = `Tu es un analyste politique strictement neutre. Pour chaque article, tu indiques si son contenu présente la personnalité visée sous un jour favorable ou défavorable.

Règles :
- Juge le contenu de l'article (titre et extrait), pas le média, ni tes propres opinions.
- "favorable" : l'article valorise la personnalité, relaie ses succès, ses soutiens ou ses arguments sans les contredire.
- "defavorable" : l'article la critique, relaie des attaques, des échecs, des affaires ou des sondages négatifs.
- "neutre" : information factuelle sans orientation nette, ou critiques et soutiens équilibrés.
- "hors_sujet" : la personnalité n'est pas le sujet (homonyme, simple mention).
- Satire ou second degré : indique satire=true et classe selon le sens réel, pas le sens littéral.
- confidence : entre 0 et 1. Sois prudent : un titre seul et ambigu ne dépasse pas 0,6.
- argument : une seule valeur parmi ${ARGUMENTS.join(", ")}.
- justification : une phrase factuelle en français, 25 mots maximum.
- summary_fr : résumé de l'article en une ligne en français, 20 mots maximum.

Réponds uniquement par un tableau JSON, un objet par article, avec les clés : id, stance, confidence, satire, argument, justification, summary_fr.`;

function buildPrompt(items: Todo[]): string {
  const lines = items.map((t, i) => {
    const p = t.personalities;
    const who = `${displayName(p)}${p.role ? ` (${p.role})` : ""}`;
    const excerpt = t.articles.excerpt ? `\nExtrait : ${t.articles.excerpt}` : "";
    return `### id=${i}\nPersonnalité visée : ${who}\nMédia : ${t.articles.source_name}\nTitre : ${t.articles.title}${excerpt}`;
  });
  return `Classe ces ${items.length} articles.\n\n${lines.join("\n\n")}`;
}

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY manquante");
  const model = process.env.LLM_MODEL || "gemini-2.5-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status} : ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
}

async function callAnthropic(prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = process.env.LLM_MODEL || "claude-haiku-5-5";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      temperature: 0,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status} : ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return json?.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "";
}

function parseVerdicts(raw: string, count: number): Map<number, Verdict> {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end < start) throw new Error("Réponse IA sans tableau JSON");
  const list = JSON.parse(raw.slice(start, end + 1)) as Partial<Verdict>[];
  const out = new Map<number, Verdict>();
  for (const v of list) {
    const id = Number(v.id);
    if (!Number.isInteger(id) || id < 0 || id >= count) continue;
    if (!STANCES.includes(v.stance as Stance)) continue;
    out.set(id, {
      id,
      stance: v.stance as Stance,
      confidence: Math.max(0, Math.min(1, Number(v.confidence) || 0)),
      satire: Boolean(v.satire),
      argument: (ARGUMENTS as readonly string[]).includes(String(v.argument)) ? String(v.argument) : "autre",
      justification: String(v.justification ?? "").slice(0, 300),
      summary_fr: String(v.summary_fr ?? "").slice(0, 250),
    });
  }
  return out;
}

/** Classe les articles en attente, par lots, dans la limite de CLASSIFY_BATCH. */
export async function classifyPending(
  db: SupabaseClient,
  deadline: number,
): Promise<{ classified: number; failed: number; provider: string }> {
  const provider = process.env.LLM_PROVIDER === "anthropic" ? "anthropic" : "gemini";
  const limit = Number(process.env.CLASSIFY_BATCH) || 25;
  const model = process.env.LLM_MODEL || (provider === "anthropic" ? "claude-haiku-5-5" : "gemini-2.5-flash");

  const { data, error } = await db
    .from("mentions")
    .select(
      "article_id, personality_id, articles!inner(title, excerpt, source_name, published_at), personalities!inner(first_name, last_name, role)",
    )
    .is("classified_at", null)
    .is("error", null)
    .order("articles(published_at)", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const todo = (data ?? []) as unknown as Todo[];
  let classified = 0;
  let failed = 0;

  for (let i = 0; i < todo.length; i += CHUNK) {
    if (Date.now() > deadline) break;
    const chunk = todo.slice(i, i + CHUNK);
    try {
      const raw = provider === "anthropic" ? await callAnthropic(buildPrompt(chunk)) : await callGemini(buildPrompt(chunk));
      const verdicts = parseVerdicts(raw, chunk.length);
      const now = new Date().toISOString();
      const rows = chunk.map((t, j) => {
        const v = verdicts.get(j);
        if (!v) {
          failed++;
          return { article_id: t.article_id, personality_id: t.personality_id, error: "absent de la réponse IA" };
        }
        classified++;
        return {
          article_id: t.article_id,
          personality_id: t.personality_id,
          stance: v.stance,
          confidence: v.confidence,
          satire: v.satire,
          argument: v.argument,
          justification: v.justification,
          summary_fr: v.summary_fr,
          model,
          prompt_version: PROMPT_VERSION,
          classified_at: now,
          error: null,
        };
      });
      const { error: e2 } = await db.from("mentions").upsert(rows, { onConflict: "article_id,personality_id" });
      if (e2) throw e2;
    } catch (err) {
      // Quota atteint ou panne : on s'arrête, les articles restent en attente pour la prochaine exécution.
      console.error("Classification interrompue :", err);
      break;
    }
  }

  return { classified, failed, provider };
}
