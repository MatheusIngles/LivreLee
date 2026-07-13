// Job: enriquecimento via Google Books. Preenche sinopse, tags (categorias) e
// páginas dos livros que ainda não têm sinopse. Atualização incremental: só
// mexe em quem está faltando dado, então roda de forma barata e repetida.
//
// A API pública do Google Books não exige chave para volumes baixos; defina
// GOOGLE_BOOKS_KEY para limites maiores.

import { fetchJson, sleep, log, warn } from "./lib.mjs";

const JOB = "google-books";

function query(title, author) {
  const key = process.env.GOOGLE_BOOKS_KEY ? `&key=${process.env.GOOGLE_BOOKS_KEY}` : "";
  const q = `intitle:${title}${author ? `+inauthor:${author}` : ""}`;
  return `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=1&langRestrict=pt${key}`;
}

/** @param {{ supabase: import('@supabase/supabase-js').SupabaseClient, limit?: number }} ctx */
export async function run({ supabase, limit = 50 }) {
  if (!supabase) {
    warn(JOB, "sem credenciais Supabase — pulei.");
    return { skipped: true };
  }

  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, author")
    .is("description", null)
    .limit(limit);
  if (error) throw new Error(error.message);
  if (!books?.length) {
    log(JOB, "nada a enriquecer.");
    return { enriched: 0 };
  }

  let enriched = 0;
  for (const book of books) {
    try {
      const json = await fetchJson(query(book.title, book.author), JOB);
      const info = json.items?.[0]?.volumeInfo;
      if (info?.description) {
        await supabase
          .from("books")
          .update({
            description: info.description.slice(0, 1200),
            tags: Array.isArray(info.categories) ? info.categories.slice(0, 6) : undefined,
            pages: info.pageCount || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("id", book.id);
        enriched++;
      }
    } catch (err) {
      warn(JOB, `falha em "${book.title}": ${err.message}`);
    }
    await sleep(400); // gentileza + evita rate limit
  }
  log(JOB, `${enriched}/${books.length} livros enriquecidos.`);
  return { enriched };
}
