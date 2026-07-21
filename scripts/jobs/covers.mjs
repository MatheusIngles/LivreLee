// Job: preenche cover_url para livros que ficaram sem capa na ingestão
// original (nem todo doc da Open Library search tem cover_i). Busca a capa
// por ISBN, e se não achar, pelo par título+autor — mesma API pública usada
// em openlibrary.mjs, sem chave.

import { fetchJson, sleep, log, warn } from "./lib.mjs";

const JOB = "covers";

async function findCoverUrl(book) {
  if (book.isbn) {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${book.isbn}&format=json&jscmd=data`;
    const json = await fetchJson(url, JOB);
    const entry = json[`ISBN:${book.isbn}`];
    if (entry?.cover?.large) return entry.cover.large;
  }
  const q = `title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author)}`;
  const json = await fetchJson(`https://openlibrary.org/search.json?${q}&limit=1&fields=cover_i`, JOB);
  const coverId = json.docs?.[0]?.cover_i;
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
}

/** @param {{ supabase: import('@supabase/supabase-js').SupabaseClient, limit?: number }} ctx */
export async function run({ supabase, limit = 50 }) {
  if (!supabase) {
    warn(JOB, "sem credenciais Supabase — pulei.");
    return { skipped: true };
  }

  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, author, isbn")
    .is("cover_url", null)
    .limit(limit);
  if (error) throw new Error(error.message);
  if (!books?.length) {
    log(JOB, "nada a buscar.");
    return { filled: 0 };
  }

  let filled = 0;
  for (const book of books) {
    try {
      const coverUrl = await findCoverUrl(book);
      if (coverUrl) {
        const { error: updateError } = await supabase
          .from("books")
          .update({ cover_url: coverUrl, updated_at: new Date().toISOString() })
          .eq("id", book.id);
        if (updateError) throw new Error(updateError.message);
        filled++;
      }
    } catch (err) {
      warn(JOB, `falha em "${book.title}": ${err.message}`);
    }
    await sleep(300);
  }
  log(JOB, `${filled}/${books.length} capas preenchidas.`);
  return { filled };
}
