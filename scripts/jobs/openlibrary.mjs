// Job: ingestão incremental de livros da Open Library para o banco.
// Limitado a português e inglês (ver book-lang.mjs), mesma regra do gerador
// de seed offline (scripts/fetch-books.mjs).
//
// Deduplicação: cada livro é gravado com (source='openlibrary', source_key=work
// key). A tabela tem UNIQUE(source, source_key), então re-execuções fazem
// UPSERT — atualizam o que mudou e não duplicam.
//
// Isso só cobre o MESMO source_key — um livro que já está no catálogo com
// source=null (seed antiga) ou um source_key diferente (ex: outra edição da
// mesma obra) não bate no UNIQUE e vira uma linha nova, duplicada por
// título+autor. Por isso, antes de inserir, também filtramos fora qualquer
// candidato cujo (título, autor) já exista na tabela — mesmo vindo de outra
// fonte/edição.

import { fetchJson, sleep, chunk, log, warn } from "./lib.mjs";
import { LANG, resolveCountryLanguage } from "./book-lang.mjs";

const JOB = "openlibrary";
const SUBJECTS = [
  ["fantasy", "Fantasia"], ["science_fiction", "Ficção Científica"],
  ["romance", "Romance"], ["mystery", "Mistério"], ["horror", "Terror"],
  ["historical_fiction", "Ficção Histórica"], ["classic_literature", "Clássico"],
  ["poetry", "Poesia"], ["young_adult_fiction", "Jovem Adulto"],
];

function normalize(doc, genre, langCode) {
  const title = doc.title?.trim();
  const author = doc.author_name?.[0]?.trim();
  const year = doc.first_publish_year;
  if (!title || !author || !year || year < 1000) return null;
  const { country, language } = resolveCountryLanguage(author, langCode);
  return {
    source: "openlibrary",
    source_key: doc.key,
    title,
    author,
    year,
    country,
    language,
    genre,
    pages: doc.number_of_pages_median ?? null,
    cover_url: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : null,
    popularity: Math.min(doc.edition_count ?? 1, 9999),
    updated_at: new Date().toISOString(),
  };
}

/** @param {{ supabase: import('@supabase/supabase-js').SupabaseClient, perSubject?: number }} ctx */
export async function run({ supabase, perSubject = 25 }) {
  if (!supabase) {
    warn(JOB, "sem credenciais Supabase — pulei. Use scripts/fetch-books.mjs p/ gerar seed.sql offline.");
    return { skipped: true };
  }

  const rows = new Map();
  for (const [subject, genre] of SUBJECTS) {
    for (const langCode of Object.keys(LANG)) {
      const url =
        `https://openlibrary.org/search.json?subject=${encodeURIComponent(subject)}` +
        `&language=${langCode}&sort=editions&limit=${perSubject}` +
        `&fields=key,title,author_name,first_publish_year,number_of_pages_median,cover_i,edition_count`;
      const json = await fetchJson(url, JOB);
      for (const doc of json.docs ?? []) {
        const b = normalize(doc, genre, langCode);
        if (b) rows.set(b.source_key, b);
      }
      log(JOB, `${subject}/${langCode}: acumulado ${rows.size}`);
      await sleep(300);
    }
  }

  // livros já catalogados (qualquer fonte) — pra não recriar como duplicata.
  // Uma linha só pode ser ATUALIZADA (mesmo source_key já rastreado); uma
  // linha nova cujo título+autor já existe sob outra fonte/edição é ignorada.
  const trackedKeys = new Set();
  const titleAuthorSeen = new Set();
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from("books").select("source,source_key,title,author").range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const b of data) {
      if (b.source && b.source_key) trackedKeys.add(`${b.source}::${b.source_key}`);
      titleAuthorSeen.add(`${b.title.trim().toLowerCase()}::${b.author.trim().toLowerCase()}`);
    }
    if (data.length < 1000) break;
    from += 1000;
  }

  const candidates = [...rows.values()].filter((b) => {
    if (trackedKeys.has(`openlibrary::${b.source_key}`)) return true; // atualização de linha já rastreada
    return !titleAuthorSeen.has(`${b.title.trim().toLowerCase()}::${b.author.trim().toLowerCase()}`);
  });
  const skipped = rows.size - candidates.length;

  let upserted = 0;
  for (const batch of chunk(candidates, 200)) {
    const { error } = await supabase
      .from("books")
      .upsert(batch, { onConflict: "source,source_key" });
    if (error) throw new Error(error.message);
    upserted += batch.length;
  }
  log(JOB, `upsert de ${upserted} livros concluído (${skipped} já existiam no catálogo, ignorados).`);
  return { upserted, skipped };
}
