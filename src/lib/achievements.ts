import { listModes } from "./modes/registry";
import type { AchievementGroupId } from "./i18n/dictionaries";
import type { GlobalStats, RoundResult } from "./storage";

/**
 * Catálogo de conquistas + avaliação. As conquistas são avaliadas e guardadas
 * localmente (sem contas). Cada uma tem um predicado sobre as estatísticas
 * acumuladas e o resultado da partida recém-terminada.
 *
 * Não tem `name`/`description` — texto exibido vem do dicionário i18n
 * (src/lib/i18n/dictionaries.ts), indexado por `slug`. Ver nota equivalente
 * em modes/types.ts.
 */

export interface Achievement {
  slug: string;
  icon: string;
  xp: number;
  group: AchievementGroupId;
}

export interface AchievementDef extends Achievement {
  check: (ctx: { stats: GlobalStats; result: RoundResult }) => boolean;
}

const TOTAL_MODES = listModes().filter((m) => m.id !== "mixed").length;

export const ACHIEVEMENTS: AchievementDef[] = [
  // Primeiros passos / First steps
  { slug: "primeiro-acerto", icon: "🌱", xp: 10, group: "first-steps", check: ({ stats }) => stats.totalCorrect >= 1 },
  { slug: "primeira-vitoria-diaria", icon: "📅", xp: 20, group: "first-steps", check: ({ result }) => result.won && result.mode === "daily" },
  { slug: "primeiro-modo", icon: "✅", xp: 10, group: "first-steps", check: ({ result }) => result.won },

  // Progressão / Progression
  { slug: "acertos-10", icon: "🔟", xp: 20, group: "progression", check: ({ stats }) => stats.totalCorrect >= 10 },
  { slug: "acertos-50", icon: "5️⃣0️⃣", xp: 50, group: "progression", check: ({ stats }) => stats.totalCorrect >= 50 },
  { slug: "acertos-100", icon: "💯", xp: 100, group: "progression", check: ({ stats }) => stats.totalCorrect >= 100 },
  { slug: "acertos-500", icon: "🏅", xp: 300, group: "progression", check: ({ stats }) => stats.totalCorrect >= 500 },
  { slug: "acertos-1000", icon: "👑", xp: 700, group: "progression", check: ({ stats }) => stats.totalCorrect >= 1000 },

  // Sequência / Streaks
  { slug: "streak-7", icon: "🔥", xp: 70, group: "streaks", check: ({ stats }) => (stats.perMode.daily?.maxStreak ?? 0) >= 7 },
  { slug: "streak-30", icon: "🌟", xp: 300, group: "streaks", check: ({ stats }) => (stats.perMode.daily?.maxStreak ?? 0) >= 30 },
  { slug: "streak-100", icon: "💎", xp: 1000, group: "streaks", check: ({ stats }) => (stats.perMode.daily?.maxStreak ?? 0) >= 100 },
  { slug: "acertos-seguidos-20", icon: "⚡", xp: 200, group: "streaks", check: ({ stats }) => stats.maxWinStreak >= 20 },

  // Desafios / Challenges
  { slug: "de-primeira", icon: "🎯", xp: 50, group: "challenges", check: ({ result }) => result.won && result.guesses === 1 },
  { slug: "sem-dicas", icon: "🧠", xp: 30, group: "challenges", check: ({ result }) => result.won && !result.usedHint },
  { slug: "so-pela-frase", icon: "💬", xp: 40, group: "challenges", check: ({ result }) => result.won && result.mode === "quote" },
  { slug: "so-pelos-emojis", icon: "😀", xp: 40, group: "challenges", check: ({ result }) => result.won && result.mode === "emoji" },
  { slug: "capa-primeiro-zoom", icon: "🦅", xp: 60, group: "challenges", check: ({ result }) => result.won && result.mode === "cover" && result.guesses === 1 },
  { slug: "todos-os-modos", icon: "🏆", xp: 500, group: "challenges", check: ({ stats }) => stats.modesCompleted.filter((m) => m !== "mixed").length >= TOTAL_MODES },
];

const BY_SLUG = new Map(ACHIEVEMENTS.map((a) => [a.slug, a]));

/**
 * Avalia as conquistas após uma partida. Retorna os slugs recém-desbloqueados
 * (que ainda não estavam em `earned`).
 */
export function evaluateAchievements(
  ctx: { stats: GlobalStats; result: RoundResult },
  earned: string[]
): AchievementDef[] {
  const set = new Set(earned);
  const unlocked: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!set.has(a.slug) && a.check(ctx)) unlocked.push(a);
  }
  return unlocked;
}

export function getAchievement(slug: string): AchievementDef | undefined {
  return BY_SLUG.get(slug);
}

export function allAchievements(): Achievement[] {
  return ACHIEVEMENTS;
}
