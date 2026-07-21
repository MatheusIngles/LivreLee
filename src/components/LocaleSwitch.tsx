"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

/** Alternador do idioma da INTERFACE (PT/EN) — não mexe no acervo de livros. */
export default function LocaleSwitch({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <div className={`inline-flex overflow-hidden rounded-full border border-zinc-700 text-xs ${className}`}>
      {(["pt", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`px-2.5 py-1 font-semibold transition ${
            locale === l ? "bg-amber-500 text-zinc-900" : "text-zinc-400 hover:text-zinc-100"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
