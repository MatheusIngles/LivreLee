"use client";

/* eslint-disable @next/next/no-img-element */

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
    <div className="mx-auto aspect-[2/3] w-48 overflow-hidden rounded-lg bg-zinc-800">
      <img src={url} alt="capa" className="h-full w-full object-cover transition-all duration-500" style={style} />
    </div>
  );
}

export default function Clue({ clueType, clue, attempts, maxGuesses }: Props) {
  // fração 0..1 de progresso da revelação (0 no 1º palpite, 1 no último)
  const steps = Math.max(1, maxGuesses - 1);
  const t = Math.min(1, attempts / steps);

  switch (clueType) {
    case "none":
      return null;

    case "book-title":
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Quem escreveu?</p>
          <p className="mt-2 text-2xl font-bold">{String(clue.title ?? "")}</p>
        </Box>
      );

    case "quote":
    case "opening":
    case "closing":
    case "character-quote": {
      const labels: Record<string, string> = {
        quote: "Frase célebre",
        opening: "Primeira frase",
        closing: "Última frase",
        "character-quote": "Alguém disse…",
      };
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{labels[clueType]}</p>
          <blockquote className="mt-3 text-xl font-medium italic leading-relaxed">
            “{String(clue.text ?? "")}”
          </blockquote>
          {typeof clue.context === "string" && clue.context && (
            <p className="mt-3 text-sm text-zinc-400">{clue.context}</p>
          )}
        </Box>
      );
    }

    case "character-name":
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">De qual livro é este personagem?</p>
          <p className="mt-2 text-2xl font-bold">👤 {String(clue.name ?? "")}</p>
        </Box>
      );

    case "character-desc":
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Personagem</p>
          <p className="mt-3 text-xl font-medium">{String(clue.description ?? "")}</p>
        </Box>
      );

    case "chapter":
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Nome de um capítulo</p>
          <p className="mt-2 text-2xl font-bold">“{String(clue.chapter ?? "")}”</p>
        </Box>
      );

    case "adaptation":
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Adaptação ({String(clue.kind ?? "")})</p>
          <p className="mt-2 text-2xl font-bold">🎬 {String(clue.title ?? "")}</p>
          {clue.year ? <p className="mt-1 text-sm text-zinc-400">{String(clue.year)}</p> : null}
        </Box>
      );

    case "emoji":
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Que livro é este?</p>
          <p className="mt-2 text-5xl">{String(clue.emoji ?? "")}</p>
        </Box>
      );

    case "synopsis":
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Sinopse</p>
          <p className="mt-3 text-lg leading-relaxed">{String(clue.synopsis ?? "")}</p>
        </Box>
      );

    case "tags": {
      const tags = Array.isArray(clue.tags) ? (clue.tags as string[]) : [];
      const shown = tags.slice(0, 1 + attempts); // revela uma tag a cada erro
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Palavras-chave</p>
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
        { label: "Publicado em", value: String(clue.year ?? "?") },
        { label: "País", value: String(clue.country ?? "?") },
        { label: "Gênero", value: String(clue.genre ?? "?") },
        { label: "Páginas", value: String(clue.pages ?? "?") },
      ];
      const shown = items.slice(0, 1 + attempts); // revela uma dica a cada erro
      return (
        <Box>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Pistas</p>
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
      const scale = 3.6 - 2.6 * t; // 3.6x → 1x
      return (
        <Box>
          <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Que livro é esta capa?</p>
          {url ? <CoverImage url={url} style={{ transform: `scale(${scale})` }} /> : <p>sem capa</p>}
        </Box>
      );
    }

    case "cover-blur": {
      const url = String(clue.cover_url ?? "");
      const blur = 22 * (1 - t); // 22px → 0
      return (
        <Box>
          <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">A capa vai clareando</p>
          {url ? <CoverImage url={url} style={{ filter: `blur(${blur}px)` }} /> : <p>sem capa</p>}
        </Box>
      );
    }

    case "cover-silhouette": {
      const url = String(clue.cover_url ?? "");
      const brightness = 0.06 + 0.94 * t; // quase preto → normal
      return (
        <Box>
          <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Só a silhueta</p>
          {url ? (
            <CoverImage url={url} style={{ filter: `brightness(${brightness}) contrast(1.15)` }} />
          ) : (
            <p>sem capa</p>
          )}
        </Box>
      );
    }
  }
}
