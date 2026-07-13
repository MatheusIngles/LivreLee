export type Difficulty = "easy" | "medium" | "hard" | "impossible";

export interface Book {
  id: number;
  title: string;
  original_title: string | null;
  author: string;
  year: number;
  country: string;
  language: string;
  genre: string;
  subgenre: string | null;
  pages: number;
  cover_url: string | null;
  description: string | null;
  popularity: number;
  difficulty: Difficulty;
  /** Vendas aproximadas em milhões de cópias (quando conhecido). */
  sales_estimate: number | null;
  /** Palavras-chave/tags do livro (para o Tags Mode). */
  tags: string[];
}

/** Resultado da comparação de um campo (estilo Loldle). */
export type Cmp = "correct" | "partial" | "wrong";

export interface NumericCmp {
  cmp: Cmp;
  /** "up" = o alvo é maior que o palpite; "down" = menor. */
  dir: "up" | "down" | null;
}

/** Comparação de um palpite de LIVRO (grade estilo Loldle). */
export interface GuessFeedback {
  won: boolean;
  guess: {
    id: number;
    title: string;
    author: string;
    year: number;
    country: string;
    language: string;
    genre: string;
    pages: number;
    sales_estimate: number | null;
    cover_url: string | null;
  };
  fields: {
    author: Cmp;
    year: NumericCmp;
    country: Cmp;
    language: Cmp;
    genre: Cmp;
    pages: NumericCmp;
    sales: NumericCmp;
  };
}

/** Atributos agregados de um autor (derivados de seus livros). */
export interface Author {
  name: string;
  country: string | null;
  language: string | null;
  /** Ano de publicação da obra mais antiga do autor no acervo. */
  first_year: number;
  /** Gênero predominante entre as obras do autor. */
  main_genre: string;
  book_count: number;
}

/** Comparação de um palpite de AUTOR (grade estilo Loldle). */
export interface AuthorGuessFeedback {
  won: boolean;
  guess: {
    name: string;
    country: string | null;
    language: string | null;
    first_year: number;
    main_genre: string;
  };
  fields: {
    country: Cmp;
    language: Cmp;
    first_year: NumericCmp;
    main_genre: Cmp;
  };
}

export interface BookSearchResult {
  id: number;
  title: string;
  author: string;
  cover_url: string | null;
}

export interface AuthorSearchResult {
  name: string;
}
