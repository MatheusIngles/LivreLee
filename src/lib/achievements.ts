import { listModes } from "./modes/registry";
import type { GlobalStats, RoundResult } from "./storage";

/**
 * Catálogo de conquistas + avaliação. As conquistas são avaliadas e guardadas
 * localmente (sem contas). Cada uma tem um predicado sobre as estatísticas
 * acumuladas e o resultado da partida recém-terminada.
 */

export interface Achievement {
  slug: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  group: "Primeiros passos" | "Progressão" | "Sequência" | "Desafios";
}

export interface AchievementDef extends Achievement {
  check: (ctx: { stats: GlobalStats; result: RoundResult }) => boolean;
}

const TOTAL_MODES = listModes().filter((m) => m.id !== "mixed").length;

export const ACHIEVEMENTS: AchievementDef[] = [
  // Primeiros passos
  { slug: "primeiro-acerto", name: "Primeiro acerto", description: "Acerte um livro pela primeira vez.", icon: "🌱", xp: 10, group: "Primeiros passos", check: ({ stats }) => stats.totalCorrect >= 1 },
  { slug: "primeira-vitoria-diaria", name: "Primeira vitória diária", description: "Vença o desafio diário.", icon: "📅", xp: 20, group: "Primeiros passos", check: ({ result }) => result.won && result.mode === "daily" },
  { slug: "primeiro-modo", name: "Primeiro modo concluído", description: "Vença qualquer modo.", icon: "✅", xp: 10, group: "Primeiros passos", check: ({ result }) => result.won },

  // Progressão
  { slug: "acertos-10", name: "10 acertos", description: "Acumule 10 acertos.", icon: "🔟", xp: 20, group: "Progressão", check: ({ stats }) => stats.totalCorrect >= 10 },
  { slug: "acertos-50", name: "50 acertos", description: "Acumule 50 acertos.", icon: "5️⃣0️⃣", xp: 50, group: "Progressão", check: ({ stats }) => stats.totalCorrect >= 50 },
  { slug: "acertos-100", name: "100 acertos", description: "Acumule 100 acertos.", icon: "💯", xp: 100, group: "Progressão", check: ({ stats }) => stats.totalCorrect >= 100 },
  { slug: "acertos-500", name: "500 acertos", description: "Acumule 500 acertos.", icon: "🏅", xp: 300, group: "Progressão", check: ({ stats }) => stats.totalCorrect >= 500 },
  { slug: "acertos-1000", name: "1000 acertos", description: "Acumule 1000 acertos.", icon: "👑", xp: 700, group: "Progressão", check: ({ stats }) => stats.totalCorrect >= 1000 },

  // Sequência
  { slug: "streak-7", name: "7 dias seguidos", description: "Vença o diário 7 dias seguidos.", icon: "🔥", xp: 70, group: "Sequência", check: ({ stats }) => (stats.perMode.daily?.maxStreak ?? 0) >= 7 },
  { slug: "streak-30", name: "30 dias seguidos", description: "Vença o diário 30 dias seguidos.", icon: "🌟", xp: 300, group: "Sequência", check: ({ stats }) => (stats.perMode.daily?.maxStreak ?? 0) >= 30 },
  { slug: "streak-100", name: "100 dias seguidos", description: "Vença o diário 100 dias seguidos.", icon: "💎", xp: 1000, group: "Sequência", check: ({ stats }) => (stats.perMode.daily?.maxStreak ?? 0) >= 100 },
  { slug: "acertos-seguidos-20", name: "20 seguidos", description: "Acerte 20 partidas seguidas.", icon: "⚡", xp: 200, group: "Sequência", check: ({ stats }) => stats.maxWinStreak >= 20 },

  // Desafios
  { slug: "de-primeira", name: "Acertar de primeira", description: "Vença no primeiro palpite.", icon: "🎯", xp: 50, group: "Desafios", check: ({ result }) => result.won && result.guesses === 1 },
  { slug: "sem-dicas", name: "Sem dicas", description: "Vença sem usar nenhuma dica.", icon: "🧠", xp: 30, group: "Desafios", check: ({ result }) => result.won && !result.usedHint },
  { slug: "so-pela-frase", name: "Só pela frase", description: "Vença o modo Frase.", icon: "💬", xp: 40, group: "Desafios", check: ({ result }) => result.won && result.mode === "quote" },
  { slug: "so-pelos-emojis", name: "Só pelos emojis", description: "Vença o modo Emoji.", icon: "😀", xp: 40, group: "Desafios", check: ({ result }) => result.won && result.mode === "emoji" },
  { slug: "capa-primeiro-zoom", name: "Olho de águia", description: "Acerte a capa no primeiro zoom.", icon: "🦅", xp: 60, group: "Desafios", check: ({ result }) => result.won && result.mode === "cover" && result.guesses === 1 },
  { slug: "todos-os-modos", name: "Poliglota dos modos", description: "Vença todos os modos ao menos uma vez.", icon: "🏆", xp: 500, group: "Desafios", check: ({ stats }) => stats.modesCompleted.filter((m) => m !== "mixed").length >= TOTAL_MODES },
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
