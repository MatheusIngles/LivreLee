/** Tipos do conteúdo curado que alimenta os modos não-comparativos. */

export type QuoteKind = "quote" | "opening" | "closing" | "character";

export interface QuoteRow {
  book_id: number;
  text: string;
  kind: QuoteKind;
  speaker: string | null;
  chapter: string | null;
  page: number | null;
  language: string | null;
  context: string | null;
}

export interface CharacterRow {
  book_id: number;
  name: string;
  description: string | null;
}

export interface ChapterRow {
  book_id: number;
  name: string;
}

export interface AdaptationRow {
  book_id: number;
  title: string;
  /** "filme" | "série" | "animação" etc. */
  kind: string;
  year: number | null;
}

export interface EmojiRow {
  book_id: number;
  emoji: string;
}
