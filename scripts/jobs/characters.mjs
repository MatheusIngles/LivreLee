// Job: personagens principais via Wikidata (propriedade P674). Dado
// estruturado (nome + descrição curta factual), não texto de livro — não tem
// o problema de direitos autorais de citações em massa.
//
// Incremental: só processa livros que ainda não têm nenhuma linha em
// `characters`, então repetir a execução é barato.

import { findBookEntity, findCharacters, politeDelay } from "./wikidata.mjs";
import { log, warn } from "./lib.mjs";

const JOB = "characters";

/** @param {{ supabase: import('@supabase/supabase-js').SupabaseClient, limit?: number }} ctx */
export async function run({ supabase, limit = 30 }) {
  if (!supabase) {
    warn(JOB, "sem credenciais Supabase — pulei.");
    return { skipped: true };
  }

  const { data: withChars } = await supabase.from("characters").select("book_id");
  const covered = new Set((withChars ?? []).map((c) => c.book_id));

  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, author")
    .order("popularity", { ascending: false })
    .limit(limit + covered.size);
  if (error) throw new Error(error.message);

  const candidates = (books ?? []).filter((b) => !covered.has(b.id)).slice(0, limit);
  if (candidates.length === 0) {
    log(JOB, "nada a buscar.");
    return { added: 0 };
  }

  let added = 0;
  for (const book of candidates) {
    try {
      const qid = await findBookEntity(book.title, book.author);
      await politeDelay();
      if (!qid) continue;

      const characters = await findCharacters(qid);
      await politeDelay();
      if (characters.length === 0) continue;

      const { error: insertError } = await supabase.from("characters").insert(
        characters.map((c) => ({
          book_id: book.id,
          name: c.name,
          description: c.description ?? null,
        }))
      );
      if (insertError) throw new Error(insertError.message);
      added += characters.length;
      log(JOB, `"${book.title}": ${characters.length} personagem(ns).`);
    } catch (err) {
      warn(JOB, `falha em "${book.title}": ${err.message}`);
    }
  }
  log(JOB, `${added} personagens adicionados em ${candidates.length} livros.`);
  return { added };
}
