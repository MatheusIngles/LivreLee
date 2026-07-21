"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { allAchievements } from "@/lib/achievements";
import { loadEarnedAchievements, loadStats, type GlobalStats } from "@/lib/storage";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import type { AchievementGroupId } from "@/lib/i18n/dictionaries";
import { ArrowLeft, Award, AchievementIcon, CheckCircle2, Flame, Trophy, Zap } from "@/components/icons";
import LocaleSwitch from "@/components/LocaleSwitch";

interface LoadedState {
  earned: string[];
  stats: GlobalStats | null;
}

const GROUP_ORDER: AchievementGroupId[] = ["first-steps", "progression", "streaks", "challenges"];

export default function AchievementsPage() {
  const { t } = useI18n();
  const [{ earned, stats }, setLoaded] = useState<LoadedState>({ earned: [], stats: null });

  // localStorage só existe no cliente — hidratação acontece pós-mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded({ earned: loadEarnedAchievements(), stats: loadStats() });
  }, []);

  const achievements = allAchievements();
  const earnedSet = new Set(earned);
  const totalXp = achievements
    .filter((a) => earnedSet.has(a.slug))
    .reduce((sum, a) => sum + a.xp, 0);

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-amber-400">
            <ArrowLeft className="h-4 w-4" /> {t.common.back}
          </Link>
          <LocaleSwitch />
        </div>

        <h1 className="mt-3 flex items-center gap-2 text-3xl font-bold">
          <Trophy className="h-7 w-7 text-amber-400" /> {t.achievements.title}
        </h1>

        <div className="mt-4 flex flex-wrap gap-3">
          <Stat icon={<Zap className="h-4 w-4" />} label={t.achievements.stats.xp} value={totalXp} />
          <Stat icon={<CheckCircle2 className="h-4 w-4" />} label={t.achievements.stats.correct} value={stats?.totalCorrect ?? 0} />
          <Stat icon={<Flame className="h-4 w-4" />} label={t.achievements.stats.dailyStreak} value={stats?.perMode.daily?.currentStreak ?? 0} />
          <Stat icon={<Award className="h-4 w-4" />} label={t.achievements.stats.achievements} value={`${earned.length}/${achievements.length}`} />
        </div>

        <div className="mt-8 space-y-8">
          {GROUP_ORDER.map((group) => (
            <section key={group}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                {t.achievements.groups[group]}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {achievements
                  .filter((a) => a.group === group)
                  .map((a) => {
                    const got = earnedSet.has(a.slug);
                    const text = t.achievementDefs[a.slug];
                    return (
                      <div
                        key={a.slug}
                        className={`flex items-center gap-3 rounded-2xl border p-4 ${
                          got ? "border-amber-500 bg-zinc-900" : "border-zinc-800 bg-zinc-900/30 opacity-60"
                        }`}
                      >
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${got ? "bg-amber-500/15 text-amber-400" : "bg-zinc-800 text-zinc-500"}`}>
                          <AchievementIcon slug={a.slug} className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-semibold">{text.name}</p>
                          <p className="text-sm text-zinc-400">{text.description}</p>
                        </div>
                        <span className="ml-auto text-xs text-amber-400">+{a.xp}</span>
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-3">
      <span className="text-amber-400">{icon}</span>
      <div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      </div>
    </div>
  );
}
