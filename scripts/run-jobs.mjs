// Runner dos jobs de ingestão / manutenção do banco.
//
//   node scripts/run-jobs.mjs                 # roda o conjunto padrão
//   node scripts/run-jobs.mjs openlibrary     # roda jobs específicos
//   node scripts/run-jobs.mjs --list          # lista os jobs
//
// Cada job é um módulo com `export async function run(ctx)`. Adicionar uma
// nova fonte de dados = criar um arquivo em scripts/jobs/ e registrá-lo aqui.
// O runner cuida de logging, cronometragem e retry por job.

import { getSupabase, log, warn, withRetry } from "./jobs/lib.mjs";
import * as openlibrary from "./jobs/openlibrary.mjs";
import * as googleBooks from "./jobs/google-books.mjs";
import * as covers from "./jobs/covers.mjs";
import * as characters from "./jobs/characters.mjs";
import * as adaptations from "./jobs/adaptations.mjs";
import * as quotes from "./jobs/quotes.mjs";
import * as sales from "./jobs/sales.mjs";

/** Job ainda sem fonte configurada: registrado, à espera de implementação. */
function todoJob(what) {
  return {
    description: `${what} (fonte a configurar)`,
    async run() {
      warn("todo", `job "${what}" ainda não tem fonte configurada — pulando.`);
      return { skipped: true };
    },
  };
}

const JOBS = {
  openlibrary: { description: "Importa livros da Open Library (incremental).", run: openlibrary.run },
  "google-books": { description: "Enriquece sinopse/tags/páginas via Google Books.", run: googleBooks.run },
  covers: { description: "Preenche cover_url faltante via Open Library.", run: covers.run },
  characters: { description: "Personagens principais via Wikidata (P674).", run: characters.run },
  adaptations: { description: "Adaptações (filme/série/...) via Wikidata (P144).", run: adaptations.run },
  quotes: { description: "1ª/última frase via Project Gutenberg (só domínio público).", run: quotes.run },
  sales: { description: "sales_estimate via menção de vendas no resumo da Wikipedia.", run: sales.run },
  "recalc-rankings": todoJob("Recalcular rankings"),
};

const DEFAULT_SET = ["openlibrary", "google-books"];

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--list")) {
    for (const [name, j] of Object.entries(JOBS)) console.log(`  ${name.padEnd(16)} ${j.description}`);
    return;
  }

  const names = args.length ? args : DEFAULT_SET;
  const supabase = getSupabase();
  if (!supabase) {
    warn("runner", "Supabase não configurado (.env.local). Jobs que dependem do banco serão pulados.");
  }

  const ctx = { supabase };
  let failures = 0;
  for (const name of names) {
    const job = JOBS[name];
    if (!job) {
      warn("runner", `job desconhecido: ${name}`);
      failures++;
      continue;
    }
    const started = Date.now();
    log("runner", `▶ iniciando "${name}"`);
    try {
      const result = await withRetry(() => job.run(ctx), { tries: 2, job: name });
      log("runner", `✔ "${name}" concluído em ${Date.now() - started}ms — ${JSON.stringify(result)}`);
    } catch (err) {
      warn("runner", `✗ "${name}" falhou: ${err.message}`);
      failures++;
    }
  }
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
