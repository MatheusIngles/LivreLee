"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { modesByGroup } from "@/lib/modes/registry";
import { getActiveEvent } from "@/lib/events";
import { getLanguagePref, setLanguagePref } from "@/lib/storage";
import { GroupIcon, ModeIcon, Trophy, Globe } from "@/components/icons";
import type { LangFilter } from "@/lib/lang";

const GROUP_ORDER = ["comparação", "pistas", "autor", "especial"] as const;
const GROUP_LABELS: Record<string, string> = {
  comparação: "Comparação",
  pistas: "Pistas",
  autor: "Autor",
  especial: "Especial",
};

const LANG_OPTIONS: { value: LangFilter; label: string }[] = [
  { value: "all", label: "Todos os idiomas" },
  { value: "pt", label: "Português" },
  { value: "en", label: "Inglês" },
];

export default function Home() {
  const groups = modesByGroup();
  const event = getActiveEvent();
  const [lang, setLang] = useState<LangFilter>("all");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLang(getLanguagePref());
    setHydrated(true);
  }, []);

  function selectLang(value: LangFilter) {
    setLang(value);
    setLanguagePref(value);
  }

  const langQuery = hydrated && lang !== "all" ? `?lang=${lang}` : "";

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-12">
      <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
        <Image src="/image.png" alt="LivreLee" width={220} height={110} priority className="block" />
      </div>
      <p className="mt-4 max-w-md text-center text-zinc-400">
        Adivinhe livros de {Object.values(groups).flat().length} formas diferentes. Sem cadastro — é só jogar.
      </p>

      <div
        className="mt-6 flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm"
        style={{ borderColor: event.theme, color: event.theme }}
      >
        <span>{event.emoji}</span>
        <span>Evento ativo: {event.name}</span>
      </div>

      <div className="mt-4">
        <Link href="/conquistas" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-amber-400">
          <Trophy className="h-4 w-4" /> Ver conquistas e estatísticas
        </Link>
      </div>

      <div className="mt-8 flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/60 p-1 text-sm">
        <Globe className="ml-2 h-4 w-4 text-zinc-500" />
        {LANG_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => selectLang(opt.value)}
            className={`rounded-full px-3 py-1.5 transition ${
              lang === opt.value ? "bg-amber-500 text-zinc-900 font-semibold" : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-8 w-full max-w-3xl space-y-8">
        {GROUP_ORDER.map((group) => (
          <section key={group}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              <GroupIcon group={group} className="h-4 w-4" /> {GROUP_LABELS[group]}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(groups[group] ?? []).map((mode) => (
                <Link
                  key={mode.id}
                  href={`/play/${mode.id}${langQuery}`}
                  className="group flex items-center gap-4 rounded-2xl border border-zinc-700 bg-zinc-900/60 p-4 transition hover:border-amber-400 hover:bg-zinc-900"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-amber-400 transition group-hover:bg-amber-500/15">
                    <ModeIcon id={mode.id} className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold group-hover:text-amber-400">{mode.name}</h3>
                    <p className="text-sm text-zinc-400">{mode.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-12 text-xs text-zinc-600">Um jogo diário para quem ama livros.</footer>
    </main>
  );
}
