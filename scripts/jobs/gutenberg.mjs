// Utilidades compartilhadas por jobs que dependem do texto integral de obras
// em DOMÍNIO PÚBLICO via Project Gutenberg (Gutendex, https://gutendex.com).
// Usado por quotes.mjs (1ª/última frase) e chapters.mjs (nomes de capítulo).

import { fetchJson } from "./lib.mjs";

const GUTENDEX = "https://gutendex.com/books";
const JOB = "gutenberg";

function lastNameOf(author) {
  return author?.trim().split(" ").pop()?.toLowerCase() ?? "";
}

/** Texto integral do livro no Gutenberg, ou null (fora do domínio público / sem match). */
export async function findGutenbergText(title, author) {
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
export function stripBoilerplate(raw) {
  const startMatch = raw.match(/\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i);
  const endMatch = raw.match(/\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i);
  const start = startMatch ? startMatch.index + startMatch[0].length : 0;
  const end = endMatch ? endMatch.index : raw.length;
  return raw.slice(start, end);
}

/** Parágrafos separados por linha em branco — newlines internas preservadas
 * de propósito (chapters.mjs precisa delas pra separar as entradas do sumário). */
export function splitParagraphs(text) {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Sumário/índice: várias ocorrências de "Chapter N"/"Letter N"/etc seguidas
 * — aparece logo após o marcador de início, antes da prosa de verdade. */
export function looksLikeIndex(p) {
  const hits = p.match(/\b(chapter|letter|book|volume|part)\s+[0-9ivxlcdm]+\b/gi);
  return (hits?.length ?? 0) >= 3;
}
