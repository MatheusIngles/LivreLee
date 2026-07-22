// Job: estimativa de cópias vendidas (sales_estimate), extraída do resumo da
// Wikipedia. Não existe API pública e confiável de vendas reais de livros —
// isto captura o número que a própria Wikipedia cita no resumo do artigo
// (geralmente com fonte própria ali), não uma heurística inventada. Ainda
// assim é um dado de precisão variável (arredondado, desatualizado, ou o
// livro pode nem ter menção de vendas) — usado por decisão consciente do
// projeto, sem fila de revisão humana antes de gravar.
//
// Incremental: só processa livros que ainda não têm sales_estimate.

import { fetchJson, sleep, log, warn } from "./lib.mjs";

const JOB = "sales";
const WIKIPEDIA = "https://en.wikipedia.org/w/api.php";

// Várias formas de citar vendas: "sold over X million copies", "has sold X
// million copies worldwide", "X million copies in print", "X million copies
// sold" etc. Casa qualquer "NÚMERO (million|billion)" que apareça perto de
// "copy/copies", "sold", "sale(s)" ou "print" — mais permissivo que uma frase
// fixa única, pra não perder livros só porque a redação do artigo é diferente.
const SALES_RE =
  /(\d+(?:[.,]\d+)?)\s*(million|billion)\s+(?:cop(?:y|ies)|units)\b|\bsold\s+(?:more than |over |about |approximately |around )?(\d+(?:[.,]\d+)?)\s*(million|billion)\b/gi;

function toMillions(value, unit) {
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return unit?.toLowerCase() === "billion" ? n * 1000 : n;
}

/** Maior valor de vendas mencionado no texto (livros populares às vezes citam
 * números diferentes em seções diferentes — ficamos com o mais alto/recente). */
function extractSales(text) {
  let best = null;
  for (const m of text.matchAll(SALES_RE)) {
    const millions = toMillions(m[1] ?? m[3], m[2] ?? m[4]);
    if (millions != null && (best === null || millions > best)) best = millions;
  }
  return best;
}

async function findSalesEstimate(title, author) {
  const searchUrl =
    `${WIKIPEDIA}?action=query&list=search&format=json` +
    `&srsearch=${encodeURIComponent(`${title} ${author} novel`)}&srlimit=1`;
  const search = await fetchJson(searchUrl, JOB);
  const pageId = search.query?.search?.[0]?.pageid;
  if (!pageId) return null;

  // Texto completo (não só a intro): menções a vendas costumam vir numa seção
  // de "Reception"/"Publication history", não no primeiro parágrafo.
  const extractUrl = `${WIKIPEDIA}?action=query&format=json&prop=extracts&explaintext=1&pageids=${pageId}`;
  const extract = await fetchJson(extractUrl, JOB);
  const text = extract.query?.pages?.[pageId]?.extract ?? "";

  return extractSales(text);
}

/** @param {{ supabase: import('@supabase/supabase-js').SupabaseClient, limit?: number }} ctx */
export async function run({ supabase, limit = 30 }) {
  if (!supabase) {
    warn(JOB, "sem credenciais Supabase — pulei.");
    return { skipped: true };
  }

  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, author")
    .is("sales_estimate", null)
    .order("popularity", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  if (!books?.length) {
    log(JOB, "nada a buscar.");
    return { filled: 0 };
  }

  let filled = 0;
  for (const book of books) {
    try {
      const millions = await findSalesEstimate(book.title, book.author);
      if (millions) {
        const { error: updateError } = await supabase
          .from("books")
          .update({ sales_estimate: millions, updated_at: new Date().toISOString() })
          .eq("id", book.id);
        if (updateError) throw new Error(updateError.message);
        filled++;
        log(JOB, `"${book.title}": ~${millions}M cópias (Wikipedia).`);
      }
    } catch (err) {
      warn(JOB, `falha em "${book.title}": ${err.message}`);
    }
    await sleep(400);
  }
  log(JOB, `${filled}/${books.length} estimativas de vendas preenchidas.`);
  return { filled };
}
