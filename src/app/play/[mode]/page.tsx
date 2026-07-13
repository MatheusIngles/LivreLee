"use client";

import { Suspense, use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Clue from "@/components/Clue";
import SearchBox, { type Guess } from "@/components/SearchBox";
import { AuthorGuessRow, BookGuessRow } from "@/components/GuessRow";
import { getMode } from "@/lib/modes/registry";
import type { RoundPayload } from "@/lib/modes/types";
import { parseLangFilter } from "@/lib/lang";
import {
  clearRound,
  getClientId,
  loadEarnedAchievements,
  loadRound,
  recordResult,
  saveEarnedAchievements,
  saveRound,
} from "@/lib/storage";
import { evaluateAchievements, type AchievementDef } from "@/lib/achievements";
import { ArrowLeft, ModeIcon, AchievementIcon } from "@/components/icons";

interface GuessResponse {
  kind: "book" | "author";
  date: string;
  compare?: string;
  won: boolean;
  guess: Record<string, unknown>;
  fields: Record<string, unknown>;
  answer: Record<string, unknown> | null;
}

interface DailySave {
  date: string;
  token: string;
  clueType: string;
  clue: Record<string, unknown>;
  guesses: GuessResponse[];
  won: boolean;
}

export default function PlayPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode: modeId } = use(params);
  const mode = getMode(modeId);
  const searchParams = useSearchParams();
  const lang = parseLangFilter(searchParams.get("lang"));
  // Estado diário é salvo por variante de idioma (mesma convenção do servidor).
  const dailyStorageKey = lang === "all" ? "daily" : `daily-${lang}`;

  const [round, setRound] = useState<RoundPayload | null>(null);
  const [guesses, setGuesses] = useState<GuessResponse[]>([]);
  const [won, setWon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<AchievementDef[]>([]);
  const [copied, setCopied] = useState(false);

  const isDaily = mode?.id === "daily";
  const maxGuesses = round?.maxGuesses ?? mode?.maxGuesses ?? 6;
  const lost = !won && guesses.length >= maxGuesses;
  const finished = won || lost;
  const wrongCount = guesses.length - (won ? 1 : 0);

  const fetchRound = useCallback(async () => {
    if (!mode) return;
    setLoading(true);
    setError(null);
    setGuesses([]);
    setWon(false);
    setUnlocked([]);
    try {
      const res = await fetch(`/api/round?mode=${mode.id}&lang=${lang}`);
      if (res.status === 503) {
        setError("Este modo ainda não tem conteúdo suficiente. Volte em breve!");
        setRound(null);
        return;
      }
      if (!res.ok) throw new Error();
      setRound((await res.json()) as RoundPayload);
    } catch {
      setError("Não foi possível carregar a rodada.");
    } finally {
      setLoading(false);
    }
  }, [mode, lang]);

  // Carrega a rodada. Para o diário, tenta retomar o estado salvo do dia
  // (por variante de idioma).
  useEffect(() => {
    if (!mode) {
      setLoading(false);
      return;
    }
    if (mode.id === "daily") {
      const saved = loadRound<DailySave>(dailyStorageKey);
      const today = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
      if (saved && saved.date === today && saved.guesses.length > 0) {
        setRound({
          mode: "daily",
          token: saved.token,
          guessType: "book",
          clueType: saved.clueType as RoundPayload["clueType"],
          maxGuesses: mode.maxGuesses,
          progressive: mode.progressive,
          clue: saved.clue,
        });
        setGuesses(saved.guesses);
        setWon(saved.won);
        setLoading(false);
        return;
      }
    }
    fetchRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode?.id, lang]);

  const finishGame = useCallback(
    (finalGuesses: GuessResponse[], didWin: boolean) => {
      if (!mode) return;
      const date = finalGuesses[0]?.date ?? new Date().toISOString().slice(0, 10);
      const result = {
        mode: mode.id,
        won: didWin,
        guesses: finalGuesses.length,
        date,
        usedHint: false,
        daily: mode.id === "daily",
      };
      const stats = recordResult(result);
      const earned = loadEarnedAchievements();
      const newly = evaluateAchievements({ stats, result }, earned);
      if (newly.length > 0) {
        saveEarnedAchievements([...earned, ...newly.map((a) => a.slug)]);
        setUnlocked(newly);
      }
      // Ranking anônimo (só diário; no-op se não houver banco).
      if (mode.id === "daily") {
        fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: getClientId(),
            mode: mode.id,
            date,
            guesses: finalGuesses.length,
            won: didWin,
          }),
        }).catch(() => {});
      }
    },
    [mode]
  );

  async function submit(g: Guess) {
    if (!round || busy || finished) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: round.token,
          guessId: g.type === "book" ? g.book.id : undefined,
          guessName: g.type === "author" ? g.name : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const fb = (await res.json()) as GuessResponse;
      const next = [fb, ...guesses];
      setGuesses(next);
      const didWin = fb.won;
      if (didWin) setWon(true);
      const nowFinished = didWin || next.length >= maxGuesses;

      if (isDaily) {
        saveRound<DailySave>(dailyStorageKey, {
          date: fb.date,
          token: round.token,
          clueType: round.clueType,
          clue: round.clue,
          guesses: next,
          won: didWin || won,
        });
      }
      if (nowFinished) finishGame(next, didWin);
    } catch {
      setError("Não foi possível enviar o palpite.");
    } finally {
      setBusy(false);
    }
  }

  const shareText = useMemo(() => {
    if (!finished || !mode) return "";
    const score = won ? `${guesses.length}/${maxGuesses}` : `X/${maxGuesses}`;
    const rows = [...guesses]
      .reverse()
      .map((g) => {
        const f = g.fields as Record<string, { cmp?: string } | string>;
        const keys = g.kind === "book"
          ? ["author", "year", "country", "language", "genre", "pages", "sales"]
          : ["country", "language", "first_year", "main_genre"];
        return keys
          .map((k) => {
            const v = f[k];
            const cmp = typeof v === "string" ? v : v?.cmp;
            return cmp === "correct" ? "🟩" : cmp === "partial" ? "🟨" : "⬛";
          })
          .join("");
      })
      .join("\n");
    return `${mode.emoji} LivreLee ${mode.name} — ${score}\n${rows}`;
  }, [finished, won, guesses, maxGuesses, mode]);

  async function share() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  }

  function playAgain() {
    if (isDaily) return;
    clearRound(mode!.id);
    fetchRound();
  }

  if (!mode) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-xl">Modo não encontrado. 🤔</p>
        <Link href="/" className="inline-flex items-center gap-1.5 text-amber-400 hover:underline">
          <ArrowLeft className="h-4 w-4" /> voltar ao início
        </Link>
      </main>
    );
  }

  const answerBook = (won ? guesses[0]?.answer : null) as
    | { title?: string; author?: string; name?: string }
    | null;

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-amber-400">
          <ArrowLeft className="h-4 w-4" /> voltar
        </Link>

        <h1 className="mt-3 flex items-center gap-2 text-3xl font-bold">
          <ModeIcon id={mode.id} className="h-7 w-7 text-amber-400" /> {mode.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">{mode.description}</p>

        <div className="mt-6 space-y-5">
          {loading && <p className="text-center text-zinc-500">Carregando rodada…</p>}
          {error && <p className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-center text-red-300">{error}</p>}

          {round && !error && (
            <>
              {mode.clueType !== "none" && (
                <Clue clueType={round.clueType} clue={round.clue} attempts={wrongCount} maxGuesses={maxGuesses} />
              )}

              {!finished && (
                <div>
                  <p className="mb-2 text-center text-sm text-zinc-500">
                    {maxGuesses - guesses.length} tentativa{maxGuesses - guesses.length > 1 ? "s" : ""} restante{maxGuesses - guesses.length > 1 ? "s" : ""}
                  </p>
                  <SearchBox
                    kind={round.guessType}
                    onGuess={submit}
                    disabled={busy}
                    exclude={guesses.map((g) =>
                      g.kind === "book" ? String(g.guess.title) : String(g.guess.name)
                    )}
                  />
                </div>
              )}

              {won && (
                <div className="rounded-2xl border border-emerald-600 bg-emerald-950/40 p-5 text-center">
                  <p className="text-2xl">🎉</p>
                  <p className="mt-1 font-semibold text-emerald-300">
                    Acertou em {guesses.length} tentativa{guesses.length > 1 ? "s" : ""}!
                  </p>
                  {answerBook && (answerBook.title || answerBook.name) ? (
                    <p className="text-sm text-zinc-300">
                      {String(answerBook.title ?? answerBook.name)}
                      {answerBook.author ? ` — ${String(answerBook.author)}` : ""}
                    </p>
                  ) : null}
                </div>
              )}
              {lost && (
                <div className="rounded-2xl border border-red-800 bg-red-950/40 p-5 text-center">
                  <p className="text-2xl">😔</p>
                  <p className="mt-1 font-semibold text-red-300">
                    {isDaily ? "Acabaram as tentativas. Volte amanhã!" : "Não foi dessa vez!"}
                  </p>
                </div>
              )}

              {finished && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button onClick={share} className="flex-1 rounded-xl bg-amber-500 px-4 py-3 font-semibold text-zinc-900 transition hover:bg-amber-400">
                    {copied ? "Copiado! 📋" : "Compartilhar"}
                  </button>
                  {!isDaily && (
                    <button onClick={playAgain} className="flex-1 rounded-xl border border-zinc-600 px-4 py-3 font-semibold transition hover:border-amber-400">
                      Nova rodada 🎲
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-4">
                {guesses.map((g, i) =>
                  g.kind === "book" ? (
                    <BookGuessRow
                      key={i}
                      feedback={g as unknown as Parameters<typeof BookGuessRow>[0]["feedback"]}
                      compare={g.compare}
                    />
                  ) : (
                    <AuthorGuessRow
                      key={i}
                      feedback={g as unknown as Parameters<typeof AuthorGuessRow>[0]["feedback"]}
                    />
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {unlocked.length > 0 && (
        <div className="fixed bottom-4 right-4 z-20 flex flex-col gap-2">
          {unlocked.map((a) => (
            <div key={a.slug} className="flex items-center gap-3 rounded-xl border border-amber-500 bg-zinc-900 px-4 py-3 shadow-xl">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                <AchievementIcon slug={a.slug} className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs text-amber-400">Conquista desbloqueada!</p>
                <p className="text-sm font-semibold">{a.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
