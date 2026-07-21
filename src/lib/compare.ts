import { SEED_BOOKS } from "./seed-books";
import { getBookById } from "./data";
import { createClient, supabaseConfigured } from "./supabase/server";
import { LANG_LABEL, type LangFilter } from "./lang";
import { NoContentError } from "./rounds";
import type { StatKey } from "./modes/types";
import type { Book } from "./types";

/**
 * Livros elegíveis para a mecânica "maior ou menor": precisam ter o atributo
 * comparado preenchido (ex.: `sales_estimate` não é conhecido para todo
 * livro), além do filtro de idioma normal.
 */
async function eligibleForStat(statKey: StatKey, lang: LangFilter): Promise<Book[]> {
  if (supabaseConfigured()) {
    const supabase = await createClient();
    let q = supabase.from("books").select("*").not(statKey, "is", null).limit(5000);
    if (lang !== "all") q = q.eq("language", LANG_LABEL[lang]);
    const { data } = await q;
    return (data ?? []) as Book[];
  }
  let books = SEED_BOOKS.filter((b) => b[statKey] != null);
  if (lang !== "all") books = books.filter((b) => b.language === LANG_LABEL[lang]);
  return books;
}

function pickTwoDistinct(books: Book[]): [Book, Book] {
  if (books.length < 2) throw new NoContentError("acervo insuficiente para comparar");
  const i = Math.floor(Math.random() * books.length);
  let j = Math.floor(Math.random() * (books.length - 1));
  if (j >= i) j++;
  return [books[i], books[j]];
}

/** Sorteia o próximo livro (oculto), diferente do id informado. */
export async function pickNextBook(
  statKey: StatKey,
  lang: LangFilter,
  excludeId: number
): Promise<Book> {
  const books = await eligibleForStat(statKey, lang);
  const pool = books.filter((b) => b.id !== excludeId);
  if (pool.length === 0) throw new NoContentError("acervo insuficiente para comparar");
  return pool[Math.floor(Math.random() * pool.length)];
}

export interface StartedCompare {
  current: Book;
  next: Book;
}

/** Sorteia o par inicial (revelado + oculto) de uma rodada nova. */
export async function startCompare(statKey: StatKey, lang: LangFilter): Promise<StartedCompare> {
  const books = await eligibleForStat(statKey, lang);
  const [current, next] = pickTwoDistinct(books);
  return { current, next };
}

/** Resultado de uma aposta "maior"/"menor". Empate conta como acerto. */
export function resolveGuess(
  statKey: StatKey,
  currentValue: number,
  nextValue: number,
  guess: "higher" | "lower"
): boolean {
  if (nextValue === currentValue) return true;
  return guess === "higher" ? nextValue > currentValue : nextValue < currentValue;
}

export { getBookById };
