"use client";

import Image from "next/image";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import type { ClueType } from "@/lib/modes/types";

interface Props {
  clueType: ClueType;
  clue: Record<string, unknown>;
  /** nº de palpites errados já feitos (dirige a revelação progressiva). */
  attempts: number;
  maxGuesses: number;
}

/** Caixa padrão da pista. */
function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-900/60 p-6 text-center">
      {children}
    </div>
  );
}

function CoverImage({ url, style }: { url: string; style: React.CSSProperties }) {
  return (
    <div className="relative mx-auto aspect-[2/3] w-48 overflow-hidden rounded-lg bg-zinc-800">
      <Image
        src={url}
        alt="cover"
        fill
        sizes="192px"
        className="object-cover transition-all duration-500"
        style={style}
      />
    </div>
  );
}

export default function Clue({ clueType, clue, attempts, maxGuesses }: Props) {
  const { t } = useI18n();
  // fração 0..1 de progresso da revelação (0 no 1º palpite, 1 no último)
  const steps = Math.max(1, maxGuesses - 1);
  const progress = Math.min(1, attempts / steps);

  switch (clueType) {
    case "none":
      return null;

    case "book-title":
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{t.clue.whoWrote}</p>
          <p className="mt-2 text-2xl font-bold">{String(clue.title ?? "")}</p>
        </Box>
      );

    case "opening":
    case "closing": {
      const labels: Record<string, string> = {
        opening: t.clue.firstLine,
        closing: t.clue.lastLine,
      };
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{labels[clueType]}</p>
          <blockquote className="mt-3 text-xl font-medium italic leading-relaxed">
            “{String(clue.text ?? "")}”
          </blockquote>
        </Box>
      );
    }

    case "character-name":
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{t.clue.whichBookCharacter}</p>
          <p className="mt-2 text-2xl font-bold">👤 {String(clue.name ?? "")}</p>
        </Box>
      );

    case "character-desc":
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{t.clue.character}</p>
          <p className="mt-3 text-xl font-medium">{String(clue.description ?? "")}</p>
        </Box>
      );

    case "chapter":
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{t.clue.chapterName}</p>
          <p className="mt-2 text-2xl font-bold">“{String(clue.chapter ?? "")}”</p>
        </Box>
      );

    case "adaptation":
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{t.clue.adaptationOf(String(clue.kind ?? ""))}</p>
          <p className="mt-2 text-2xl font-bold">🎬 {String(clue.title ?? "")}</p>
          {clue.year ? <p className="mt-1 text-sm text-zinc-400">{String(clue.year)}</p> : null}
        </Box>
      );

    case "emoji":
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{t.clue.whichBookEmoji}</p>
          <p className="mt-2 text-5xl">{String(clue.emoji ?? "")}</p>
        </Box>
      );

    case "synopsis":
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{t.clue.synopsis}</p>
          <p className="mt-3 text-lg leading-relaxed">{String(clue.synopsis ?? "")}</p>
        </Box>
      );

    case "tags": {
      const tags = Array.isArray(clue.tags) ? (clue.tags as string[]) : [];
      const shown = tags.slice(0, 1 + attempts); // revela uma tag a cada erro
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{t.clue.keywords}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {shown.map((tag) => (
              <span key={tag} className="rounded-full border border-zinc-600 bg-zinc-800 px-3 py-1 text-sm">
                {tag}
              </span>
            ))}
          </div>
        </Box>
      );
    }

    case "timeline": {
      const items = [
        { label: t.clue.publishedOn, value: String(clue.year ?? "?") },
        { label: t.guessRow.country, value: String(clue.country ?? "?") },
        { label: t.guessRow.genre, value: String(clue.genre ?? "?") },
        { label: t.guessRow.pages, value: String(clue.pages ?? "?") },
      ];
      const shown = items.slice(0, 1 + attempts); // revela uma dica a cada erro
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{t.clue.clues}</p>
          <div className="mt-3 space-y-1">
            {shown.map((it) => (
              <p key={it.label} className="text-lg">
                <span className="text-zinc-500">{it.label}:</span>{" "}
                <span className="font-semibold">{it.value}</span>
              </p>
            ))}
          </div>
        </Box>
      );
    }

    case "cover-zoom": {
      const url = String(clue.cover_url ?? "");
      const scale = 3.6 - 2.6 * progress; // 3.6x → 1x
      return (
        <Box>
          <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">{t.clue.whichBookCover}</p>
          {url ? <CoverImage url={url} style={{ transform: `scale(${scale})` }} /> : <p>{t.clue.noCover}</p>}
        </Box>
      );
    }

    case "cover-blur": {
      const url = String(clue.cover_url ?? "");
      const blur = 22 * (1 - progress); // 22px → 0
      return (
        <Box>
          <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">{t.clue.coverLightening}</p>
          {url ? <CoverImage url={url} style={{ filter: `blur(${blur}px)` }} /> : <p>{t.clue.noCover}</p>}
        </Box>
      );
    }

    case "cover-silhouette": {
      const url = String(clue.cover_url ?? "");
      const brightness = 0.06 + 0.94 * progress; // quase preto → normal
      return (
        <Box>
          <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">{t.clue.onlySilhouette}</p>
          {url ? (
            <CoverImage url={url} style={{ filter: `brightness(${brightness}) contrast(1.15)` }} />
          ) : (
            <p>{t.clue.noCover}</p>
          )}
        </Box>
      );
    }
  }
}
