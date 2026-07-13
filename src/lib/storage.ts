"use client";

/**
 * Persistência SEM contas: tudo no navegador (localStorage). Um client_id
 * anônimo (UUID) identifica o jogador para ranking no servidor, sem login.
 * Se o usuário limpar o navegador, o progresso se perde — é o trade-off do
 * modelo sem conta.
 */

import type { Achievement } from "./achievements";
import type { LangFilter } from "./lang";
import { parseLangFilter } from "./lang";

const CLIENT_ID_KEY = "livrelee:client-id";
const STATS_KEY = "livrelee:stats";
const ACH_KEY = "livrelee:achievements";
const LANG_KEY = "livrelee:lang";
const roundKey = (mode: string) => `livrelee:round:${mode}`;

export function getLanguagePref(): LangFilter {
  if (typeof window === "undefined") return "all";
  return parseLangFilter(localStorage.getItem(LANG_KEY));
}

export function setLanguagePref(lang: LangFilter) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LANG_KEY, lang);
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** UUID anônimo estável do jogador (criado na primeira visita). */
export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

// ------------------------------ estatísticas ------------------------------

export interface ModeStats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** distribuição de vitórias por nº de tentativas (índice 1..N). */
  distribution: Record<number, number>;
  lastDate: string | null;
  totalGuesses: number;
  /** vitórias seguidas globais (para conquistas de sequência de acertos). */
}

export interface GlobalStats {
  totalCorrect: number;
  winStreak: number; // acertos seguidos (qualquer modo)
  maxWinStreak: number;
  modesCompleted: string[]; // ids de modos já vencidos ao menos uma vez
  perMode: Record<string, ModeStats>;
}

const EMPTY_MODE: ModeStats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: {},
  lastDate: null,
  totalGuesses: 0,
};

export function loadStats(): GlobalStats {
  if (typeof window === "undefined") {
    return { totalCorrect: 0, winStreak: 0, maxWinStreak: 0, modesCompleted: [], perMode: {} };
  }
  return safeParse<GlobalStats>(localStorage.getItem(STATS_KEY), {
    totalCorrect: 0,
    winStreak: 0,
    maxWinStreak: 0,
    modesCompleted: [],
    perMode: {},
  });
}

function saveStats(stats: GlobalStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export interface RoundResult {
  mode: string;
  won: boolean;
  guesses: number; // nº de tentativas usadas
  date: string;
  usedHint: boolean;
  /** true se o modo é diário (para a lógica de streak por dia). */
  daily: boolean;
}

/** Registra o fim de uma partida e devolve as estatísticas atualizadas. */
export function recordResult(r: RoundResult): GlobalStats {
  const stats = loadStats();
  const m = { ...EMPTY_MODE, ...(stats.perMode[r.mode] ?? {}) };

  m.played++;
  if (r.won) {
    m.wins++;
    m.totalGuesses += r.guesses;
    m.distribution[r.guesses] = (m.distribution[r.guesses] ?? 0) + 1;
    // streak diário: só conta em modo diário e dias consecutivos.
    if (r.daily) {
      m.currentStreak = m.lastDate && isYesterday(m.lastDate, r.date) ? m.currentStreak + 1 : 1;
      m.maxStreak = Math.max(m.maxStreak, m.currentStreak);
    }
    stats.totalCorrect++;
    stats.winStreak++;
    stats.maxWinStreak = Math.max(stats.maxWinStreak, stats.winStreak);
    if (!stats.modesCompleted.includes(r.mode)) stats.modesCompleted.push(r.mode);
  } else {
    if (r.daily) m.currentStreak = 0;
    stats.winStreak = 0;
  }
  m.lastDate = r.date;
  stats.perMode[r.mode] = m;
  saveStats(stats);
  return stats;
}

function isYesterday(prev: string, today: string): boolean {
  const d = new Date(today + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10) === prev;
}

// ----------------------------- conquistas --------------------------------

export function loadEarnedAchievements(): string[] {
  if (typeof window === "undefined") return [];
  return safeParse<string[]>(localStorage.getItem(ACH_KEY), []);
}

export function saveEarnedAchievements(slugs: string[]) {
  localStorage.setItem(ACH_KEY, JSON.stringify(slugs));
}

// ------------------- estado da partida diária (retomar) -------------------

export function saveRound<T>(mode: string, state: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(roundKey(mode), JSON.stringify(state));
}

export function loadRound<T>(mode: string): T | null {
  if (typeof window === "undefined") return null;
  return safeParse<T | null>(localStorage.getItem(roundKey(mode)), null);
}

export function clearRound(mode: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(roundKey(mode));
}

export type { Achievement };
