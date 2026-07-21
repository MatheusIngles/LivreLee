/**
 * Sistema de eventos semanais e sazonais. A resolução é PURA (por calendário),
 * então funciona no cliente e no servidor sem banco: dado um dia, sabemos qual
 * evento está ativo. O cron de eventos apenas espelha isso na tabela `events`
 * para fins de histórico/relatório — a jogabilidade não depende do banco.
 *
 * Um evento pode alterar o tema visual (accent/emoji) e, futuramente, filtrar o
 * acervo por gênero/coleção.
 */

/** Não tem `name` — o nome exibido vem do dicionário i18n, indexado por `slug`. */
export interface EventDef {
  slug: string;
  emoji: string;
  /** Cor de destaque (hex) aplicada ao tema. */
  theme: string;
  /** Filtro de acervo por gênero (quando aplicável). */
  filterGenre?: string;
  kind: "weekly" | "seasonal";
}

/** Rotação semanal por gênero. */
const WEEKLY: EventDef[] = [
  { slug: "semana-fantasia", emoji: "🧙", theme: "#a855f7", filterGenre: "Fantasia", kind: "weekly" },
  { slug: "semana-romance", emoji: "❤️", theme: "#ec4899", filterGenre: "Romance", kind: "weekly" },
  { slug: "semana-ficcao-cientifica", emoji: "🚀", theme: "#38bdf8", filterGenre: "Ficção Científica", kind: "weekly" },
  { slug: "semana-terror", emoji: "👻", theme: "#22c55e", filterGenre: "Terror", kind: "weekly" },
  { slug: "semana-misterio", emoji: "🕵️", theme: "#eab308", filterGenre: "Mistério", kind: "weekly" },
  { slug: "semana-classicos", emoji: "📚", theme: "#f59e0b", filterGenre: "Clássico", kind: "weekly" },
  { slug: "semana-brasil", emoji: "🇧🇷", theme: "#16a34a", kind: "weekly" },
];

/** Retorna o número da semana ISO (para girar a rotação semanal). */
function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const diff = date.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
}

/** Eventos sazonais: [mês (1-12), diaInício, diaFim]. */
const SEASONAL: (EventDef & { month: number; from: number; to: number })[] = [
  { slug: "halloween", emoji: "🎃", theme: "#f97316", filterGenre: "Terror", kind: "seasonal", month: 10, from: 25, to: 31 },
  { slug: "dia-das-criancas", emoji: "🧸", theme: "#38bdf8", kind: "seasonal", month: 10, from: 12, to: 12 },
  { slug: "black-friday", emoji: "🛍️", theme: "#111827", kind: "seasonal", month: 11, from: 24, to: 30 },
  { slug: "natal", emoji: "🎄", theme: "#dc2626", kind: "seasonal", month: 12, from: 20, to: 26 },
  { slug: "ano-novo", emoji: "🎆", theme: "#eab308", kind: "seasonal", month: 12, from: 30, to: 31 },
  { slug: "dia-mundial-do-livro", emoji: "📖", theme: "#f59e0b", kind: "seasonal", month: 4, from: 23, to: 23 },
];

/** Evento ativo para uma data (sazonal tem prioridade sobre o semanal). */
export function getActiveEvent(now: Date = new Date()): EventDef {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const seasonal = SEASONAL.find((e) => e.month === month && day >= e.from && day <= e.to);
  if (seasonal) {
    const { month: _m, from: _f, to: _t, ...def } = seasonal;
    void _m;
    void _f;
    void _t;
    return def;
  }
  return WEEKLY[isoWeek(now) % WEEKLY.length];
}
