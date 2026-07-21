import { NextRequest, NextResponse } from "next/server";
import { getMode } from "@/lib/modes/registry";
import { verifyCompare, signCompare } from "@/lib/compare-token";
import { getBookById, pickNextBook, resolveGuess } from "@/lib/compare";
import { parseLangFilter } from "@/lib/lang";
import { NoContentError } from "@/lib/rounds";

function cardOf(book: { id: number; title: string; author: string; cover_url: string | null }) {
  return { id: book.id, title: book.title, author: book.author, cover_url: book.cover_url };
}

/**
 * Resolve uma aposta "maior"/"menor" (o cliente traduz o clique no card para
 * "higher"/"lower" conforme qual dos dois foi clicado). Se acertar, o livro
 * antes oculto vira o novo "revelado" e um novo livro oculto entra — o
 * streak continua na mesma chamada (sem round-trip extra). Se errar, o
 * cliente inicia uma rodada nova (o jogo não tem fim — só reseta o streak).
 *
 * Não busca capa alternativa aqui — ver nota em /api/compare/round.
 */
export async function POST(req: NextRequest) {
  let body: { token?: string; guess?: "higher" | "lower" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const state = body.token ? verifyCompare(body.token) : null;
  if (!state || (body.guess !== "higher" && body.guess !== "lower")) {
    return NextResponse.json({ error: "Rodada inválida" }, { status: 400 });
  }
  const mode = getMode(state.m);
  if (!mode || mode.mechanic !== "higher-lower" || !mode.statKey) {
    return NextResponse.json({ error: "Modo desconhecido" }, { status: 400 });
  }

  const [current, next] = await Promise.all([
    getBookById(state.currentId),
    getBookById(state.nextId),
  ]);
  if (!current || !next) {
    return NextResponse.json({ error: "Livro indisponível" }, { status: 500 });
  }

  const statKey = mode.statKey;
  const currentValue = current[statKey] as number;
  const nextValue = next[statKey] as number;
  const correct = resolveGuess(statKey, currentValue, nextValue, body.guess);
  const revealed = cardOf(next);

  if (!correct) {
    return NextResponse.json({
      correct: false,
      streak: state.streak,
      actualValue: nextValue,
      revealed,
    });
  }

  const newStreak = state.streak + 1;
  const lang = parseLangFilter(req.nextUrl.searchParams.get("lang"));

  try {
    const upcoming = await pickNextBook(statKey, lang, next.id);
    const token = signCompare({ m: mode.id, currentId: next.id, nextId: upcoming.id, streak: newStreak });
    return NextResponse.json({
      correct: true,
      streak: newStreak,
      actualValue: nextValue,
      revealed,
      nextRound: {
        token,
        current: { ...revealed, value: nextValue },
        next: cardOf(upcoming),
      },
    });
  } catch (err) {
    if (err instanceof NoContentError) {
      // Acervo esgotado (raro): devolve o streak conquistado, sem próxima rodada.
      return NextResponse.json({
        correct: true,
        streak: newStreak,
        actualValue: nextValue,
        revealed,
        nextRound: null,
      });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro ao continuar a rodada" }, { status: 500 });
  }
}
