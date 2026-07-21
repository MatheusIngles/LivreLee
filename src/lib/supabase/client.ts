import { createBrowserClient } from "@supabase/ssr";

/** Cliente Supabase para uso em Client Components (browser). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // O Supabase renomeou "anon key" para "publishable key" nos projetos
    // novos — aceitamos os dois nomes (ver nota equivalente em server.ts).
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!
  );
}
