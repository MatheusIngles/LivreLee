import type {
  Author,
  AuthorGuessFeedback,
  Book,
  Cmp,
  GuessFeedback,
  NumericCmp,
} from "./types";

const YEAR_PARTIAL_RANGE = 10;
const PAGES_PARTIAL_RANGE = 100;
const SALES_PARTIAL_RANGE = 20; // milhões de cópias

function cmpText(guess: string | null, target: string | null): Cmp {
  if (!guess || !target) return "wrong";
  return guess.trim().toLowerCase() === target.trim().toLowerCase()
    ? "correct"
    : "wrong";
}

function cmpNumber(guess: number, target: number, partialRange: number): NumericCmp {
  if (guess === target) return { cmp: "correct", dir: null };
  return {
    cmp: Math.abs(guess - target) <= partialRange ? "partial" : "wrong",
    dir: target > guess ? "up" : "down",
  };
}

/** Comparação numérica tolerante a valores ausentes (ex.: vendas desconhecidas). */
function cmpNullableNumber(
  guess: number | null,
  target: number | null,
  partialRange: number
): NumericCmp {
  if (guess == null || target == null) return { cmp: "wrong", dir: null };
  return cmpNumber(guess, target, partialRange);
}

/** Compara o livro palpitado com o alvo, estilo Loldle (grade completa). */
export function compareGuess(guess: Book, target: Book): GuessFeedback {
  return {
    won: guess.id === target.id,
    guess: {
      id: guess.id,
      title: guess.title,
      author: guess.author,
      year: guess.year,
      country: guess.country,
      language: guess.language,
      genre: guess.genre,
      pages: guess.pages,
      sales_estimate: guess.sales_estimate,
      cover_url: guess.cover_url,
    },
    fields: {
      author: cmpText(guess.author, target.author),
      year: cmpNumber(guess.year, target.year, YEAR_PARTIAL_RANGE),
      country: cmpText(guess.country, target.country),
      language: cmpText(guess.language, target.language),
      genre: cmpText(guess.genre, target.genre),
      pages: cmpNumber(guess.pages, target.pages, PAGES_PARTIAL_RANGE),
      sales: cmpNullableNumber(guess.sales_estimate, target.sales_estimate, SALES_PARTIAL_RANGE),
    },
  };
}

/** Compara dois autores por seus atributos agregados (estilo Loldle). */
export function compareAuthorGuess(guess: Author, target: Author): AuthorGuessFeedback {
  return {
    won: guess.name.trim().toLowerCase() === target.name.trim().toLowerCase(),
    guess: {
      name: guess.name,
      country: guess.country,
      language: guess.language,
      first_year: guess.first_year,
      main_genre: guess.main_genre,
    },
    fields: {
      country: cmpText(guess.country, target.country),
      language: cmpText(guess.language, target.language),
      first_year: cmpNumber(guess.first_year, target.first_year, YEAR_PARTIAL_RANGE),
      main_genre: cmpText(guess.main_genre, target.main_genre),
    },
  };
}

/**
 * Data do desafio no fuso de Brasília (UTC-3), formato YYYY-MM-DD.
 * O "dia" do jogo vira à meia-noite de Brasília para todo mundo.
 */
export function todayKey(now: Date = new Date()): string {
  const brasilia = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return brasilia.toISOString().slice(0, 10);
}

/** Índice determinístico a partir de uma chave (mesmo resultado p/ todos). */
export function dailyIndexFor(key: string, poolSize: number): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return poolSize > 0 ? hash % poolSize : 0;
}
