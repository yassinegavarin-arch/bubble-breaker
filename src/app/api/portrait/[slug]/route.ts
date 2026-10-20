import { NextResponse } from "next/server";
import { WIKI_UA, wikiImages, wikiTitle } from "@/lib/portraits";

/** Sert le portrait d'une personnalité depuis Wikimedia Commons, mis en cache 7 jours par le CDN. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const wiki = await wikiTitle(slug);
  const images = wiki ? await wikiImages(wiki) : null;
  if (!images) return new NextResponse(null, { status: 404 });

  for (const url of images.candidates) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": WIKI_UA }, signal: AbortSignal.timeout(8000) });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.startsWith("image/")) continue;
      return new NextResponse(await res.arrayBuffer(), {
        headers: {
          "Content-Type": type,
          "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        },
      });
    } catch {
      // On essaie l'URL suivante.
    }
  }
  return new NextResponse(null, { status: 404 });
}
