import { NextRequest, NextResponse } from "next/server";
import { searchBooks } from "@/lib/data";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    const results = await searchBooks(q);
    return NextResponse.json(results);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro na busca" }, { status: 500 });
  }
}
