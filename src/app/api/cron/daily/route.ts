import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { todayKey } from "@/lib/game";
import { selectDailyBookId } from "@/lib/daily";
import type { LangFilter } from "@/lib/lang";

/**
 * Cron diário (Vercel Cron, ver vercel.json): garante que exista uma linha em
 * daily_challenges para a data de hoje (fuso de Brasília), uma para cada
 * variante de idioma ("daily" = todos, "daily-pt", "daily-en").
 *
 * Protegido pelo header Authorization: Bearer ${CRON_SECRET} — a Vercel
 * envia esse header automaticamente quando CRON_SECRET está definido.
 */

const VARIANTS: { modeKey: string; lang: LangFilter }[] = [
  { modeKey: "daily", lang: "all" },
  { modeKey: "daily-pt", lang: "pt" },
  { modeKey: "daily-en", lang: "en" },
];

async function ensureChallenge(supabase: SupabaseClient, date: string, modeKey: string, lang: LangFilter) {
  const { data: existing } = await supabase
    .from("daily_challenges")
    .select("book_id")
    .eq("challenge_date", date)
    .eq("mode", modeKey)
    .maybeSingle();
  if (existing) return { modeKey, created: false, bookId: existing.book_id };

  const bookId = await selectDailyBookId(supabase, { modeKey, lang });
  await supabase
    .from("daily_challenges")
    .upsert(
      { challenge_date: date, mode: modeKey, book_id: bookId },
      { onConflict: "challenge_date,mode", ignoreDuplicates: true }
    );
  const { data: row } = await supabase
    .from("daily_challenges")
    .select("book_id")
    .eq("challenge_date", date)
    .eq("mode", modeKey)
    .maybeSingle();
  return { modeKey, created: true, bookId: row?.book_id ?? bookId };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }

  const supabase = createServiceClient(url, serviceKey);
  const date = todayKey();

  const results = [];
  for (const v of VARIANTS) {
    try {
      results.push(await ensureChallenge(supabase, date, v.modeKey, v.lang));
    } catch (err) {
      results.push({ modeKey: v.modeKey, error: err instanceof Error ? err.message : "falha" });
    }
  }

  return NextResponse.json({ ok: true, date, results });
}
