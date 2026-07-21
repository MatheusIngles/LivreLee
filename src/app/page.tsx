"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { modesByGroup } from "@/lib/modes/registry";
import { getActiveEvent } from "@/lib/events";
import { getLanguagePref, setLanguagePref } from "@/lib/storage";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { GroupIcon, ModeIcon, Trophy, Globe } from "@/components/icons";
import LocaleSwitch from "@/components/LocaleSwitch";
import SegmentedControl from "@/components/SegmentedControl";
import EventDecoration from "@/components/EventDecoration";
import type { LangFilter } from "@/lib/lang";

const GROUP_ORDER = ["comparação", "frases", "livro", "outras-pistas", "capa", "autor", "especial"] as const;

export default function Home() {
  const { t } = useI18n();
  const groups = modesByGroup();
  const event = getActiveEvent();
  const [lang, setLang] = useState<LangFilter>("all");
  const [hydrated, setHydrated] = useState(false);

  // localStorage só existe no cliente — hidratação acontece pós-mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(getLanguagePref());
    setHydrated(true);
  }, []);

  function selectLang(value: LangFilter) {
    setLang(value);
    setLanguagePref(value);
  }

  const langQuery = hydrated && lang !== "all" ? `?lang=${lang}` : "";
  const langOptions: { value: LangFilter; label: string; shortLabel?: string }[] = [
    { value: "all", label: t.home.langAll, shortLabel: t.home.langAllShort },
    { value: "pt", label: t.home.langPt },
    { value: "en", label: t.home.langEn },
  ];

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-3xl self-end px-0 pb-2 text-right">
        <LocaleSwitch className="inline-flex" />
      </div>

      <div className="relative flex w-full max-w-md flex-col items-center">
        <EventDecoration event={event} />

        <div className="relative z-10 flex w-full flex-col items-center">
          <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
            <Image
              src="/image.png"
              alt="LivreLee"
              width={220}
              height={120}
              priority
              className="block h-auto w-[220px]"
            />
          </div>
          <p className="mt-4 max-w-md text-center text-zinc-400">
            {t.home.tagline(Object.values(groups).flat().length)}
          </p>

          <div
            className="mt-6 flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm"
            style={{ borderColor: event.theme, color: event.theme }}
          >
            <span>{event.emoji}</span>
            <span>
              {t.home.eventActive}: {t.events[event.slug]}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Link href="/conquistas" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-amber-400">
          <Trophy className="h-4 w-4" /> {t.home.achievementsLink}
        </Link>
      </div>

      <div className="mt-8 flex flex-col items-center gap-1.5">
        <span className="text-xs uppercase tracking-wide text-zinc-500">{t.home.bookLanguageLabel}</span>
        <SegmentedControl
          options={langOptions}
          value={lang}
          onChange={selectLang}
          icon={<Globe className="ml-1.5 h-4 w-4 shrink-0 text-zinc-500" />}
        />
      </div>

      <div className="mt-8 w-full max-w-3xl space-y-8">
        {GROUP_ORDER.map((group) => (
          <section key={group}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              <GroupIcon group={group} className="h-4 w-4" /> {t.home.groups[group]}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(groups[group] ?? []).map((mode) => {
                const text = t.modes[mode.id];
                return (
                  <Link
                    key={mode.id}
                    href={`/play/${mode.id}${langQuery}`}
                    className="group flex items-center gap-4 rounded-2xl border border-zinc-700 bg-zinc-900/60 p-4 transition hover:border-amber-400 hover:bg-zinc-900"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-amber-400 transition group-hover:bg-amber-500/15">
                      <ModeIcon id={mode.id} className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-semibold group-hover:text-amber-400">{text.name}</h3>
                      <p className="text-sm text-zinc-400">{text.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-12 text-xs text-zinc-600">{t.home.footer}</footer>
    </main>
  );
}
