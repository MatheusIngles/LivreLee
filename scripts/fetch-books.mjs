// Gera supabase/seed.sql com livros reais da Open Library, limitado a
// PORTUGUÊS e INGLÊS (os dois idiomas com filtro no jogo).
//
// Uso:  node scripts/fetch-books.mjs
//
// A Open Library é aberta e não exige chave. Para cada assunto (gênero),
// buscamos separadamente em inglês (`language=eng`) e português (`language=por`)
// — isso garante que o idioma gravado é o mesmo que a Open Library usou para
// filtrar, em vez de adivinhar a partir da lista de edições (que mistura
// traduções). Ordenamos por nº de edições (proxy de fama), deduplicamos por
// obra e normalizamos os campos que o jogo usa.

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LANG, resolveCountryLanguage } from "./jobs/book-lang.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "supabase", "seed.sql");
const TARGET = 1000;
// Teto por assunto+idioma. Inglês tem corpus muito maior na Open Library, daí
// o peso maior — sem isso o português nunca preenche sua cota.
const PER_SUBJECT_LANG = { eng: 45, por: 20 };
const UA = "LivreLee/0.1 (seed script; contato via github.com/LivreLee)";

// Assunto na Open Library -> rótulo de gênero em PT-BR usado no jogo.
const SUBJECTS = [
  ["fantasy", "Fantasia"],
  ["science_fiction", "Ficção Científica"],
  ["romance", "Romance"],
  ["mystery", "Mistério"],
  ["horror", "Terror"],
  ["thriller", "Suspense"],
  ["historical_fiction", "Ficção Histórica"],
  ["adventure", "Aventura"],
  ["classic_literature", "Clássico"],
  ["fiction", "Ficção"],
  ["poetry", "Poesia"],
  ["biography", "Biografia"],
  ["philosophy", "Filosofia"],
  ["drama", "Drama"],
  ["young_adult_fiction", "Jovem Adulto"],
  ["juvenile_fiction", "Infantojuvenil"],
  ["detective_and_mystery_stories", "Policial"],
  ["short_stories", "Contos"],
  ["comics_and_graphic_novels", "HQ"],
  ["dystopia", "Distopia"],
  ["war_stories", "Guerra"],
  ["humor", "Humor"],
];

const CURRENT_YEAR = new Date().getFullYear();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function difficultyFor(editions) {
  if (editions >= 150) return "easy";
  if (editions >= 40) return "medium";
  if (editions >= 8) return "hard";
  return "impossible";
}

function normalize(doc, genre, langCode) {
  const title = doc.title?.trim();
  const author = doc.author_name?.[0]?.trim();
  const year = doc.first_publish_year;
  if (!title || title.length > 200 || !author) return null;
  if (!year || year < 1000 || year > CURRENT_YEAR) return null;

  const { country, language } = resolveCountryLanguage(author, langCode);
  const editions = doc.edition_count ?? 1;

  return {
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
    popularity: Math.min(editions, 9999),
    difficulty: difficultyFor(editions),
  };
}

async function fetchSubjectLang(subject, langCode, page) {
  const url =
    `https://openlibrary.org/search.json?subject=${encodeURIComponent(subject)}` +
    `&language=${langCode}&sort=editions&page=${page}&limit=100` +
    `&fields=key,title,author_name,first_publish_year,number_of_pages_median,cover_i,language,edition_count`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${subject}/${langCode} p${page}`);
  const json = await res.json();
  return json.docs ?? [];
}

function sqlStr(v) {
  if (v === null || v === undefined) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}
function sqlNum(v) {
  return v === null || v === undefined ? "NULL" : String(v);
}

async function main() {
  const byKey = new Map(); // dedupe por obra
  const seenTitleAuthor = new Set(); // dedupe secundário

  outer: for (const [subject, genre] of SUBJECTS) {
    for (const langCode of Object.keys(LANG)) {
      let added = 0;
      const cap = PER_SUBJECT_LANG[langCode];
      for (let page = 1; page <= 4 && added < cap; page++) {
        let docs;
        try {
          docs = await fetchSubjectLang(subject, langCode, page);
        } catch (err) {
          console.warn(`  ! ${err.message} — pulando`);
          break;
        }
        if (docs.length === 0) break;

        for (const doc of docs) {
          if (added >= cap) break;
          if (byKey.has(doc.key)) continue;
          const book = normalize(doc, genre, langCode);
          if (!book) continue;
          const ta = `${book.title.toLowerCase()}|${book.author.toLowerCase()}`;
          if (seenTitleAuthor.has(ta)) continue;
          seenTitleAuthor.add(ta);
          byKey.set(doc.key, book);
          added++;
        }
        await sleep(300); // gentileza com a API
      }
      console.log(`  ${subject}/${langCode}: +${added} (total ${byKey.size})`);
      if (byKey.size >= TARGET) break outer;
    }
  }

  const books = [...byKey.values()].slice(0, TARGET);
  const enCount = books.filter((b) => b.language === "Inglês").length;
  const ptCount = books.filter((b) => b.language === "Português").length;
  console.log(`\nColetados ${books.length} livros únicos (${enCount} inglês, ${ptCount} português).`);

  const cols =
    "(title, author, year, country, language, genre, pages, cover_url, popularity, difficulty)";
  const lines = [];
  lines.push("-- LivreLee — seed de livros gerado por scripts/fetch-books.mjs");
  lines.push("-- Fonte: Open Library (openlibrary.org). Rode após schema.sql.");
  lines.push("-- Limitado a português e inglês (idiomas com filtro no jogo).");
  lines.push("");

  // Insere em lotes para o arquivo ficar legível e o INSERT não ficar gigante.
  const BATCH = 200;
  for (let i = 0; i < books.length; i += BATCH) {
    const chunk = books.slice(i, i + BATCH);
    lines.push(`insert into public.books ${cols} values`);
    const values = chunk.map((b) => {
      const cells = [
        sqlStr(b.title),
        sqlStr(b.author),
        sqlNum(b.year),
        sqlStr(b.country),
        sqlStr(b.language),
        sqlStr(b.genre),
        sqlNum(b.pages),
        sqlStr(b.cover_url),
        sqlNum(b.popularity),
        sqlStr(b.difficulty),
      ];
      return `  (${cells.join(", ")})`;
    });
    lines.push(values.join(",\n") + ";");
    lines.push("");
  }

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, lines.join("\n"), "utf8");
  console.log(`Escrito: ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
