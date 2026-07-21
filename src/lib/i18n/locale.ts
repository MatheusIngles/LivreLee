/**
 * Idioma da INTERFACE (botões, títulos, mensagens) — independente do filtro
 * de idioma do ACERVO de livros (ver lib/lang.ts). São dois conceitos
 * diferentes: dá para jogar em inglês vendo só livros em português, e vice-versa.
 */
export type UiLocale = "pt" | "en";

const KEY = "livrelee:ui-locale";

export function getUiLocale(): UiLocale {
  if (typeof window === "undefined") return "pt";
  const v = localStorage.getItem(KEY);
  return v === "en" ? "en" : "pt";
}

export function setUiLocale(locale: UiLocale) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, locale);
}
