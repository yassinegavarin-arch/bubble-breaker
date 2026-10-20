import { NextResponse } from "next/server";

/** Miniature YouTube servie par l'application : le navigateur du visiteur ne contacte pas Google. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[\w-]{11}$/.test(id)) return new NextResponse(null, { status: 400 });
  for (const size of ["hqdefault", "mqdefault"]) {
    try {
      const res = await fetch(`https://i.ytimg.com/vi/${id}/${size}.jpg`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      return new NextResponse(await res.arrayBuffer(), {
        headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400, s-maxage=604800" },
      });
    } catch {
      // Taille suivante.
    }
  }
  return new NextResponse(null, { status: 404 });
}
