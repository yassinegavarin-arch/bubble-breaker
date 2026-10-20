import { NextResponse, type NextRequest } from "next/server";
import { WIKI_UA } from "@/lib/portraits";

/** Vignette Wikimedia servie par l'application (le navigateur du visiteur ne contacte pas Wikimedia). */
export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src") ?? "";
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (url.protocol !== "https:" || url.hostname !== "upload.wikimedia.org") return new NextResponse(null, { status: 400 });
  const res = await fetch(url, { headers: { "User-Agent": WIKI_UA }, signal: AbortSignal.timeout(6000) }).catch(() => null);
  const type = res?.headers.get("content-type") ?? "";
  if (!res?.ok || !type.startsWith("image/")) return new NextResponse(null, { status: 404 });
  return new NextResponse(await res.arrayBuffer(), {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=86400, s-maxage=604800" },
  });
}
