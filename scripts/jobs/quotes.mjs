// Job: primeira/última frase (kind "opening"/"closing") para livros em
// DOMÍNIO PÚBLICO, extraídas do texto integral via Project Gutenberg
// (Gutendex, https://gutendex.com — API pública de metadados do Gutenberg).
//
// Diferente de citações "famosas" (kind "quote"/"character"), que exigem
// julgamento humano sobre relevância e continuam curadas manualmente, a
// primeira e a última frase são um FATO objetivo sobre o texto — e como o
// Gutenberg só distribui obras cujo copyright já expirou, extrair essas duas
// frases não tem o risco jurídico de raspar trechos de livros protegidos.
//
// Incremental: só processa livros que ainda não têm quote "opening"/"closing".

import { fetchJson, sleep, log, warn } from "./lib.mjs";

const JOB = "quotes";
const GUTENDEX = "https://gutendex.com/books";

function lastNameOf(author) {
  return author?.trim().split(" ").pop()?.toLowerCase() ?? "";
}

async function findGutenbergText(title, author) {
  const json = await fetchJson(`${GUTENDEX}?search=${encodeURIComponent(title)}`, JOB);
  const surname = lastNameOf(author);
  const match = (json.results ?? []).find((b) =>
    b.authors?.some((a) => lastNameOf(a.name.split(",").reverse().join(" ")) === surname)
  );
  if (!match) return null;

  const url = match.formats?.["text/plain; charset=utf-8"] ?? match.formats?.["text/plain"];
  if (!url) return null;

  const res = await fetch(url);
  if (!res.ok) return null;
  return res.text();
}

/** Remove o cabeçalho/rodapé padrão do Gutenberg, deixando só o texto da obra. */
function stripBoilerplate(raw) {
  const startMatch = raw.match(/\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i);
  const endMatch = raw.match(/\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i);
  const start = startMatch ? startMatch.index + startMatch[0].length : 0;
  const end = endMatch ? endMatch.index : raw.length;
  return raw.slice(start, end);
}

/** Primeiro parágrafo "de prosa" real — pula sumário/títulos/capítulos em maiúsculas. */
function firstParagraph(paragraphs) {
  return paragraphs.find((p) => p.length > 60 && !/^[A-Z0-9\s.,'"-]+$/.test(p));
}

function lastParagraph(paragraphs) {
  return [...paragraphs].reverse().find((p) => p.length > 30);
}

/** Corta um parágrafo na 1ª (ou última) frase, para caber como "pista" curta. */
function firstSentence(paragraph) {
  const m = paragraph.match(/^.{10,220}?[.!?](?=\s|$)/s);
  return (m ? m[0] : paragraph.slice(0, 200)).replace(/\s+/g, " ").trim();
}
function lastSentence(paragraph) {
  const sentences = paragraph.match(/[^.!?]+[.!?]+/g) ?? [paragraph];
  return sentences[sentences.length - 1].replace(/\s+/g, " ").trim().slice(0, 220);
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
      const paragraphs = text
        .split(/\r?\n\s*\r?\n/)
        .map((p) => p.replace(/\r?\n/g, " ").trim())
        .filter(Boolean);

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
