/** Filtro de idioma do acervo, compartilhado entre cliente e servidor. */
export type LangFilter = "all" | "pt" | "en";

/** Valor da coluna `books.language` correspondente a cada filtro. */
export const LANG_LABEL: Record<Exclude<LangFilter, "all">, string> = {
  pt: "Português",
  en: "Inglês",
};

export function parseLangFilter(v: string | null | undefined): LangFilter {
  return v === "pt" || v === "en" ? v : "all";
}
