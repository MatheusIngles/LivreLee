import type {
  AdaptationRow,
  ChapterRow,
  CharacterRow,
  EmojiRow,
  QuoteRow,
} from "./content-types";

/**
 * Conteúdo curado de demonstração para os modos que dependem de dados além dos
 * atributos do livro (frases, personagens, capítulos, adaptações, emojis).
 *
 * Cobre os livros usados nos exemplos do projeto. Em produção este conteúdo
 * vem do banco (tabelas quotes/characters/...), populado pelos jobs de
 * ingestão. Frases são mantidas curtas (uso como pista de jogo).
 *
 * book_id segue os ids de SEED_BOOKS:
 * 1 Dom Casmurro · 2 O Pequeno Príncipe · 3 Harry Potter · 4 O Senhor dos Anéis
 * 5 1984 · 6 Cem Anos de Solidão · 9 O Hobbit · 10 Orgulho e Preconceito
 * 11 A Menina que Roubava Livros · 12 O Alquimista
 */

export const SEED_QUOTES: QuoteRow[] = [
  // --- frases célebres (Quote Mode) ---
  { book_id: 2, text: "Todas as pessoas crescidas foram um dia crianças.", kind: "quote", speaker: null, chapter: null, page: null, language: "Português", context: "Dedicatória do livro." },
  { book_id: 2, text: "O essencial é invisível aos olhos.", kind: "quote", speaker: "A Raposa", chapter: "XXI", page: null, language: "Português", context: "A raposa ensina seu segredo ao príncipe." },
  { book_id: 4, text: "Nem tudo que reluz é ouro.", kind: "quote", speaker: null, chapter: null, page: null, language: "Português", context: "Verso sobre Aragorn." },
  { book_id: 4, text: "Até as menores pessoas podem mudar o curso do futuro.", kind: "quote", speaker: "Galadriel", chapter: null, page: null, language: "Português", context: null },
  { book_id: 12, text: "Quando você quer algo, todo o universo conspira para que você realize.", kind: "quote", speaker: null, chapter: null, page: null, language: "Português", context: null },
  { book_id: 6, text: "Muitos anos depois, diante do pelotão de fuzilamento...", kind: "quote", speaker: null, chapter: null, page: null, language: "Português", context: "Uma das aberturas mais famosas da literatura." },

  // --- primeira frase (Opening Line Mode) ---
  { book_id: 10, text: "É uma verdade universalmente reconhecida que um homem solteiro e rico precisa de uma esposa.", kind: "opening", speaker: null, chapter: "1", page: 1, language: "Português", context: null },
  { book_id: 9, text: "Numa toca no chão vivia um hobbit.", kind: "opening", speaker: null, chapter: "1", page: 1, language: "Português", context: null },
  { book_id: 1, text: "Uma noite destas, vindo da cidade para o Engenho Novo, encontrei num trem um rapaz.", kind: "opening", speaker: null, chapter: "1", page: 1, language: "Português", context: null },

  // --- última frase (Final Quote Mode) ---
  { book_id: 1, text: "...vem de dentro, e foi Capitú quem lá o pôs.", kind: "closing", speaker: null, chapter: null, page: null, language: "Português", context: null },

  // --- falas de personagem (Character Quote Mode) ---
  { book_id: 3, text: "É leviÔsa, não leviosá!", kind: "character", speaker: "Hermione Granger", chapter: null, page: null, language: "Português", context: "Corrigindo a pronúncia de Rony." },
  { book_id: 4, text: "Você não vai passar!", kind: "character", speaker: "Gandalf", chapter: null, page: null, language: "Português", context: "Enfrentando o Balrog." },
  { book_id: 2, text: "Tu te tornas eternamente responsável por aquilo que cativas.", kind: "character", speaker: "A Raposa", chapter: "XXI", page: null, language: "Português", context: null },
];

export const SEED_CHARACTERS: CharacterRow[] = [
  { book_id: 1, name: "Capitú", description: "Os olhos de ressaca; o grande enigma do romance." },
  { book_id: 1, name: "Bentinho", description: "Narrador ciumento, também chamado Dom Casmurro." },
  { book_id: 2, name: "A Raposa", description: "Ensina o príncipe sobre laços e responsabilidade." },
  { book_id: 2, name: "O Aviador", description: "Narrador que cai no deserto do Saara." },
  { book_id: 3, name: "Hermione Granger", description: "A bruxa mais brilhante de sua geração." },
  { book_id: 3, name: "Harry Potter", description: "O garoto que sobreviveu." },
  { book_id: 3, name: "Rúbeo Hagrid", description: "O guarda-caça meio-gigante de Hogwarts." },
  { book_id: 4, name: "Gandalf", description: "O mago cinzento, guia da Sociedade." },
  { book_id: 4, name: "Frodo Bolseiro", description: "O hobbit portador do Um Anel." },
  { book_id: 4, name: "Gollum", description: "Criatura corrompida pelo Anel; chama-o de 'meu precioso'." },
  { book_id: 5, name: "Winston Smith", description: "Funcionário que ousa pensar contra o Partido." },
  { book_id: 5, name: "Grande Irmão", description: "O rosto onipresente do regime." },
  { book_id: 9, name: "Bilbo Bolseiro", description: "O hobbit que encontra o Anel numa aventura." },
  { book_id: 9, name: "Smaug", description: "O dragão que guarda o tesouro sob a Montanha." },
  { book_id: 10, name: "Elizabeth Bennet", description: "Espirituosa e independente; a segunda filha Bennet." },
  { book_id: 10, name: "Sr. Darcy", description: "Rico e aparentemente orgulhoso cavalheiro." },
  { book_id: 6, name: "José Arcadio Buendía", description: "Patriarca fundador de Macondo." },
  { book_id: 12, name: "Santiago", description: "O jovem pastor em busca de sua Lenda Pessoal." },
];

export const SEED_CHAPTERS: ChapterRow[] = [
  { book_id: 3, name: "O Espelho de Ojesed" },
  { book_id: 3, name: "O Beco Diagonal" },
  { book_id: 9, name: "Uma Festa Inesperada" },
  { book_id: 9, name: "Adivinhas no Escuro" },
  { book_id: 4, name: "Uma Reunião Inesperada" },
];

export const SEED_ADAPTATIONS: AdaptationRow[] = [
  { book_id: 4, title: "O Senhor dos Anéis: O Retorno do Rei", kind: "filme", year: 2003 },
  { book_id: 3, title: "Harry Potter e a Pedra Filosofal", kind: "filme", year: 2001 },
  { book_id: 5, title: "1984", kind: "filme", year: 1984 },
  { book_id: 6, title: "Cem Anos de Solidão", kind: "série", year: 2024 },
  { book_id: 11, title: "A Menina que Roubava Livros", kind: "filme", year: 2013 },
  { book_id: 10, title: "Orgulho e Preconceito", kind: "filme", year: 2005 },
];

export const SEED_EMOJIS: EmojiRow[] = [
  { book_id: 3, emoji: "⚡🧙‍♂️🏰" },
  { book_id: 4, emoji: "💍🌋🧝⚔️" },
  { book_id: 5, emoji: "👁️📺🕵️" },
  { book_id: 2, emoji: "👑🪐🌹🦊" },
  { book_id: 9, emoji: "🧙🐉💰🗺️" },
  { book_id: 12, emoji: "🐑🏜️🔮" },
  { book_id: 10, emoji: "💌🎩💃" },
  { book_id: 1, emoji: "👁️💔🌊" },
  { book_id: 6, emoji: "🏘️🦋♾️" },
  { book_id: 11, emoji: "📚💀🇩🇪" },
];
