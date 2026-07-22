// Utilidades Wikidata compartilhadas por characters.mjs e adaptations.mjs.
// Wikidata é dado estruturado factual (nomes, datas, relações) sob CC0 — sem
// o risco de direitos autorais que teria raspar trechos de texto de livros
// (por isso não usamos isso para o job de quotes, ver quotes.mjs).

import { fetchJson, sleep } from "./lib.mjs";

const SPARQL = "https://query.wikidata.org/sparql";
const API = "https://www.wikidata.org/w/api.php";

// Subclasses aceitas de "obra escrita" (romance, livro, obra literária...).
const BOOK_TYPES = new Set(["Q7725634", "Q571", "Q8261", "Q47461344", "Q1279564"]);

async function sparql(query) {
  const url = `${SPARQL}?query=${encodeURIComponent(query)}&format=json`;
  const json = await fetchJson(url, "wikidata");
  return json.results?.bindings ?? [];
}

function qidFrom(uri) {
  return uri?.split("/").pop();
}

/** Busca o item Wikidata de um livro por título (+autor, para desambiguar). */
export async function findBookEntity(title, author) {
  const url = `${API}?action=wbsearchentities&search=${encodeURIComponent(title)}&language=en&type=item&limit=5&format=json`;
  const json = await fetchJson(url, "wikidata");
  const candidates = json.search ?? [];
  if (candidates.length === 0) return null;

  for (const c of candidates) {
    const rows = await sparql(`
      SELECT ?type ?authorLabel WHERE {
        wd:${c.id} wdt:P31 ?type.
        OPTIONAL { wd:${c.id} wdt:P50 ?authorItem. SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }
        FILTER(?type IN (${[...BOOK_TYPES].map((q) => `wd:${q}`).join(", ")}))
      } LIMIT 5
    `);
    if (rows.length === 0) continue;
    if (!author) return c.id;
    const authorMatches = rows.some((r) =>
      r.authorLabel?.value?.toLowerCase().includes(author.toLowerCase().split(" ").pop() ?? "")
    );
    // Sem match de autor não descarta de cara — muitos itens não têm P50
    // preenchido — mas prioriza quem bate.
    if (authorMatches) return c.id;
  }
  return candidates[0].id;
}

/** Personagens principais do livro (propriedade P674, "characters"). */
export async function findCharacters(qid, limit = 6) {
  const rows = await sparql(`
    SELECT ?character ?characterLabel ?characterDescription WHERE {
      wd:${qid} wdt:P674 ?character.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
    } LIMIT ${limit}
  `);
  return rows
    .map((r) => ({
      qid: qidFrom(r.character.value),
      name: r.characterLabel?.value,
      description: r.characterDescription?.value,
    }))
    .filter((c) => c.name && !c.name.startsWith("Q"));
}

/** Adaptações (filme/série/peça) que citam este livro via P144 ("based on"). */
export async function findAdaptations(qid, limit = 6) {
  const rows = await sparql(`
    SELECT ?work ?workLabel ?date ?typeLabel WHERE {
      ?work wdt:P144 wd:${qid}.
      ?work wdt:P31 ?type.
      OPTIONAL { ?work wdt:P577 ?date. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
    } LIMIT ${limit}
  `);
  return rows
    .map((r) => ({
      title: r.workLabel?.value,
      year: r.date?.value ? Number(r.date.value.slice(0, 4)) : null,
      kind: mapKind(r.typeLabel?.value),
    }))
    .filter((a) => a.title && !a.title.startsWith("Q"));
}

function mapKind(typeLabel) {
  const t = (typeLabel ?? "").toLowerCase();
  if (t.includes("série") || t.includes("series") || t.includes("tv")) return "série";
  if (t.includes("peça") || t.includes("play") || t.includes("teatral")) return "peça";
  if (t.includes("jogo") || t.includes("game")) return "jogo";
  return "filme";
}

/** Busca o item Wikidata de uma pessoa (autor) por nome, exigindo P31=Q5 (ser humano). */
export async function findAuthorEntity(name) {
  const url = `${API}?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&limit=5&format=json`;
  const json = await fetchJson(url, "wikidata");
  const candidates = json.search ?? [];
  for (const c of candidates) {
    const rows = await sparql(`
      SELECT ?item WHERE { wd:${c.id} wdt:P31 wd:Q5. } LIMIT 1
    `);
    if (rows.length > 0) return c.id;
  }
  return null;
}

/** País de cidadania (P27) e língua nativa (P103) do autor, com rótulo em pt (fallback en). */
export async function findAuthorNationality(qid) {
  const rows = await sparql(`
    SELECT ?countryLabel ?langLabel WHERE {
      OPTIONAL { wd:${qid} wdt:P27 ?country. }
      OPTIONAL { wd:${qid} wdt:P103 ?lang. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
    } LIMIT 1
  `);
  const row = rows[0];
  return {
    country: row?.countryLabel?.value ?? null,
    nativeLanguage: row?.langLabel?.value ?? null,
  };
}

export const politeDelay = () => sleep(1500);
