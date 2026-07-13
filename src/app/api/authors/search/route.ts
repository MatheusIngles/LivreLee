import { NextRequest, NextResponse } from "next/server";
import { searchAuthors } from "@/lib/rounds";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    return NextResponse.json(await searchAuthors(q));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro na busca" }, { status: 500 });
  }
}
