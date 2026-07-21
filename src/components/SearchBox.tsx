"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import type { BookSearchResult } from "@/lib/types";

export type Guess =
  | { type: "book"; book: BookSearchResult }
  | { type: "author"; name: string };

interface Props {
  kind: "book" | "author";
  onGuess: (g: Guess) => void;
  disabled?: boolean;
  /** valores já palpitados, para esconder das sugestões. */
  exclude?: string[];
}

interface Row {
  id: string;
  label: string;
  sub?: string;
  guess: Guess;
}

export default function SearchBox({ kind, onGuess, disabled, exclude = [] }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function onChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
    }
  }

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const endpoint =
          kind === "book" ? "/api/books/search" : "/api/authors/search";
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        const rows: Row[] =
          kind === "book"
            ? (data as BookSearchResult[]).map((b) => ({
                id: `b${b.id}`,
                label: b.title,
                sub: b.author,
                guess: { type: "book", book: b },
              }))
            : (data as { name: string }[]).map((a) => ({
                id: `a${a.name}`,
                label: a.name,
                guess: { type: "author", name: a.name },
              }));
        setResults(rows.filter((r) => !exclude.includes(r.label)));
        setOpen(true);
        setHighlighted(0);
      } catch {
        // abortado/offline — ignora
      }
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, kind, exclude.join(",")]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(row: Row) {
    onGuess(row.guess);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(results[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const placeholder = disabled
    ? t.searchBox.roundEnded
    : kind === "book"
      ? t.searchBox.typeBookOrAuthor
      : t.searchBox.typeAuthorName;

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={query}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-lg outline-none transition focus:border-amber-400 disabled:opacity-50"
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
          {results.map((row, i) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => select(row)}
                onMouseEnter={() => setHighlighted(i)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                  i === highlighted ? "bg-zinc-800" : ""
                }`}
              >
                <span className="text-xl">{kind === "book" ? "📖" : "✍️"}</span>
                <span>
                  <span className="block font-medium">{row.label}</span>
                  {row.sub && <span className="block text-sm text-zinc-400">{row.sub}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
