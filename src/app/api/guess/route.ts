import { NextRequest, NextResponse } from "next/server";
import { getMode } from "@/lib/modes/registry";
import { verifyRound } from "@/lib/round-token";
import { compareAuthorGuess, compareGuess, todayKey } from "@/lib/game";
import { getAuthorByName, getBookById } from "@/lib/rounds";

/**
 * Valida um palpite contra o token da rodada. O token carrega a resposta
 * assinada, então não há sessão/estado no servidor. A resposta do alvo só é
 * revelada quando o jogador acerta.
 *
 * Body: { token, guessId? (livro), guessName? (autor) }
 */
export async function POST(req: NextRequest) {
  let body: { token?: string; guessId?: number; guessName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const answer = body.token ? verifyRound(body.token) : null;
  if (!answer) {
    return NextResponse.json({ error: "Rodada inválida ou expirada" }, { status: 400 });
  }
  const mode = getMode(answer.m);
  if (!mode) {
    return NextResponse.json({ error: "Modo desconhecido" }, { status: 400 });
  }

  try {
    // ------------------------- palpite de autor -------------------------
    if (mode.compare === "author") {
      if (!body.guessName || !answer.a) {
        return NextResponse.json({ error: "Palpite de autor ausente" }, { status: 400 });
      }
      const [guess, target] = await Promise.all([
        getAuthorByName(body.guessName),
        getAuthorByName(answer.a),
      ]);
      if (!guess) {
        return NextResponse.json({ error: "Autor não encontrado" }, { status: 404 });
      }
      if (!target) {
        return NextResponse.json({ error: "Alvo indisponível" }, { status: 500 });
      }
      const feedback = compareAuthorGuess(guess, target);
      return NextResponse.json({
        kind: "author",
        date: todayKey(),
        ...feedback,
        answer: feedback.won ? { name: target.name } : null,
      });
    }

    // ------------------------- palpite de livro -------------------------
    if (typeof body.guessId !== "number" || typeof answer.b !== "number") {
      return NextResponse.json({ error: "Palpite de livro ausente" }, { status: 400 });
    }
    const [guess, target] = await Promise.all([
      getBookById(body.guessId),
      getBookById(answer.b),
    ]);
    if (!guess) {
      return NextResponse.json({ error: "Livro não encontrado" }, { status: 404 });
    }
    if (!target) {
      return NextResponse.json({ error: "Alvo indisponível" }, { status: 500 });
    }
    const feedback = compareGuess(guess, target);
    return NextResponse.json({
      kind: "book",
      date: todayKey(),
      compare: mode.compare, // "book" | "book:year" | "book:pages" | "book:sales"
      ...feedback,
      answer: feedback.won
        ? { title: target.title, author: target.author, cover_url: target.cover_url }
        : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao processar palpite" }, { status: 500 });
  }
}
