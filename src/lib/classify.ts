import type { SupabaseClient } from "@supabase/supabase-js";
import { ARGUMENTS, STANCES, displayName, type Stance } from "./types";

export const PROMPT_VERSION = "v3";
const CHUNK = 10;
/** Appels IA simultanés (le quota gratuit tolère une dizaine de requêtes par minute). */
const PARALLEL = 4;
/** Durée maximale d'un appel IA. */
const CALL_TIMEOUT_MS = 45_000;

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
  title_fr: string;
}

const SYSTEM = `Tu es un analyste politique strictement neutre. Pour chaque article, tu indiques si son contenu présente la personnalité visée sous un jour favorable ou défavorable.

Règles :
- Juge le contenu de l'article (titre et extrait), pas le média, ni tes propres opinions.
- "favorable" : l'article valorise la personnalité, relaie ses succès, ses soutiens ou ses arguments sans les contredire.
- "defavorable" : l'article la critique, relaie des attaques, des échecs, des affaires ou des sondages négatifs.
- "neutre" : information factuelle sans orientation nette, ou critiques et soutiens équilibrés.
- "hors_sujet" : la personnalité n'est pas le sujet (homonyme, simple mention).
- Juge toujours du point de vue de la personnalité visée, même si l'article parle surtout d'un adversaire :
  ce qui avantage son adversaire lui est défavorable, ce qui nuit à son adversaire lui est favorable.
- Sondages et résultats : la personnalité en tête ou en progression → favorable ; devancée ou en recul → défavorable.
- Une attaque qu'elle lance contre un adversaire est neutre pour elle, sauf si l'article la présente sous un jour positif ou négatif.

Exemples :
- Visée : LULA. « Flávio Bolsonaro obtient 51,5 % contre 48,5 % pour Lula, selon un sondage » → defavorable (sondage, devancé).
- Visée : Emmanuel MACRON. « Les oppositions dénoncent le passage en force du gouvernement Macron » → defavorable (relaie des critiques).
- Visée : Jordan BARDELLA. « Bardella en tête de toutes les intentions de vote pour 2027 » → favorable (sondage, en tête).
- Visée : Donald TRUMP. « Trump reçoit Zelensky à la Maison-Blanche » → neutre (fait sans orientation).
- Satire ou second degré : indique satire=true et classe selon le sens réel, pas le sens littéral.
- confidence : entre 0 et 1. Sois prudent : un titre seul et ambigu ne dépasse pas 0,6.
- argument : une seule valeur parmi ${ARGUMENTS.join(", ")}.
- justification : une phrase factuelle en français, 25 mots maximum.
- summary_fr : résumé de l'article en une ligne en français, 20 mots maximum.
- title_fr : le titre traduit fidèlement en français, sans rien ajouter ; recopie-le à l'identique s'il est déjà en français.

Réponds uniquement par un tableau JSON, un objet par article, avec les clés : id, stance, confidence, satire, argument, justification, summary_fr, title_fr.`;

function buildPrompt(items: Todo[]): string {
  const lines = items.map((t, i) => {
    const p = t.personalities;
    const who = `${displayName(p)}${p.role ? ` (${p.role})` : ""}`;
    const excerpt = t.articles.excerpt ? `\nExtrait : ${t.articles.excerpt}` : "";
    return `### id=${i}\nPersonnalité visée : ${who}\nMédia : ${t.articles.source_name}\nTitre : ${t.articles.title}${excerpt}`;
  });
  return `Classe ces ${items.length} articles.\n\n${lines.join("\n\n")}`;
}

/** Modèles essayés dans l'ordre : le principal, puis un modèle de secours si le premier est surchargé. */
function geminiModels(): string[] {
  const primary = process.env.LLM_MODEL || "gemini-3.8-flash";
  const fallbacks = (process.env.LLM_FALLBACK_MODEL || "gemini-3.5-flash-lite,gemini-3.5-flash").split(",").map((m) => m.trim());
  return Array.from(new Set([primary, ...fallbacks].filter((m) => m && !unavailable.has(m))));
}

/** Modèles indisponibles pour ce compte (404) : on ne les réessaie plus pendant l'exécution. */
const unavailable = new Set<string>();

/** Modèles qui refusent le réglage de réflexion réduite. */
const noThinkingConfig = new Set<string>();

function thinkingConfig(model: string) {
  if (noThinkingConfig.has(model)) return {};
  // Réflexion réduite : inutile pour classer, et cela divise le temps de réponse.
  return /gemini-2\./.test(model) ? { thinkingConfig: { thinkingBudget: 0 } } : { thinkingConfig: { thinkingLevel: "low" } };
}

/** Erreur passagère (surcharge, quota par minute, délai dépassé) : on peut réessayer ailleurs ou plus tard. */
export function isTransient(err: unknown): boolean {
  return /HTTP (429|500|502|503|504)|TimeoutError|aborted|fetch failed/i.test(String(err));
}

async function callGemini(prompt: string): Promise<string> {
  let lastErr: unknown;
  for (const model of geminiModels()) {
    try {
      return await callGeminiOnce(prompt, model);
    } catch (err) {
      if (/HTTP 400/.test(String(err)) && /thinking/i.test(String(err)) && !noThinkingConfig.has(model)) {
        noThinkingConfig.add(model);
        try {
          return await callGeminiOnce(prompt, model);
        } catch (err2) {
          err = err2;
        }
      }
      lastErr = err;
      if (/HTTP 404/.test(String(err))) {
        unavailable.add(model);
        continue;
      }
      if (!isTransient(err)) throw err;
    }
  }
  throw lastErr;
}

async function callGeminiOnce(prompt: string, model: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY manquante");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json", ...thinkingConfig(model) },
    }),
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Gemini ${model} HTTP ${res.status} : ${(await res.text()).slice(0, 200)}`);
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
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
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
      title_fr: String(v.title_fr ?? "").trim().slice(0, 300),
    });
  }
  return out;
}

/** Classe les articles en attente, par lots, dans la limite de CLASSIFY_BATCH. */
export async function classifyPending(
  db: SupabaseClient,
  deadline: number,
  maxItems?: number,
  personalityId?: number,
): Promise<{ classified: number; failed: number; provider: string; lastError?: string }> {
  const provider = process.env.LLM_PROVIDER === "anthropic" ? "anthropic" : "gemini";
  const limit = maxItems ?? (Number(process.env.CLASSIFY_BATCH) || 25);
  let lastError: string | undefined;
  const model = process.env.LLM_MODEL || (provider === "anthropic" ? "claude-haiku-5-5" : "gemini-3.8-flash");

  let query = db
    .from("mentions")
    .select(
      "article_id, personality_id, articles!inner(title, excerpt, source_name, published_at), personalities!inner(first_name, last_name, role)",
    )
    // En attente : jamais classés, ou classés avec une ancienne version de la consigne.
    .or(`classified_at.is.null,prompt_version.neq.${PROMPT_VERSION}`)
    .is("error", null);
  if (personalityId) query = query.eq("personality_id", personalityId);
  const { data, error } = await query.order("articles(published_at)", { ascending: false }).limit(Math.max(limit * 5, 300));
  if (error) throw error;

  // Répartition équitable entre personnalités : on prend à tour de rôle le plus récent de chacune.
  const queues = new Map<number, Todo[]>();
  for (const t of (data ?? []) as unknown as Todo[]) {
    const q = queues.get(t.personality_id) ?? [];
    q.push(t);
    queues.set(t.personality_id, q);
  }
  const todo: Todo[] = [];
  while (todo.length < limit && queues.size > 0) {
    for (const [pid, q] of queues) {
      const next = q.shift();
      if (next) todo.push(next);
      if (q.length === 0) queues.delete(pid);
      if (todo.length >= limit) break;
    }
  }

  let classified = 0;
  let failed = 0;

  async function handle(chunk: Todo[]) {
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
    // Titre en français, partagé par toutes les personnalités qui citent l'article.
    await Promise.all(
      chunk.map((t, j) => {
        const v = verdicts.get(j);
        return v?.title_fr ? db.from("articles").update({ title_fr: v.title_fr }).eq("id", t.article_id) : null;
      }),
    );
  }

  const chunks: Todo[][] = [];
  for (let i = 0; i < todo.length; i += CHUNK) chunks.push(todo.slice(i, i + CHUNK));

  // Par vagues d'appels parallèles, sans en lancer une qui dépasserait l'échéance.
  for (let i = 0; i < chunks.length; i += PARALLEL) {
    if (deadline - Date.now() < CALL_TIMEOUT_MS + 3_000) break;
    const results = await Promise.allSettled(chunks.slice(i, i + PARALLEL).map(handle));
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (rejected.length > 0) {
      lastError = String(rejected[0].reason).slice(0, 300);
      console.error("Lot non classé :", rejected[0].reason);
      // Erreur durable (clé invalide, crédits, requête refusée) : inutile d'insister.
      if (rejected.some((r) => !isTransient(r.reason))) break;
      // Tout a échoué par surcharge : on laisse souffler l'API avant la vague suivante.
      if (rejected.length === results.length) await new Promise((r) => setTimeout(r, 10_000));
    }
  }

  return { classified, failed, provider, lastError };
}
