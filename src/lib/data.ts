import { SEED_BOOKS } from "./seed-books";
import { dailyIndexFor, todayKey } from "./game";
import { selectDailyBookId } from "./daily";
import { createClient, supabaseConfigured } from "./supabase/server";
import { LANG_LABEL, type LangFilter } from "./lang";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Book, BookSearchResult } from "./types";

/** Chave de modo usada em daily_challenges: "daily" ou "daily-pt"/"daily-en". */
function dailyModeKey(lang: LangFilter): string {
  return lang === "all" ? "daily" : `daily-${lang}`;
}

/**
 * Camada de dados. Com o Supabase configurado (.env), tudo vem do banco;
 * sem ele, cai no dataset local de demonstração para o dev funcionar.
 */

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("books")
      .select("id, title, author, cover_url")
      .or(`title.ilike.%${q}%,author.ilike.%${q}%`)
      .order("popularity", { ascending: false })
      .limit(8);
    if (error) throw new Error(`searchBooks: ${error.message}`);
    return data ?? [];
  }

  return SEED_BOOKS.filter(
    (b) =>
      b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
  )
    .slice(0, 8)
    .map(({ id, title, author, cover_url }) => ({ id, title, author, cover_url }));
}

export async function getBookById(id: number): Promise<Book | null> {
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`getBookById: ${error.message}`);
    return data;
  }
  return SEED_BOOKS.find((b) => b.id === id) ?? null;
}

/** Lê a linha do desafio de hoje com o livro-alvo já embutido. */
async function readTodayChallenge(
  supabase: SupabaseClient,
  date: string,
  modeKey: string
): Promise<Book | null> {
  const { data } = await supabase
    .from("daily_challenges")
    .select("books(*)")
    .eq("challenge_date", date)
    .eq("mode", modeKey)
    .maybeSingle();
  return (data?.books as unknown as Book) ?? null;
}

/**
 * Livro do desafio diário. No Supabase, lê de daily_challenges (populada pelo
 * cron à meia-noite). Se a linha do dia ainda não existir — cron não rodou, ou
 * dev local —, sorteia um livro na hora e registra. O upsert com
 * ignoreDuplicates garante uma única linha por dia; relemos a linha canônica
 * depois para que todos os jogadores vejam o mesmo livro mesmo em concorrência.
 *
 * `lang` filtra o acervo elegível (ex.: só livros em português) — cada idioma
 * tem seu próprio desafio do dia (mode key "daily-pt" / "daily-en"), então o
 * filtro não quebra o "mesmo livro para todos": todos que jogam no mesmo
 * idioma veem o mesmo livro.
 */
export async function getDailyBook(lang: LangFilter = "all"): Promise<Book> {
  const date = todayKey();
  const modeKey = dailyModeKey(lang);

  if (supabaseConfigured()) {
    const supabase = await createClient();

    const existing = await readTodayChallenge(supabase, date, modeKey);
    if (existing) return existing;

    const bookId = await selectDailyBookId(supabase, { modeKey, lang });
    const { error: upsertError } = await supabase
      .from("daily_challenges")
      .upsert(
        { challenge_date: date, mode: modeKey, book_id: bookId },
        { onConflict: "challenge_date,mode", ignoreDuplicates: true }
      );
    if (upsertError) {
      throw new Error(`getDailyBook: falha ao gravar o desafio do dia — ${upsertError.message}`);
    }

    const canonical = await readTodayChallenge(supabase, date, modeKey);
    if (canonical) return canonical;
    throw new Error("getDailyBook: desafio gravado mas não encontrado na releitura");
  }

  const pool =
    lang === "all" ? SEED_BOOKS : SEED_BOOKS.filter((b) => b.language === LANG_LABEL[lang]);
  const list = pool.length > 0 ? pool : SEED_BOOKS;
  return list[dailyIndexFor(`${date}:${modeKey}`, list.length)];
}
