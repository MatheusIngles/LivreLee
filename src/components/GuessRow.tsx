"use client";

import type {
  AuthorGuessFeedback,
  Cmp,
  GuessFeedback,
  NumericCmp,
} from "@/lib/types";

const CMP_STYLES: Record<Cmp, string> = {
  correct: "bg-emerald-600/80 border-emerald-500",
  partial: "bg-amber-600/80 border-amber-500",
  wrong: "bg-zinc-800 border-zinc-700",
};

function Cell({
  label,
  value,
  cmp,
  dir,
}: {
  label: string;
  value: string | number;
  cmp: Cmp;
  dir?: NumericCmp["dir"];
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border p-2 text-center min-h-16 ${CMP_STYLES[cmp]}`}
    >
      <span className="text-[10px] uppercase tracking-wide text-zinc-300/80">{label}</span>
      <span className="text-sm font-semibold leading-tight break-words">
        {value}
        {dir === "up" && " ↑"}
        {dir === "down" && " ↓"}
      </span>
    </div>
  );
}

function sales(v: number | null): string {
  return v == null ? "?" : `${v}M`;
}

/** compare: "book" mostra tudo; "book:year|pages|sales" mostra só o eixo. */
export function BookGuessRow({
  feedback,
  compare = "book",
}: {
  feedback: GuessFeedback;
  compare?: string;
}) {
  const { guess, fields } = feedback;
  const single = compare.startsWith("book:") ? compare.split(":")[1] : null;

  const cells = [
    { key: "author", el: <Cell label="Autor" value={guess.author} cmp={fields.author} /> },
    { key: "year", el: <Cell label="Ano" value={guess.year} cmp={fields.year.cmp} dir={fields.year.dir} /> },
    { key: "country", el: <Cell label="País" value={guess.country} cmp={fields.country} /> },
    { key: "language", el: <Cell label="Idioma" value={guess.language} cmp={fields.language} /> },
    { key: "genre", el: <Cell label="Gênero" value={guess.genre} cmp={fields.genre} /> },
    { key: "pages", el: <Cell label="Páginas" value={guess.pages} cmp={fields.pages.cmp} dir={fields.pages.dir} /> },
    { key: "sales", el: <Cell label="Vendas" value={sales(guess.sales_estimate)} cmp={fields.sales.cmp} dir={fields.sales.dir} /> },
  ];
  const shown = single ? cells.filter((c) => c.key === single) : cells;

  return (
    <div className="w-full">
      <p className="mb-1 text-sm font-medium text-zinc-300">📖 {guess.title}</p>
      <div
        className={`grid gap-1.5 ${single ? "grid-cols-1 max-w-40" : "grid-cols-3 sm:grid-cols-7"}`}
      >
        {shown.map((c) => (
          <div key={c.key}>{c.el}</div>
        ))}
      </div>
    </div>
  );
}

export function AuthorGuessRow({ feedback }: { feedback: AuthorGuessFeedback }) {
  const { guess, fields } = feedback;
  return (
    <div className="w-full">
      <p className="mb-1 text-sm font-medium text-zinc-300">✍️ {guess.name}</p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <Cell label="País" value={guess.country ?? "?"} cmp={fields.country} />
        <Cell label="Idioma" value={guess.language ?? "?"} cmp={fields.language} />
        <Cell label="1ª obra" value={guess.first_year} cmp={fields.first_year.cmp} dir={fields.first_year.dir} />
        <Cell label="Gênero" value={guess.main_genre} cmp={fields.main_genre} />
      </div>
    </div>
  );
}
