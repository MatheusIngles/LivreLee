/**
 * Definição de um modo de jogo. TODO modo é apenas configuração: para adicionar
 * um modo novo, acrescente um objeto em registry.ts. O player genérico, a API
 * de round e a de palpite leem estes campos e se comportam de acordo — nenhuma
 * página ou rota nova é necessária.
 */

/** O que o jogador tenta adivinhar. */
export type GuessType = "book" | "author";

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

/** Qual comparação o servidor aplica ao palpite. */
export type CompareKind =
  | "book" // grade completa estilo Loldle
  | "book:year" // só idade
  | "book:pages" // só páginas
  | "book:sales" // só vendas
  | "author"; // grade de atributos do autor

export type ModeGroup = "comparação" | "pistas" | "autor" | "especial";

export interface ModeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
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
  /** Evento ativo (tema visual), quando houver. */
  event?: { slug: string; name: string; theme: string | null } | null;
}
