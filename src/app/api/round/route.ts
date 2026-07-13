import { NextRequest, NextResponse } from "next/server";
import { getMode } from "@/lib/modes/registry";
import { buildRound, NoContentError } from "@/lib/rounds";
import { signRound } from "@/lib/round-token";
import { getActiveEvent } from "@/lib/events";
import { parseLangFilter } from "@/lib/lang";
import type { ModeDef, RoundPayload } from "@/lib/modes/types";

/**
 * Monta uma rodada de um modo: devolve a pista + um token assinado com a
 * resposta. Para o Mixed Mode, sorteia um submodo e renderiza como ele.
 * `?daily=1` (ou o modo "daily") fixa o alvo do dia; senão é aleatório.
 * `?lang=pt|en` filtra o acervo elegível por idioma (padrão: todos).
 */
export async function GET(req: NextRequest) {
  const modeId = req.nextUrl.searchParams.get("mode") ?? "";
  const mode = getMode(modeId);
  if (!mode) {
    return NextResponse.json({ error: "Modo desconhecido" }, { status: 404 });
  }
  const lang = parseLangFilter(req.nextUrl.searchParams.get("lang"));

  // Mixed: resolve um submodo real para esta rodada.
  let resolved: ModeDef = mode;
  if (mode.mixOf?.length) {
    const pick = mode.mixOf[Math.floor(Math.random() * mode.mixOf.length)];
    resolved = getMode(pick) ?? mode;
  }

  const daily = resolved.id === "daily" || req.nextUrl.searchParams.get("daily") === "1";

  try {
    const { clue, answer } = await buildRound(resolved, daily, lang);
    const event = getActiveEvent();
    const payload: RoundPayload = {
      mode: resolved.id,
      token: signRound(answer),
      guessType: resolved.guessType,
      clueType: resolved.clueType,
      maxGuesses: resolved.maxGuesses,
      progressive: resolved.progressive,
      clue,
      event: { slug: event.slug, name: `${event.emoji} ${event.name}`, theme: event.theme },
    };
    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof NoContentError) {
      return NextResponse.json(
        { error: "Este modo ainda não tem conteúdo suficiente." },
        { status: 503 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Erro ao montar a rodada" }, { status: 500 });
  }
}
