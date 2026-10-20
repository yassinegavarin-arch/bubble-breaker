// Vérifie que chaque flux RSS déclaré dans supabase/seed.sql répond et contient des articles.
// Usage : npm run check:sources
import { readFileSync } from "node:fs";

const seed = readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8");
const feeds = [...seed.matchAll(/\('([^']+)',\s*'((?:[^']|'')+)',\s*'[A-Z]{2}',\s*'[a-z-]+',\s*'(https?:[^']+)'\)/g)].map(
  ([, domain, name, url]) => ({ domain, name: name.replace(/''/g, "'"), url }),
);

console.log(`${feeds.length} flux à vérifier\n`);
let ok = 0;
for (const f of feeds) {
  try {
    const res = await fetch(f.url, {
      headers: { "User-Agent": "BubbleBreakerBot/0.1" },
      signal: AbortSignal.timeout(10_000),
    });
    const body = await res.text();
    const items = (body.match(/<item[\s>]|<entry[\s>]/g) ?? []).length;
    if (res.ok && items > 0) {
      ok++;
      console.log(`OK     ${f.name.padEnd(22)} ${items} articles`);
    } else {
      console.log(`ÉCHEC  ${f.name.padEnd(22)} HTTP ${res.status}, ${items} articles  ${f.url}`);
    }
  } catch (err) {
    console.log(`ÉCHEC  ${f.name.padEnd(22)} ${err.message}  ${f.url}`);
  }
}
console.log(`\n${ok}/${feeds.length} flux fonctionnels`);
