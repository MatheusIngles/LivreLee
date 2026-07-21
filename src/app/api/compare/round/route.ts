import { NextRequest, NextResponse } from "next/server";
import { getMode } from "@/lib/modes/registry";
import { startCompare } from "@/lib/compare";
import { signCompare } from "@/lib/compare-token";
import { parseLangFilter } from "@/lib/lang";
import { NoContentError } from "@/lib/rounds";

function cardOf(book: { id: number; title: string; author: string; cover_url: string | null }) {
  return { id: book.id, title: book.title, author: book.author, cover_url: book.cover_url };
}

/**
 * Início de uma rodada "maior ou menor" (Idade/Páginas/Vendas): sorteia dois
 * livros distintos — o primeiro "revelado" (com o valor do atributo), o
 * segundo "oculto" (só título/capa; o jogador clica em qual acha que tem o
 * valor maior).
 *
 * Não busca capa alternativa aqui (isso bloquearia a resposta) — quando
 * `cover_url` vem nulo, o cliente pede a capa de reforço para /api/cover de
 * forma assíncrona, sem atrasar a rodada.
 */
export async function GET(req: NextRequest) {
  const modeId = req.nextUrl.searchParams.get("mode") ?? "";
  const mode = getMode(modeId);
  if (!mode || mode.mechanic !== "higher-lower" || !mode.statKey) {
    return NextResponse.json({ error: "Modo desconhecido" }, { status: 404 });
  }
  const lang = parseLangFilter(req.nextUrl.searchParams.get("lang"));

  try {
    const { current, next } = await startCompare(mode.statKey, lang);
    const token = signCompare({ m: mode.id, currentId: current.id, nextId: next.id, streak: 0 });
    return NextResponse.json({
      mode: mode.id,
      streak: 0,
      token,
      current: { ...cardOf(current), value: current[mode.statKey] },
      next: cardOf(next),
    });
  } catch (err) {
    if (err instanceof NoContentError) {
      // Texto de erro traduzido no cliente (t.compare.notEnoughBooks); aqui é só um código.
      return NextResponse.json({ error: "not_enough_books" }, { status: 503 });
    }
    console.error(err);
    return NextResponse.json({ error: "round_build_failed" }, { status: 500 });
  }
}
