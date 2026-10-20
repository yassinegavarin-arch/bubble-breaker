/**
 * Recherche de personnalités publiques via Wikipédia et Wikidata.
 * Garde-fou : seules les personnes (Wikidata « être humain », Q5) majeures et disposant
 * d'un article sur Wikipédia en français peuvent être recherchées. Une personne privée
 * n'a pas d'article : elle est introuvable.
 */
import type { PersonalityDef } from "@/data/personalities";

const UA = "BubbleBreaker/0.3 (https://bubble-breaker-psi.vercel.app; contact via GitHub yassinegavarin-arch)";
const WP = "https://fr.wikipedia.org";
const WD = "https://www.wikidata.org/w/api.php";

async function getJson<T>(url: string, revalidate = 3600): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    next: { revalidate },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json() as Promise<T>;
}

interface Claim {
  mainsnak?: { datavalue?: { value?: { id?: string; time?: string } | string } };
}
interface Entity {
  id: string;
  labels?: Record<string, { value: string }>;
  claims?: Record<string, Claim[]>;
  sitelinks?: Record<string, { title: string }>;
}

function claimIds(e: Entity, prop: string): string[] {
  return (e.claims?.[prop] ?? [])
    .map((c) => c.mainsnak?.datavalue?.value)
    .map((v) => (v && typeof v === "object" ? v.id : undefined))
    .filter((v): v is string => Boolean(v));
}

function birthYear(e: Entity): number | null {
  const v = e.claims?.P569?.[0]?.mainsnak?.datavalue?.value;
  const time = v && typeof v === "object" ? v.time : undefined;
  const m = time?.match(/^([+-]\d+)-/);
  return m ? Number(m[1]) : null;
}

/** Personne physique et majeure (année de naissance connue ou non). */
function isEligiblePerson(e: Entity): boolean {
  if (!claimIds(e, "P31").includes("Q5")) return false;
  const year = birthYear(e);
  return year == null || year <= new Date().getFullYear() - 18;
}

async function entities(ids: string[], props = "claims|labels|sitelinks"): Promise<Record<string, Entity>> {
  if (ids.length === 0) return {};
  const url = `${WD}?action=wbgetentities&format=json&origin=*&props=${encodeURIComponent(props)}&languages=fr|en&sitefilter=frwiki&ids=${ids.join("|")}`;
  const json = await getJson<{ entities: Record<string, Entity> }>(url, 86400);
  return json.entities ?? {};
}

export interface PersonHit {
  wiki: string;
  label: string;
  description: string | null;
  thumbnail: string | null;
  wikidata: string;
}

/** Suggestions de personnalités pour une saisie (au plus 6). */
export async function searchPeople(q: string): Promise<PersonHit[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const search = await getJson<{ pages: { key: string; title: string; description?: string | null; thumbnail?: { url: string } | null }[] }>(
    `${WP}/w/rest.php/v1/search/title?q=${encodeURIComponent(query)}&limit=10`,
    600,
  );
  const pages = search.pages ?? [];
  if (pages.length === 0) return [];

  const props = await getJson<{ query?: { pages?: Record<string, { title: string; pageprops?: { wikibase_item?: string } }> } }>(
    `${WP}/w/api.php?action=query&format=json&origin=*&prop=pageprops&ppprop=wikibase_item&redirects=1&titles=${encodeURIComponent(pages.map((p) => p.title).join("|"))}`,
    86400,
  );
  const qidByTitle = new Map<string, string>();
  for (const p of Object.values(props.query?.pages ?? {})) {
    if (p.pageprops?.wikibase_item) qidByTitle.set(p.title, p.pageprops.wikibase_item);
  }

  const ents = await entities(Array.from(new Set(qidByTitle.values())), "claims");
  const hits: PersonHit[] = [];
  for (const p of pages) {
    const qid = qidByTitle.get(p.title);
    const e = qid ? ents[qid] : undefined;
    if (!qid || !e || !isEligiblePerson(e)) continue;
    hits.push({
      wiki: p.key,
      label: p.title,
      description: p.description ?? null,
      thumbnail: p.thumbnail?.url ? `https:${p.thumbnail.url}`.replace(/^https:https:/, "https:") : null,
      wikidata: qid,
    });
    if (hits.length >= 6) break;
  }
  return hits;
}

const EDITION_BY_COUNTRY: Record<string, string> = {
  US: "en", GB: "en", CA: "en", AU: "en", IE: "en", NZ: "en", IN: "en", ZA: "en", NG: "en", IL: "en",
  BR: "pt", PT: "pt", AO: "pt", MZ: "pt",
  ES: "es", AR: "es", MX: "es", CO: "es", CL: "es", VE: "es", PE: "es", CU: "es", UY: "es",
  IT: "it", DE: "de", AT: "de", CH: "de",
};

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * Vérifie qu'un article Wikipédia correspond bien à une personnalité publique éligible
 * et construit sa fiche. Renvoie null sinon.
 */
export async function resolvePerson(wiki: string): Promise<(PersonalityDef & { wikidata: string }) | null> {
  const summary = await getJson<{ type?: string; title: string; description?: string; wikibase_item?: string; titles?: { canonical?: string } }>(
    `${WP}/api/rest_v1/page/summary/${encodeURIComponent(wiki)}`,
    86400,
  ).catch(() => null);
  if (!summary?.wikibase_item || summary.type === "disambiguation") return null;

  const ents = await entities([summary.wikibase_item]);
  const e = ents[summary.wikibase_item];
  if (!e || !isEligiblePerson(e)) return null;

  const label = (e.labels?.fr?.value ?? summary.title).replace(/\s*\(.*\)$/, "");
  const familyId = claimIds(e, "P734")[0];
  const countryId = claimIds(e, "P27")[0];
  const extra = await entities([familyId, countryId].filter(Boolean) as string[], "claims|labels").catch(() => ({}) as Record<string, Entity>);

  const familyLabel = familyId ? extra[familyId]?.labels?.fr?.value ?? extra[familyId]?.labels?.en?.value : undefined;
  const isoClaim = countryId ? extra[countryId]?.claims?.P297?.[0]?.mainsnak?.datavalue?.value : undefined;
  const country = typeof isoClaim === "string" ? isoClaim.toUpperCase() : "FR";

  // Nom de famille : celui de Wikidata s'il apparaît dans le libellé, sinon le dernier mot.
  let first = label;
  let last = label;
  if (familyLabel && label.endsWith(familyLabel)) {
    first = label.slice(0, -familyLabel.length).trim();
    last = familyLabel;
  } else {
    const parts = label.split(" ");
    last = parts.pop() ?? label;
    first = parts.join(" ");
  }

  const terms = [label];
  if (last.length >= 7 && !terms.includes(last)) terms.push(last);
  const edition = EDITION_BY_COUNTRY[country];

  return {
    slug: slugify(label),
    first_name: first,
    last_name: last.toUpperCase(),
    country,
    role: capitalize(summary.description ?? "Personnalité publique"),
    search_terms: terms,
    news_editions: edition && edition !== "fr" ? ["fr", edition] : ["fr"],
    wiki: summary.titles?.canonical ?? wiki,
    wikidata: summary.wikibase_item,
  };
}
