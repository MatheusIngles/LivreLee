// Job: corrige country/language dos livros via nacionalidade do autor no
// Wikidata. Existe porque o fallback antigo (resolveCountryLanguage em
// book-lang.mjs) supõe country/language a partir do idioma da BUSCA na Open
// Library, não do autor de fato — qualquer autor fora do mapa curado
// AUTHORS acaba rotulado com o país/idioma default de quem fez a busca
// (ver book-lang.mjs). Este job resolve isso perguntando ao Wikidata quem o
// autor realmente é.
//
// Alvo: autores com pelo menos um livro em country='Brasil' e que não estão
// no mapa curado AUTHORS (ou seja, candidatos ao bug do fallback). Corrige
// TODOS os livros daquele autor de uma vez.
//
// O acervo é limitado a português/inglês (ver book-lang.mjs) — o idioma
// nativo do Wikidata só vira "Português" se for de fato português, ou se o
// país de cidadania for lusófono; qualquer outro caso vira "Inglês" (default
// do catálogo, e o mais provável pra a maioria dos autores estrangeiros).

import { findAuthorEntity, findAuthorNationality, politeDelay } from "./wikidata.mjs";
import { AUTHORS } from "./book-lang.mjs";
import { log, warn } from "./lib.mjs";

const JOB = "nationality";

const LUSOPHONE_COUNTRIES = new Set([
  "Brasil", "Portugal", "Angola", "Moçambique", "Cabo Verde",
  "Guiné-Bissau", "Timor-Leste", "São Tomé e Príncipe",
]);

const normalizeAuthor = (name) => name.replace(/[.\s]/g, "").toLowerCase();
const CURATED = new Set(Object.keys(AUTHORS).map(normalizeAuthor));

// Wikidata às vezes devolve o Estado histórico exato de quando o autor
// nasceu (ex: "Grão-Ducado da Toscana" pra alguém nascido antes da unificação
// italiana) — tecnicamente correto, mas inconsistente com o resto do acervo,
// que usa nomes de país modernos.
const HISTORICAL_TO_MODERN = new Map([
  ["Grão-Ducado da Toscana", "Itália"],
  ["Reino da Itália", "Itália"],
  ["Estados Pontifícios", "Itália"],
  ["Reino de Nápoles", "Itália"],
  ["Reino da Prússia", "Alemanha"],
  ["Confederação Germânica", "Alemanha"],
  ["Império Alemão", "Alemanha"],
  ["República de Weimar", "Alemanha"],
  ["Império Austro-Húngaro", "Áustria"],
  ["Arquiducado da Áustria", "Áustria"],
  ["Reino Unido da Grã-Bretanha e Irlanda", "Reino Unido"],
  ["Reino da Grã-Bretanha", "Reino Unido"],
  ["Reino da Inglaterra", "Reino Unido"],
  ["Império Russo", "Rússia"],
  ["União Soviética", "Rússia"],
  ["Reino da França", "França"],
  ["Primeira República Francesa", "França"],
  ["Reino de Espanha", "Espanha"],
  ["Reino de Portugal", "Portugal"],
]);

function normalizeCountry(country) {
  return HISTORICAL_TO_MODERN.get(country) ?? country;
}

function resolveLanguage(nativeLanguageLabel, country) {
  const l = (nativeLanguageLabel ?? "").toLowerCase();
  if (l.includes("portugu")) return "Português";
  if (l.includes("inglês") || l.includes("english")) return "Inglês";
  if (country && LUSOPHONE_COUNTRIES.has(country)) return "Português";
  return "Inglês";
}

/** @param {{ supabase: import('@supabase/supabase-js').SupabaseClient, limit?: number }} ctx */
export async function run({ supabase, limit = 40 }) {
  if (!supabase) {
    warn(JOB, "sem credenciais Supabase — pulei.");
    return { skipped: true };
  }

  const { data: books, error } = await supabase
    .from("books")
    .select("id, author, country")
    .eq("country", "Brasil");
  if (error) throw new Error(error.message);

  const byAuthor = new Map();
  for (const b of books ?? []) {
    if (CURATED.has(normalizeAuthor(b.author))) continue; // já confiável
    if (!byAuthor.has(b.author)) byAuthor.set(b.author, []);
    byAuthor.get(b.author).push(b.id);
  }

  const authors = [...byAuthor.entries()].slice(0, limit);
  if (authors.length === 0) {
    log(JOB, "nada a corrigir.");
    return { fixed: 0 };
  }

  let fixedBooks = 0;
  let fixedAuthors = 0;
  for (const [author, bookIds] of authors) {
    try {
      const qid = await findAuthorEntity(author);
      await politeDelay();
      if (!qid) {
        warn(JOB, `autor não encontrado no Wikidata: "${author}"`);
        continue;
      }

      const { country: rawCountry, nativeLanguage } = await findAuthorNationality(qid);
      await politeDelay();
      if (!rawCountry) {
        warn(JOB, `sem país de cidadania no Wikidata: "${author}"`);
        continue;
      }

      const country = normalizeCountry(rawCountry);
      const language = resolveLanguage(nativeLanguage, country);
      const { error: updateError } = await supabase
        .from("books")
        .update({ country, language, updated_at: new Date().toISOString() })
        .in("id", bookIds);
      if (updateError) throw new Error(updateError.message);

      fixedBooks += bookIds.length;
      fixedAuthors++;
      log(JOB, `"${author}": ${country} / ${language} (${bookIds.length} livro(s)).`);
    } catch (err) {
      warn(JOB, `falha em "${author}": ${err.message}`);
    }
  }
  log(JOB, `${fixedBooks} livros corrigidos, ${fixedAuthors} autores resolvidos (de ${authors.length} candidatos).`);
  return { fixedBooks, fixedAuthors };
}
