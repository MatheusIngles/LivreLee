// Job: adaptações (filme/série/peça/jogo) via Wikidata (livros que apontam
// para este via P144 "based on"). Mesmo raciocínio de characters.mjs: dado
// estruturado (título + ano + tipo), sem texto de terceiros.
//
// Incremental: só processa livros que ainda não têm nenhuma linha em
// `adaptations`.

import { findBookEntity, findAdaptations, politeDelay } from "./wikidata.mjs";
import { log, warn } from "./lib.mjs";

const JOB = "adaptations";

/** @param {{ supabase: import('@supabase/supabase-js').SupabaseClient, limit?: number }} ctx */
export async function run({ supabase, limit = 30 }) {
  if (!supabase) {
    warn(JOB, "sem credenciais Supabase — pulei.");
    return { skipped: true };
  }

  const { data: withAdapt } = await supabase.from("adaptations").select("book_id");
  const covered = new Set((withAdapt ?? []).map((a) => a.book_id));

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

      const adaptations = await findAdaptations(qid);
      await politeDelay();
      if (adaptations.length === 0) continue;

      const { error: insertError } = await supabase.from("adaptations").insert(
        adaptations.map((a) => ({
          book_id: book.id,
          title: a.title,
          kind: a.kind,
          year: a.year,
        }))
      );
      if (insertError) throw new Error(insertError.message);
      added += adaptations.length;
      log(JOB, `"${book.title}": ${adaptations.length} adaptação(ões).`);
    } catch (err) {
      warn(JOB, `falha em "${book.title}": ${err.message}`);
    }
  }
  log(JOB, `${added} adaptações adicionadas em ${candidates.length} livros.`);
  return { added };
}
