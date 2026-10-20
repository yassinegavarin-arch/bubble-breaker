/** Minuscules, sans accents, sans ponctuation. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#8217;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trim()}…`;
}

/** Vrai si l'un des termes apparaît comme mot entier (insensible aux accents et à la casse). */
export function mentions(text: string, terms: string[]): boolean {
  const haystack = ` ${normalize(text)} `;
  return terms.some((term) => haystack.includes(` ${normalize(term)} `));
}

const STOPWORDS = new Set(
  (
    "les des une dans pour avec sans sur sous par aux est sont ete etre avoir fait plus moins tres tout tous " +
    "cette ces son ses leur leurs mais donc comme selon apres avant entre contre vers chez lors quand alors " +
    "qui que quoi dont elle elles ils nous vous lui eux pas encore deja aussi bien peut doit veut " +
    "the and for with from that this have has was were will would about after over into their they them " +
    "para com uma pelo pela sobre como mais seus suas entre contra " +
    "del los las por con una sobre como mas " +
    "della delle degli con per una sul come piu " +
    "der die das und mit fur von den dem ein eine nach"
  ).split(" "),
);

/** Mots-clés significatifs d'un titre, pour regrouper les articles qui parlent du même fait. */
export function keywords(title: string, exclude: string[] = []): string[] {
  const excluded = new Set(exclude.flatMap((t) => normalize(t).split(" ")));
  const words = normalize(title)
    .split(" ")
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !excluded.has(w));
  return Array.from(new Set(words));
}

export function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const inter = a.filter((w) => setB.has(w)).length;
  return inter / (a.length + b.length - inter);
}

export function hostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^(www|m|amp|mobile)\./, "");
  } catch {
    return null;
  }
}
