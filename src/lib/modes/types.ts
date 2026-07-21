/**
 * Definição de um modo de jogo. TODO modo é apenas configuração: para adicionar
 * um modo novo, acrescente um objeto em registry.ts. O player genérico, a API
 * de round e a de palpite leem estes campos e se comportam de acordo — nenhuma
 * página ou rota nova é necessária.
 */

/** O que o jogador tenta adivinhar. */
export type GuessType = "book" | "author";

/**
 * Mecânica de jogo:
 * - "guess": busca o livro/autor por texto e recebe uma grade de feedback
 *   (comparação de atributos) ou uma pista (frase, emoji, capa...).
 * - "higher-lower": duas cartas de livro lado a lado — uma revelada, outra
 *   com o atributo oculto — e o jogador aposta se o oculto é maior ou menor.
 *   Sem "chute" por texto; o jogo continua em sequência até errar.
 */
export type Mechanic = "guess" | "higher-lower";

/** Atributo numérico do livro usado na mecânica "higher-lower". */
export type StatKey = "year" | "pages" | "sales_estimate";

/** Como o cliente renderiza a pista da rodada. */
export type ClueType =
  | "none" // sem pista visual; a informação vem do próprio feedback
  | "book-title" // mostra o título (Author Mode: adivinhe o autor)
  | "timeline"
  | "cover-zoom"
  | "cover-blur"
  | "cover-silhouette"
  | "synopsis"
  | "tags"
  | "quote"
  | "opening"
  | "closing"
  | "character-quote"
  | "character-name"
  | "character-desc"
  | "chapter"
  | "adaptation"
  | "emoji";

/** De onde o servidor tira o alvo e a pista da rodada. */
export type SourceKind =
  | "book"
  | "quote:quote"
  | "quote:opening"
  | "quote:closing"
  | "quote:character"
  | "character"
  | "chapter"
  | "adaptation"
  | "emoji"
  | "author";

/**
 * Qual comparação o servidor aplica ao palpite (mecânica "guess"). Os modos
 * "higher-lower" (Idade/Páginas/Vendas) não usam isto — jogam por
 * /api/compare/*, então sempre valem "book" aqui.
 */
export type CompareKind = "book" | "author";

export type ModeGroup =
  | "comparação"
  | "frases"
  | "livro"
  | "capa"
  | "outras-pistas"
  | "autor"
  | "especial";

/**
 * Definição de um modo. Não tem `name`/`description` — texto exibido vem
 * sempre do dicionário i18n (src/lib/i18n/dictionaries.ts), indexado por
 * `id`. Isso evita ter o texto duplicado (uma cópia "default" aqui, outra
 * traduzida lá) e força toda tela nova a passar pelo `useI18n()`.
 */
export interface ModeDef {
  id: string;
  emoji: string;
  group: ModeGroup;
  guessType: GuessType;
  clueType: ClueType;
  source: SourceKind;
  compare: CompareKind;
  maxGuesses: number;
  /** A pista revela mais informação a cada erro (capa, timeline). */
  progressive: boolean;
  available: boolean;
  /** Campo do livro exigido para a rodada (ex.: precisa de capa). */
  requires?: "cover_url" | "description";
  /** Só para o Mixed Mode: ids dos modos que ele sorteia. */
  mixOf?: string[];
  /** Mecânica de jogo. Ausente = "guess" (padrão, compatível com todo o resto). */
  mechanic?: Mechanic;
  /** Só para mechanic "higher-lower". */
  statKey?: StatKey;
}

/** Pista enviada ao cliente (nunca contém a resposta). */
export interface RoundPayload {
  mode: string;
  /** Token opaco e assinado que carrega a resposta (stateless, sem sessão). */
  token: string;
  guessType: GuessType;
  clueType: ClueType;
  maxGuesses: number;
  progressive: boolean;
  /** Dados da pista, conforme o clueType. */
  clue: Record<string, unknown>;
  /** Evento ativo (tema visual), quando houver. O nome exibido vem do dicionário i18n, indexado por `slug`. */
  event?: { slug: string; theme: string | null } | null;
}
