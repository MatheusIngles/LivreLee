import type { SupabaseClient } from "@supabase/supabase-js";
import { LANG_LABEL, type LangFilter } from "./lang";

/**
 * Sorteia o id do livro do desafio diário: escolhe aleatoriamente entre os
 * livros que ainda NÃO foram usados como desafio diário (no mesmo modeKey).
 * Quando todo o acervo elegível já rodou, reinicia o ciclo sorteando entre
 * todos. Com filtro de idioma, cada idioma tem seu próprio ciclo — por isso
 * "usados" é escopado por `modeKey` (ex.: "daily-pt"), não só "daily".
 *
 * Observação: busca todos os ids de uma vez. Suficiente para o acervo atual
 * (~1000 livros). Se o catálogo crescer muito, migrar para uma função RPC com
 * `order by random()` no Postgres.
 */
export async function selectDailyBookId(
  client: SupabaseClient,
  opts: { modeKey?: string; lang?: LangFilter } = {}
): Promise<number> {
  const modeKey = opts.modeKey ?? "daily";
  let booksQuery = client.from("books").select("id").limit(5000);
  if (opts.lang && opts.lang !== "all") {
    booksQuery = booksQuery.eq("language", LANG_LABEL[opts.lang]);
  }

  const [{ data: allBooks, error }, { data: used }] = await Promise.all([
    booksQuery,
    client.from("daily_challenges").select("book_id").eq("mode", modeKey),
  ]);

  if (error) throw new Error(`selectDailyBookId: ${error.message}`);
  if (!allBooks?.length) throw new Error("selectDailyBookId: nenhum livro cadastrado");

  const usedIds = new Set((used ?? []).map((r) => r.book_id as number));
  let pool = allBooks.filter((b) => !usedIds.has(b.id));
  if (pool.length === 0) pool = allBooks; // acervo esgotado: recomeça o ciclo

  return pool[Math.floor(Math.random() * pool.length)].id;
}
