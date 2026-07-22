// Job: nomes de capítulo, extraídos do sumário/índice do texto integral no
// Project Gutenberg — só para livros em DOMÍNIO PÚBLICO (mesmo raciocínio de
// quotes.mjs). O sumário já lista "Capítulo N — Título"; isto é extração
// estrutural de um fato do livro, não geração/curadoria de conteúdo.
//
// Incremental: só processa livros que ainda não têm nenhuma linha em `chapters`.

import { sleep, log, warn } from "./lib.mjs";
import { findGutenbergText, stripBoilerplate, splitParagraphs, looksLikeIndex } from "./gutenberg.mjs";

const JOB = "chapters";
const MAX_CHAPTERS = 15;

// "CHAPTER I—START IN LIFE", "Chapter 1 The Period", "LETTER 4" (sem título)...
const ENTRY_RE = /^\s*(?:chapter|letter|book|volume|part)\s+[0-9ivxlcdm]+\s*[.:—-]*\s*(.*)$/i;

function titleCase(s) {
  // Só maiúscula depois de início/espaço/traço — nunca depois de apóstrofo
  // (senão "Man's Foot" vira "Man’S Foot").
  return s.toLowerCase().replace(/(^|[\s\-—])(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase());
}

/** Uma entrada por linha do parágrafo de sumário — extrai só a parte do título. */
function parseIndex(indexParagraph) {
  const lines = indexParagraph
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const names = [];
  for (const line of lines) {
    const m = line.match(ENTRY_RE);
    const title = m?.[1]?.trim().replace(/\.+$/, "");
    if (!title || title.length < 3) continue; // só o número, sem título de verdade
    names.push(/\p{Ll}/u.test(title) ? title : titleCase(title));
    if (names.length >= MAX_CHAPTERS) break;
  }
  return names;
}

/** @param {{ supabase: import('@supabase/supabase-js').SupabaseClient, limit?: number }} ctx */
export async function run({ supabase, limit = 20 }) {
  // Livros sem sumário utilizável (fora do Gutenberg, ou TOC sem títulos —
  // caso do Frankenstein) nunca entram em `chapters`, então continuam na
  // "fila" pra sempre — um limite maior aqui compensa esse desperdício e
  // ainda alcança livros novos a cada run.
  if (!supabase) {
    warn(JOB, "sem credenciais Supabase — pulei.");
    return { skipped: true };
  }

  const { data: covered } = await supabase.from("chapters").select("book_id");
  const done = new Set((covered ?? []).map((c) => c.book_id));

  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, author")
    .order("popularity", { ascending: false })
    .limit(limit + done.size);
  if (error) throw new Error(error.message);

  const candidates = (books ?? []).filter((b) => !done.has(b.id)).slice(0, limit);
  if (candidates.length === 0) {
    log(JOB, "nada a buscar.");
    return { added: 0 };
  }

  let added = 0;
  for (const book of candidates) {
    try {
      const raw = await findGutenbergText(book.title, book.author);
      await sleep(500);
      if (!raw) continue; // não está no domínio público (ou não achamos no Gutenberg)

      const text = stripBoilerplate(raw);
      const indexParagraph = splitParagraphs(text).find(looksLikeIndex);
      if (!indexParagraph) continue; // sumário não identificado nesse formato

      const names = parseIndex(indexParagraph);
      if (names.length === 0) continue;

      const rows = names.map((name, i) => ({ book_id: book.id, name, ordinal: i + 1 }));
      const { error: insertError } = await supabase.from("chapters").insert(rows);
      if (insertError) throw new Error(insertError.message);
      added += rows.length;
      log(JOB, `"${book.title}": ${rows.length} capítulo(s).`);
    } catch (err) {
      warn(JOB, `falha em "${book.title}": ${err.message}`);
    }
  }
  log(JOB, `${added} capítulos adicionados em ${candidates.length} livros verificados.`);
  return { added };
}
