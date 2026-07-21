"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";
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

/** Grade completa de atributos (modos "guess" — os "higher-lower" usam CompareGame). */
export function BookGuessRow({ feedback }: { feedback: GuessFeedback }) {
  const { t } = useI18n();
  const { guess, fields } = feedback;

  const cells = [
    { key: "author", el: <Cell label={t.guessRow.author} value={guess.author} cmp={fields.author} /> },
    { key: "year", el: <Cell label={t.guessRow.year} value={guess.year} cmp={fields.year.cmp} dir={fields.year.dir} /> },
    { key: "country", el: <Cell label={t.guessRow.country} value={guess.country} cmp={fields.country} /> },
    { key: "language", el: <Cell label={t.guessRow.language} value={guess.language} cmp={fields.language} /> },
    { key: "genre", el: <Cell label={t.guessRow.genre} value={guess.genre} cmp={fields.genre} /> },
    { key: "pages", el: <Cell label={t.guessRow.pages} value={guess.pages} cmp={fields.pages.cmp} dir={fields.pages.dir} /> },
    { key: "sales", el: <Cell label={t.guessRow.sales} value={sales(guess.sales_estimate)} cmp={fields.sales.cmp} dir={fields.sales.dir} /> },
  ];

  return (
    <div className="w-full">
      <p className="mb-1 text-sm font-medium text-zinc-300">📖 {guess.title}</p>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-7">
        {cells.map((c) => (
          <div key={c.key}>{c.el}</div>
        ))}
      </div>
    </div>
  );
}

export function AuthorGuessRow({ feedback }: { feedback: AuthorGuessFeedback }) {
  const { t } = useI18n();
  const { guess, fields } = feedback;
  return (
    <div className="w-full">
      <p className="mb-1 text-sm font-medium text-zinc-300">✍️ {guess.name}</p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <Cell label={t.guessRow.country} value={guess.country ?? "?"} cmp={fields.country} />
        <Cell label={t.guessRow.language} value={guess.language ?? "?"} cmp={fields.language} />
        <Cell label={t.guessRow.firstWork} value={guess.first_year} cmp={fields.first_year.cmp} dir={fields.first_year.dir} />
        <Cell label={t.guessRow.genre} value={guess.main_genre} cmp={fields.main_genre} />
      </div>
    </div>
  );
}
