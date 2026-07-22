// Job: primeira/última frase (kind "opening"/"closing") para livros em
// DOMÍNIO PÚBLICO, extraídas do texto integral via Project Gutenberg.
//
// Diferente de citações "famosas" (kind "quote"/"character"), que exigem
// julgamento humano sobre relevância e continuam curadas manualmente, a
// primeira e a última frase são um FATO objetivo sobre o texto — e como o
// Gutenberg só distribui obras cujo copyright já expirou, extrair essas duas
// frases não tem o risco jurídico de raspar trechos de livros protegidos.
//
// Incremental: só processa livros que ainda não têm quote "opening"/"closing".

import { sleep, log, warn } from "./lib.mjs";
import { findGutenbergText, stripBoilerplate, splitParagraphs, looksLikeIndex } from "./gutenberg.mjs";

const JOB = "quotes";

/** Primeiro parágrafo "de prosa" real — pula sumário/títulos/capítulos em maiúsculas. */
function firstParagraph(paragraphs) {
  return paragraphs.find((p) => p.length > 60 && !/^[A-Z0-9\s.,'"-]+$/.test(p) && !looksLikeIndex(p));
}

function lastParagraph(paragraphs) {
  return [...paragraphs].reverse().find((p) => p.length > 30 && !looksLikeIndex(p));
}

/** Corta no limite de palavra (nunca no meio de uma) — algumas frases famosas
 * (ex. a abertura de "A Tale of Two Cities") passam fácil de 220 caracteres. */
function truncateAtWord(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** Corta um parágrafo na 1ª (ou última) frase, para caber como "pista" curta. */
function firstSentence(paragraph) {
  const m = paragraph.match(/^.{10,220}?[.!?](?=\s|$)/s);
  const text = (m ? m[0] : paragraph).replace(/\s+/g, " ").trim();
  return truncateAtWord(text, 220);
}
function lastSentence(paragraph) {
  const sentences = paragraph.match(/[^.!?]+[.!?]+/g) ?? [paragraph];
  const text = sentences[sentences.length - 1].replace(/\s+/g, " ").trim();
  return truncateAtWord(text, 220);
}

/** @param {{ supabase: import('@supabase/supabase-js').SupabaseClient, limit?: number }} ctx */
export async function run({ supabase, limit = 20 }) {
  if (!supabase) {
    warn(JOB, "sem credenciais Supabase — pulei.");
    return { skipped: true };
  }

  const { data: covered } = await supabase.from("quotes").select("book_id").in("kind", ["opening", "closing"]);
  const done = new Set((covered ?? []).map((q) => q.book_id));

  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, author, language")
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
      if (!raw) continue; // não está no domínio público (ou não achamos no Gutenberg) — fica para curadoria manual

      const text = stripBoilerplate(raw);
      const paragraphs = splitParagraphs(text).map((p) => p.replace(/\r?\n/g, " ").trim());

      const opening = firstParagraph(paragraphs);
      const closing = lastParagraph(paragraphs);
      const rows = [];
      if (opening) rows.push({ book_id: book.id, kind: "opening", text: firstSentence(opening), language: book.language });
      if (closing) rows.push({ book_id: book.id, kind: "closing", text: lastSentence(closing), language: book.language });
      if (rows.length === 0) continue;

      const { error: insertError } = await supabase.from("quotes").insert(rows);
      if (insertError) throw new Error(insertError.message);
      added += rows.length;
      log(JOB, `"${book.title}": ${rows.length} frase(s) do domínio público.`);
    } catch (err) {
      warn(JOB, `falha em "${book.title}": ${err.message}`);
    }
  }
  log(JOB, `${added} frases adicionadas em ${candidates.length} livros verificados.`);
  return { added };
}
