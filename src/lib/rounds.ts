import { SEED_BOOKS } from "./seed-books";
import {
  SEED_ADAPTATIONS,
  SEED_CHAPTERS,
  SEED_CHARACTERS,
  SEED_EMOJIS,
  SEED_QUOTES,
} from "./seed-content";
import { dailyIndexFor, todayKey } from "./game";
import { getBookById, getDailyBook } from "./data";
import { createClient, supabaseConfigured } from "./supabase/server";
import { LANG_LABEL, type LangFilter } from "./lang";
import type { ModeDef } from "./modes/types";
import type { RoundAnswer } from "./round-token";
import type { Author, Book } from "./types";
import type {
  AdaptationRow,
  CharacterRow,
  QuoteRow,
} from "./content-types";

/**
 * Construção de rodadas e acesso ao conteúdo dos modos. Com Supabase, lê do
 * banco; sem ele, usa os datasets locais (SEED_BOOKS + seed-content) para o
 * jogo rodar de ponta a ponta offline.
 *
 * `lang` filtra o acervo por idioma ("pt" | "en" | "all"). Para os modos cuja
 * pista é derivada de um livro (quote/character/chapter/...), o filtro é
 * aplicado restringindo os book_id elegíveis antes de sortear a pista.
 */

export class NoContentError extends Error {}

/** Escolhe um item da lista: determinístico (diário) ou aleatório. */
function pickFrom<T>(list: T[], daily: boolean, key: string): T {
  if (list.length === 0) throw new NoContentError("lista vazia");
  const i = daily ? dailyIndexFor(key, list.length) : Math.floor(Math.random() * list.length);
  return list[i];
}

// ------------------------------- livros ----------------------------------

async function eligibleBooks(requires?: ModeDef["requires"], lang: LangFilter = "all"): Promise<Book[]> {
  if (supabaseConfigured()) {
    const supabase = await createClient();
    let q = supabase.from("books").select("*").limit(5000);
    if (requires) q = q.not(requires, "is", null);
    if (lang !== "all") q = q.eq("language", LANG_LABEL[lang]);
    const { data } = await q;
    return (data ?? []).map(normalizeBook);
  }
  let books = SEED_BOOKS;
  if (requires === "cover_url") books = books.filter((b) => b.cover_url);
  if (requires === "description") books = books.filter((b) => b.description);
  if (lang !== "all") books = books.filter((b) => b.language === LANG_LABEL[lang]);
  return books;
}

/** Ids de livros elegíveis para o filtro de idioma (null = sem filtro). */
async function allowedBookIds(lang: LangFilter): Promise<Set<number> | null> {
  if (lang === "all") return null;
  const books = await eligibleBooks(undefined, lang);
  return new Set(books.map((b) => b.id));
}

/** Garante tags como array (Supabase pode devolver null). */
function normalizeBook(row: Record<string, unknown>): Book {
  const b = row as unknown as Book;
  return { ...b, tags: b.tags ?? [] };
}

async function pickBook(mode: ModeDef, daily: boolean, date: string, lang: LangFilter): Promise<Book> {
  // O modo "daily" usa a tabela daily_challenges (sem repetição + ranking).
  if (mode.id === "daily") return getDailyBook(lang);

  const books = await eligibleBooks(mode.requires, lang);
  if (books.length === 0) throw new NoContentError("nenhum livro elegível");
  return pickFrom(books, daily, `${mode.id}:${date}`);
}

// ------------------------------- autores ---------------------------------

let authorsCache: { at: number; authors: Author[] } | null = null;
const AUTHORS_TTL = 5 * 60 * 1000;

/** Agrega os livros por autor (país, idioma, obra mais antiga, gênero-mor). */
export async function getAuthors(): Promise<Author[]> {
  if (authorsCache && Date.now() - authorsCache.at < AUTHORS_TTL) {
    return authorsCache.authors;
  }

  let rows: Pick<Book, "author" | "year" | "country" | "language" | "genre">[];
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("books")
      .select("author, year, country, language, genre")
      .limit(5000);
    rows = data ?? [];
  } else {
    rows = SEED_BOOKS;
  }

  const map = new Map<string, Author & { genres: Record<string, number> }>();
  for (const r of rows) {
    if (!r.author) continue;
    const cur =
      map.get(r.author) ??
      ({
        name: r.author,
        country: r.country ?? null,
        language: r.language ?? null,
        first_year: r.year ?? 9999,
        main_genre: r.genre ?? "—",
        book_count: 0,
        genres: {},
      } as Author & { genres: Record<string, number> });
    cur.book_count++;
    if (r.year && r.year < cur.first_year) cur.first_year = r.year;
    if (!cur.country && r.country) cur.country = r.country;
    if (!cur.language && r.language) cur.language = r.language;
    if (r.genre) cur.genres[r.genre] = (cur.genres[r.genre] ?? 0) + 1;
    map.set(r.author, cur);
  }

  const authors: Author[] = [...map.values()].map((a) => {
    const main = Object.entries(a.genres).sort((x, y) => y[1] - x[1])[0];
    return {
      name: a.name,
      country: a.country,
      language: a.language,
      first_year: a.first_year === 9999 ? 0 : a.first_year,
      main_genre: main ? main[0] : "—",
      book_count: a.book_count,
    };
  });

  authorsCache = { at: Date.now(), authors };
  return authors;
}

/** Autores com ao menos um livro no idioma filtrado (proxy: idioma agregado do autor). */
async function eligibleAuthors(lang: LangFilter): Promise<Author[]> {
  const authors = await getAuthors();
  if (lang === "all") return authors;
  return authors.filter((a) => a.language === LANG_LABEL[lang]);
}

export async function getAuthorByName(name: string): Promise<Author | null> {
  const authors = await getAuthors();
  const n = name.trim().toLowerCase();
  return authors.find((a) => a.name.trim().toLowerCase() === n) ?? null;
}

export async function searchAuthors(query: string): Promise<{ name: string }[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const authors = await getAuthors();
  return authors
    .filter((a) => a.name.toLowerCase().includes(q))
    .sort((a, b) => b.book_count - a.book_count)
    .slice(0, 8)
    .map((a) => ({ name: a.name }));
}

// ------------------------------ conteúdo ---------------------------------

async function fetchContent<T>(table: string, filter?: [string, string]): Promise<T[]> {
  if (!supabaseConfigured()) throw new NoContentError("offline");
  const supabase = await createClient();
  let q = supabase.from(table).select("*").limit(5000);
  if (filter) q = q.eq(filter[0], filter[1]);
  const { data } = await q;
  return (data ?? []) as T[];
}

/** Filtra uma lista de itens com book_id pelos ids permitidos (ou devolve tudo se sem filtro). */
function filterByAllowedBooks<T extends { book_id: number }>(list: T[], allowed: Set<number> | null): T[] {
  return allowed ? list.filter((item) => allowed.has(item.book_id)) : list;
}

async function pickQuote(kind: QuoteRow["kind"], daily: boolean, key: string, lang: LangFilter): Promise<QuoteRow> {
  const raw = supabaseConfigured()
    ? await fetchContent<QuoteRow>("quotes", ["kind", kind])
    : SEED_QUOTES.filter((q) => q.kind === kind);
  const list = filterByAllowedBooks(raw, await allowedBookIds(lang));
  if (list.length === 0) throw new NoContentError(`sem frases (${kind})`);
  return pickFrom(list, daily, key);
}

async function pickCharacter(daily: boolean, key: string, lang: LangFilter): Promise<CharacterRow> {
  const raw = supabaseConfigured() ? await fetchContent<CharacterRow>("characters") : SEED_CHARACTERS;
  const list = filterByAllowedBooks(raw, await allowedBookIds(lang));
  if (list.length === 0) throw new NoContentError("sem personagens");
  return pickFrom(list, daily, key);
}

async function pickChapter(daily: boolean, key: string, lang: LangFilter) {
  const raw = supabaseConfigured()
    ? await fetchContent<{ book_id: number; name: string }>("chapters")
    : SEED_CHAPTERS;
  const list = filterByAllowedBooks(raw, await allowedBookIds(lang));
  if (list.length === 0) throw new NoContentError("sem capítulos");
  return pickFrom(list, daily, key);
}

async function pickAdaptation(daily: boolean, key: string, lang: LangFilter): Promise<AdaptationRow> {
  const raw = supabaseConfigured() ? await fetchContent<AdaptationRow>("adaptations") : SEED_ADAPTATIONS;
  const list = filterByAllowedBooks(raw, await allowedBookIds(lang));
  if (list.length === 0) throw new NoContentError("sem adaptações");
  return pickFrom(list, daily, key);
}

async function pickEmoji(daily: boolean, key: string, lang: LangFilter) {
  const raw = supabaseConfigured()
    ? await fetchContent<{ book_id: number; emoji: string }>("book_emojis")
    : SEED_EMOJIS;
  const list = filterByAllowedBooks(raw, await allowedBookIds(lang));
  if (list.length === 0) throw new NoContentError("sem emojis");
  return pickFrom(list, daily, key);
}

// --------------------------- construção da rodada ------------------------

export interface BuiltRound {
  clue: Record<string, unknown>;
  answer: RoundAnswer;
}

/**
 * Monta a pista + a resposta (assinável) de um modo já resolvido (não-Mixed).
 * Lança NoContentError quando o modo depende de conteúdo ainda inexistente
 * (inclusive quando o filtro de idioma zera o acervo elegível).
 */
export async function buildRound(mode: ModeDef, daily: boolean, lang: LangFilter = "all"): Promise<BuiltRound> {
  const date = todayKey();
  const key = `${mode.id}:${date}`;

  switch (mode.source) {
    case "book": {
      const book = await pickBook(mode, daily, date, lang);
      // Author Mode: mostra o título, resposta é o autor.
      if (mode.guessType === "author") {
        return {
          clue: { title: book.title, cover_url: book.cover_url },
          answer: { m: mode.id, a: book.author, d: daily ? date : undefined },
        };
      }
      return {
        clue: bookClue(mode, book),
        answer: { m: mode.id, b: book.id, d: daily ? date : undefined },
      };
    }
    case "author": {
      const authors = await eligibleAuthors(lang);
      const author = pickFrom(authors, daily, key);
      return { clue: {}, answer: { m: mode.id, a: author.name, d: daily ? date : undefined } };
    }
    case "quote:quote":
    case "quote:opening":
    case "quote:closing":
    case "quote:character": {
      const kind = mode.source.split(":")[1] as QuoteRow["kind"];
      const q = await pickQuote(kind, daily, key, lang);
      const clue: Record<string, unknown> = { text: q.text };
      if (kind === "quote") clue.context = q.context;
      if (kind === "character") clue.hint = "Alguém disse isto.";
      return { clue, answer: { m: mode.id, b: q.book_id, d: daily ? date : undefined } };
    }
    case "character": {
      const c = await pickCharacter(daily, key, lang);
      const clue =
        mode.clueType === "character-name"
          ? { name: c.name }
          : { description: c.description ?? c.name };
      return { clue, answer: { m: mode.id, b: c.book_id, d: daily ? date : undefined } };
    }
    case "chapter": {
      const c = await pickChapter(daily, key, lang);
      return { clue: { chapter: c.name }, answer: { m: mode.id, b: c.book_id, d: daily ? date : undefined } };
    }
    case "adaptation": {
      const a = await pickAdaptation(daily, key, lang);
      return {
        clue: { title: a.title, kind: a.kind, year: a.year },
        answer: { m: mode.id, b: a.book_id, d: daily ? date : undefined },
      };
    }
    case "emoji": {
      const e = await pickEmoji(daily, key, lang);
      return { clue: { emoji: e.emoji }, answer: { m: mode.id, b: e.book_id, d: daily ? date : undefined } };
    }
  }
}

/** Pista derivada dos campos de um livro, conforme o clueType do modo. */
function bookClue(mode: ModeDef, book: Book): Record<string, unknown> {
  switch (mode.clueType) {
    case "timeline":
      return { year: book.year, country: book.country, genre: book.genre, pages: book.pages };
    case "cover-zoom":
    case "cover-blur":
    case "cover-silhouette":
      return { cover_url: book.cover_url };
    case "synopsis":
      return { synopsis: book.description };
    case "tags":
      return { tags: book.tags?.length ? book.tags : [book.genre] };
    default:
      return {};
  }
}

/** Reexport utilitário. */
export { getBookById };
