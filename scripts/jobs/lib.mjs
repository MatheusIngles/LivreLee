// Utilidades compartilhadas pelos jobs de ingestão.
// Fornece: carregamento de .env.local, cliente Supabase (service role),
// logging estruturado, retry com backoff e fetch de JSON resiliente.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const UA = "LivreLee/0.1 (ingestion; github.com/LivreLee)";

/** Carrega variáveis de .env.local para process.env (sem dependências). */
export function loadEnv() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

/** Cliente Supabase com service role. null se não houver credenciais. */
export function getSupabase() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function log(job, msg) {
  console.log(`[${new Date().toISOString()}] [${job}] ${msg}`);
}
export function warn(job, msg) {
  console.warn(`[${new Date().toISOString()}] [${job}] ⚠ ${msg}`);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Executa fn com até `tries` tentativas e backoff exponencial. */
export async function withRetry(fn, { tries = 3, base = 500, job = "job" } = {}) {
  let lastErr;
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      warn(job, `tentativa ${i}/${tries} falhou: ${err.message}`);
      if (i < tries) await sleep(base * 2 ** (i - 1));
    }
  }
  throw lastErr;
}

/** GET JSON com User-Agent e retry. */
export async function fetchJson(url, job = "fetch") {
  return withRetry(
    async () => {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    { job }
  );
}

export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export { ROOT };
