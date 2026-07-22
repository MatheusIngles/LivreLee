"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { formatStat } from "@/lib/format-stat";
import type { LangFilter } from "@/lib/lang";
import type { ModeDef } from "@/lib/modes/types";
import { loadEarnedAchievements, recordResult, saveEarnedAchievements } from "@/lib/storage";
import { evaluateAchievements, type AchievementDef } from "@/lib/achievements";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { AchievementIcon, Flame, Share2, Trophy } from "@/components/icons";
import Confetti from "@/components/Confetti";

interface Card {
  id: number;
  title: string;
  author: string;
  cover_url: string | null;
}
interface CurrentCard extends Card {
  value: number;
}

interface RoundState {
  token: string;
  current: CurrentCard;
  next: Card;
  streak: number;
}

interface GuessResponse {
  correct: boolean;
  streak: number;
  actualValue: number;
  revealed: Card;
  nextRound: { token: string; current: CurrentCard; next: Card } | null;
}

type Phase = "loading" | "playing" | "checking" | "revealed" | "error";
type Side = "current" | "next";

const REVEAL_DELAY_MS = 1400;

export default function CompareGame({ mode, lang }: { mode: ModeDef; lang: LangFilter }) {
  const { t } = useI18n();
  const modeText = t.modes[mode.id];
  const statLabel = modeText.statLabel!;
  const statKey = mode.statKey!;
  const [state, setState] = useState<RoundState | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [lastCorrect, setLastCorrect] = useState(false);
  const [pickedSide, setPickedSide] = useState<Side | null>(null);
  const [revealedValue, setRevealedValue] = useState<number | null>(null);
  const [bestStreak, setBestStreak] = useState(0);
  const [unlocked, setUnlocked] = useState<AchievementDef[]>([]);
  const [copied, setCopied] = useState(false);

  const fetchRound = useCallback(async () => {
    setPhase("loading");
    try {
      const res = await fetch(`/api/compare/round?mode=${mode.id}&lang=${lang}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { token: string; current: CurrentCard; next: Card; streak: number };
      setState(data);
      setPhase("playing");
    } catch {
      setPhase("error");
    }
  }, [mode.id, lang]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRound();
  }, [fetchRound]);

  function recordAndUnlock(won: boolean, guesses: number) {
    const result = { mode: mode.id, won, guesses, date: new Date().toISOString().slice(0, 10), usedHint: false, daily: false };
    const stats = recordResult(result);
    const earned = loadEarnedAchievements();
    const newly = evaluateAchievements({ stats, result }, earned);
    if (newly.length > 0) {
      saveEarnedAchievements([...earned, ...newly.map((a) => a.slug)]);
      setUnlocked((u) => [...u, ...newly]);
    }
  }

  async function pickSide(side: Side) {
    if (!state || phase !== "playing") return;
    // Clicar no card revelado = apostar que o oculto é MENOR; clicar no
    // oculto = apostar que ele é MAIOR. O clicado é sempre "quem eu acho maior".
    const guessDirection = side === "next" ? "higher" : "lower";
    setPickedSide(side);
    // Fase intermediária: desabilita os cards mas ainda não mostra resultado
    // nenhum — só vira "revealed" quando o resultado REAL chegar, junto com
    // os dados. Sem isso, o React chegava a renderizar "revealed" com o
    // lastCorrect da rodada ANTERIOR (que só é sobrescrito depois que o
    // fetch resolve), piscando a animação errada por uma fração de segundo.
    setPhase("checking");
    try {
      const res = await fetch(`/api/compare/guess?lang=${lang}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: state.token, guess: guessDirection }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as GuessResponse;
      setLastCorrect(data.correct);
      setRevealedValue(data.actualValue);
      setBestStreak((b) => Math.max(b, data.streak));
      setPhase("revealed");

      if (data.correct) {
        recordAndUnlock(true, 1);
        setTimeout(() => {
          if (data.nextRound) {
            setState({ ...data.nextRound, streak: data.streak });
            setPhase("playing");
          } else {
            fetchRound(); // acervo esgotado — recomeça
          }
        }, REVEAL_DELAY_MS);
      } else {
        recordAndUnlock(false, Math.max(data.streak, 1));
        // O jogo é contínuo: um erro só reseta o streak, não encerra a sessão.
        setTimeout(() => fetchRound(), REVEAL_DELAY_MS);
      }
    } catch {
      setPhase("error");
    }
  }

  async function share() {
    const text = `${mode.emoji} LivreLee ${modeText.name} — ${t.compare.best}: ${bestStreak} 🔥`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  }

  if (phase === "loading" && !state) {
    return <RoundSkeleton label={t.compare.loadingRound} />;
  }
  if (phase === "error" || !state) {
    return (
      <p className="animate-pop-in rounded-xl border border-red-800 bg-red-950/40 p-4 text-center text-red-300">
        {t.compare.notEnoughBooks}
      </p>
    );
  }

  // Quem tem o valor maior de verdade (para destacar o card correto ao revelar).
  let winnerId: number | null | "tie" = null;
  if (phase === "revealed" && revealedValue != null) {
    if (revealedValue === state.current.value) winnerId = "tie";
    else winnerId = revealedValue > state.current.value ? state.next.id : state.current.id;
  }

  function statusFor(cardId: number): "answer" | "tie" | "other" | "neutral" {
    if (winnerId === null) return "neutral";
    if (winnerId === "tie") return "tie";
    return cardId === winnerId ? "answer" : "other";
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-center gap-4 text-sm text-zinc-400">
        <span className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-amber-400" />
          {t.compare.sequence}: <span className="font-bold text-amber-400">{state.streak}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Trophy className="h-4 w-4 text-amber-400" />
          {t.compare.best}: <span className="font-bold text-amber-400">{bestStreak}</span>
        </span>
        <button onClick={share} className="flex items-center gap-1.5 text-zinc-500 hover:text-amber-400">
          <Share2 className="h-4 w-4" /> {copied ? t.common.copied : t.common.share}
        </button>
      </div>

      <div className="relative grid grid-cols-2 gap-4">
        {phase === "revealed" && lastCorrect && <Confetti />}
        <BookCard
          card={state.current}
          value={formatStat(statKey, state.current.value)}
          label={statLabel}
          status={statusFor(state.current.id)}
          clickable={phase === "playing"}
          onClick={() => pickSide("current")}
          biggerBadge={t.compare.biggerBadge}
          shake={phase === "revealed" && !lastCorrect && pickedSide === "current"}
        />
        <BookCard
          card={state.next}
          value={phase === "revealed" ? formatStat(statKey, revealedValue ?? 0) : "?"}
          label={statLabel}
          status={statusFor(state.next.id)}
          clickable={phase === "playing"}
          onClick={() => pickSide("next")}
          biggerBadge={t.compare.biggerBadge}
          shake={phase === "revealed" && !lastCorrect && pickedSide === "next"}
        />
      </div>

      {phase === "playing" && (
        <p className="mt-4 text-center text-sm text-zinc-500">{t.compare.hints[statKey]}</p>
      )}

      {phase === "revealed" && (
        <p
          key={lastCorrect ? "correct" : "wrong"}
          className={`animate-pop-in mt-4 text-center font-semibold ${lastCorrect ? "text-emerald-400" : "text-red-400"}`}
        >
          {lastCorrect ? t.compare.correct : t.compare.wrongContinues}
        </p>
      )}

      {unlocked.length > 0 && (
        <div className="fixed bottom-4 right-4 z-20 flex flex-col gap-2">
          {unlocked.map((a) => (
            <div key={a.slug} className="flex items-center gap-3 rounded-xl border border-amber-500 bg-zinc-900 px-4 py-3 shadow-xl">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                <AchievementIcon slug={a.slug} className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs text-amber-400">{t.common.achievementUnlocked}</p>
                <p className="text-sm font-semibold">{t.achievementDefs[a.slug].name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Layout de espera enquanto a rodada (par de livros) ainda não chegou. */
function RoundSkeleton({ label }: { label: string }) {
  return (
    <div>
      <div className="mb-4 flex justify-center">
        <div className="h-5 w-40 animate-pulse rounded-full bg-zinc-800" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col items-center rounded-2xl border border-zinc-700 bg-zinc-900/60 p-4">
            <div className="aspect-[2/3] w-full max-w-32 animate-pulse rounded-lg bg-zinc-800" />
            <div className="mt-3 h-4 w-24 animate-pulse rounded bg-zinc-800" />
            <div className="mt-2 h-3 w-16 animate-pulse rounded bg-zinc-800" />
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-sm text-zinc-500">{label}</p>
    </div>
  );
}

function BookCard({
  card,
  value,
  label,
  status,
  clickable,
  onClick,
  biggerBadge,
  shake = false,
}: {
  card: Card;
  value: string;
  label: string;
  status: "answer" | "tie" | "other" | "neutral";
  clickable: boolean;
  onClick: () => void;
  biggerBadge: string;
  shake?: boolean;
}) {
  const isWinner = status === "answer" || status === "tie";
  const ring = isWinner ? "border-emerald-500 ring-2 ring-emerald-500/40" : "border-zinc-700";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`flex flex-col items-center rounded-2xl border bg-zinc-900/60 p-4 text-center transition ${ring} ${
        clickable ? "cursor-pointer hover:border-amber-400 hover:bg-zinc-900" : "cursor-default"
      } ${isWinner ? "animate-glow-correct" : ""} ${shake ? "animate-shake" : ""}`}
    >
      <div className="relative aspect-[2/3] w-full max-w-32 overflow-hidden rounded-lg bg-zinc-800">
        <CoverThumb key={card.id} title={card.title} author={card.author} coverUrl={card.cover_url} />
        {status === "answer" && (
          <span className="absolute right-1 top-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
            {biggerBadge}
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold">{card.title}</p>
      <p className="text-xs text-zinc-400">{card.author}</p>
      <p className="mt-2 text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-lg font-bold text-amber-400">{value}</p>
    </button>
  );
}

/**
 * Capa com esqueleto de carregamento. Recebe `key={card.id}` do pai — ao
 * trocar de livro, React desmonta esta instância (descartando a <img>
 * antiga junto com seu bitmap) em vez de reaproveitar o mesmo elemento, que é
 * o que causava a foto do livro anterior "grudada" na tela até a nova
 * terminar de carregar. Se não vier `cover_url`, busca uma capa alternativa
 * em /api/cover (Google Books) sem bloquear a rodada.
 */
function CoverThumb({
  title,
  author,
  coverUrl,
}: {
  title: string;
  author: string;
  coverUrl: string | null;
}) {
  const [src, setSrc] = useState(coverUrl);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (src) return;
    let cancelled = false;
    fetch(`/api/cover?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { cover_url?: string | null } | null) => {
        if (!cancelled && data?.cover_url) setSrc(data.cover_url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!src) {
    return <div className="flex h-full w-full items-center justify-center text-3xl">📖</div>;
  }

  return (
    <>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-zinc-700" />}
      <Image
        src={src}
        alt={title}
        fill
        sizes="128px"
        className={`object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </>
  );
}
