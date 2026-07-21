import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getActiveEvent } from "@/lib/events";
import { todayKey } from "@/lib/game";
import { dictionaries } from "@/lib/i18n/dictionaries";

/**
 * Cron de eventos (Vercel Cron): reflete o evento ativo do dia (calculado por
 * calendário em lib/events) na tabela `events`, marcando-o como ativo e os
 * demais como inativos. A jogabilidade não depende disto — é para histórico e
 * relatórios. Protegido por CRON_SECRET.
 */
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
  const event = getActiveEvent();
  const date = todayKey();

  await supabase.from("events").update({ active: false }).eq("active", true);
  const { error } = await supabase.from("events").upsert(
    {
      slug: event.slug,
      // Registro em português por padrão (só para histórico/relatório — a UI
      // sempre traduz pelo slug via dictionaries[locale].events).
      name: dictionaries.pt.events[event.slug],
      kind: event.kind,
      filter_genre: event.filterGenre ?? null,
      theme: event.theme,
      starts_on: date,
      active: true,
    },
    { onConflict: "slug" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, active: event.slug });
}
