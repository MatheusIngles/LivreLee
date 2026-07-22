import { getSupabase } from "./jobs/lib.mjs";

const DRY_RUN = process.argv.includes("--dry-run");

const supabase = getSupabase();
if (!supabase) {
  console.error("sem supabase configurado");
  process.exit(1);
}

async function fetchAll(table, columns) {
  let all = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + step - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < step) break;
    from += step;
  }
  return all;
}

function completeness(b) {
  const fields = [
    "original_title", "year", "country", "language", "genre", "subgenre",
    "publisher", "pages", "cover_url", "description", "isbn", "sales_estimate",
    "series", "rating", "ratings_count", "source",
  ];
  let score = 0;
  for (const f of fields) if (b[f] !== null && b[f] !== undefined && b[f] !== "") score++;
  score += (b.tags?.length || 0) > 0 ? 1 : 0;
  score += (b.collections?.length || 0) > 0 ? 1 : 0;
  return score;
}

// campos da própria tabela books que precisam ser copiados pro vencedor
// antes de apagar o perdedor (senão o dado se perde, já que só tabelas
// filhas são realocadas).
const SCALAR_FIELDS = [
  "original_title", "year", "country", "language", "genre", "subgenre",
  "publisher", "pages", "cover_url", "description", "isbn", "sales_estimate",
  "series", "rating", "ratings_count", "tags", "collections",
];

function mergeScalars(keeper, loser) {
  const patch = {};
  for (const f of SCALAR_FIELDS) {
    const keeperEmpty =
      keeper[f] === null || keeper[f] === undefined || keeper[f] === "" ||
      (Array.isArray(keeper[f]) && keeper[f].length === 0);
    const loserHas =
      loser[f] !== null && loser[f] !== undefined && loser[f] !== "" &&
      !(Array.isArray(loser[f]) && loser[f].length === 0);
    if (keeperEmpty && loserHas) patch[f] = loser[f];
  }
  return patch;
}

async function main() {
  const books = await fetchAll(
    "books",
    "id,title,author,original_title,year,country,language,genre,subgenre,publisher,pages,cover_url,description,isbn,popularity,sales_estimate,tags,collections,series,rating,ratings_count,source,source_key"
  );

  const [quotes, characters, chapters, adaptations, emojis, daily] = await Promise.all([
    fetchAll("quotes", "id,book_id"),
    fetchAll("characters", "id,book_id"),
    fetchAll("chapters", "id,book_id"),
    fetchAll("adaptations", "id,book_id"),
    fetchAll("book_emojis", "id,book_id"),
    fetchAll("daily_challenges", "id,book_id"),
  ]);

  const contentCount = new Map();
  const bump = (id) => contentCount.set(id, (contentCount.get(id) || 0) + 1);
  for (const r of [...quotes, ...characters, ...chapters, ...adaptations, ...emojis]) bump(r.book_id);

  const groups = new Map();
  for (const b of books) {
    const key = `${b.title.trim().toLowerCase()}::${b.author.trim().toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(b);
  }

  const dupGroups = [...groups.values()].filter((g) => g.length > 1);
  console.log(`grupos duplicados: ${dupGroups.length}`);

  let totalDeleted = 0;
  for (const group of dupGroups) {
    const scored = group
      .map((b) => ({
        b,
        content: contentCount.get(b.id) || 0,
        complete: completeness(b),
      }))
      .sort((x, y) => y.content - x.content || y.complete - x.complete || x.b.id - y.b.id);

    const keeper = scored[0].b;
    const losers = scored.slice(1).map((s) => s.b);

    console.log(
      `"${keeper.title}" (${keeper.author}) — mantém id=${keeper.id}; remove: ${losers.map((l) => l.id).join(", ")}`
    );

    if (DRY_RUN) continue;

    let keeperPatched = keeper;
    for (const loser of losers) {
      const patch = mergeScalars(keeperPatched, loser);
      if (Object.keys(patch).length > 0) {
        const { error: patchErr } = await supabase.from("books").update(patch).eq("id", keeper.id);
        if (patchErr) throw patchErr;
        keeperPatched = { ...keeperPatched, ...patch };
      }

      for (const table of ["quotes", "characters", "chapters", "adaptations", "book_emojis"]) {
        const { error } = await supabase.from(table).update({ book_id: keeper.id }).eq("book_id", loser.id);
        if (error) throw error;
      }
      const loserDaily = daily.filter((d) => d.book_id === loser.id);
      for (const d of loserDaily) {
        const { error } = await supabase.from("daily_challenges").delete().eq("id", d.id);
        if (error) throw error;
      }
      const { error: delErr } = await supabase.from("books").delete().eq("id", loser.id);
      if (delErr) throw delErr;
      totalDeleted++;
    }
  }

  console.log(`${DRY_RUN ? "[dry-run] seriam removidas" : "removidas"} ${totalDeleted} linhas duplicadas de books.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
