import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Chave pública do projeto. O Supabase renomeou "anon key" para "publishable
 * key" nos projetos novos — aceitamos os dois nomes de variável para não
 * quebrar silenciosamente quem copiou o nome mais recente do painel.
 */
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Cliente Supabase para Server Components, Route Handlers e Server Actions. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado a partir de um Server Component — pode ignorar se houver
            // middleware renovando a sessão.
          }
        },
      },
    }
  );
}

/** True quando as variáveis de ambiente do Supabase estão configuradas. */
export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && SUPABASE_ANON_KEY);
}
