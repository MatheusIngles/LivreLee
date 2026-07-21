import { NextRequest, NextResponse } from "next/server";
import { resolveCoverUrl } from "@/lib/cover-fallback";

/**
 * Busca uma capa alternativa (Google Books) para um livro sem `cover_url`.
 * Endpoint separado e assíncrono de propósito: o cliente só chama isto
 * quando falta a capa, depois que a rodada já carregou — assim a espera pela
 * Google Books nunca atrasa o carregamento da rodada em si.
 */
export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title") ?? "";
  const author = req.nextUrl.searchParams.get("author") ?? "";
  if (!title) {
    return NextResponse.json({ error: "title é obrigatório" }, { status: 400 });
  }

  const cover_url = await resolveCoverUrl(title, author);
  return NextResponse.json({ cover_url });
}
