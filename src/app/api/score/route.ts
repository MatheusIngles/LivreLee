import { NextRequest, NextResponse } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/**
 * Ranking anônimo. Sem contas: o resultado é gravado com o client_id (UUID do
 * navegador). POST registra o resultado do dia; GET devolve o ranking do modo.
 * Se o Supabase não estiver configurado, vira no-op (o jogo funciona sem
 * ranking global).
 */

export async function POST(req: NextRequest) {
  if (!supabaseConfigured()) return NextResponse.json({ ok: false, reason: "sem banco" });

  let body: {
    clientId?: string;
    mode?: string;
    date?: string;
    guesses?: number;
    won?: boolean;
    durationSeconds?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!body.clientId || !body.mode || typeof body.won !== "boolean") {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("scores").upsert(
    {
      client_id: body.clientId,
      mode: body.mode,
      challenge_date: body.date ?? null,
      guesses: body.guesses ?? 0,
      won: body.won,
      duration_seconds: body.durationSeconds ?? null,
    },
    { onConflict: "client_id,mode,challenge_date", ignoreDuplicates: true }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  if (!supabaseConfigured()) return NextResponse.json({ ranking: [], configured: false });

  const mode = req.nextUrl.searchParams.get("mode") ?? "daily";
  const date = req.nextUrl.searchParams.get("date");
  const supabase = await createClient();

  let q = supabase
    .from("scores")
    .select("guesses, won, duration_seconds")
    .eq("mode", mode)
    .eq("won", true)
    .order("guesses", { ascending: true })
    .order("duration_seconds", { ascending: true })
    .limit(100);
  if (date) q = q.eq("challenge_date", date);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Agrega em distribuição por nº de tentativas (ranking anônimo agregado).
  const dist: Record<number, number> = {};
  for (const row of data ?? []) dist[row.guesses] = (dist[row.guesses] ?? 0) + 1;
  return NextResponse.json({ configured: true, total: data?.length ?? 0, distribution: dist });
}
