import type { UiLocale } from "./locale";

export interface ModeText {
  name: string;
  description: string;
  /** Só para os modos "maior ou menor" (Idade/Páginas/Vendas). */
  statLabel?: string;
}

export interface AchievementText {
  name: string;
  description: string;
}

/** Grupos de conquistas (ids estáveis; o rótulo exibido vem do dicionário). */
export type AchievementGroupId = "first-steps" | "progression" | "streaks" | "challenges";

export interface Dictionary {
  common: {
    back: string;
    share: string;
    copied: string;
    achievementUnlocked: string;
  };
  home: {
    tagline: (n: number) => string;
    eventActive: string;
    achievementsLink: string;
    bookLanguageLabel: string;
    uiLanguageLabel: string;
    langAll: string;
    /** Rótulo curto para telas pequenas (evita quebra de linha no seletor). */
    langAllShort: string;
    langPt: string;
    langEn: string;
    groups: {
      comparação: string;
      frases: string;
      livro: string;
      "outras-pistas": string;
      capa: string;
      autor: string;
      especial: string;
    };
    footer: string;
  };
  play: {
    modeNotFound: string;
    backToHome: string;
    loadingRound: string;
    notEnoughContent: string;
    couldNotLoadRound: string;
    couldNotSubmitGuess: string;
    attemptsRemaining: (n: number) => string;
    wonMessage: (n: number) => string;
    lostMessageDaily: string;
    lostMessageOther: string;
    newRound: string;
  };
  guessRow: {
    author: string;
    year: string;
    country: string;
    language: string;
    genre: string;
    pages: string;
    sales: string;
    firstWork: string;
  };
  clue: {
    whoWrote: string;
    famousQuote: string;
    firstLine: string;
    lastLine: string;
    someoneSaid: string;
    whichBookCharacter: string;
    character: string;
    chapterName: string;
    adaptationOf: (kind: string) => string;
    whichBookEmoji: string;
    synopsis: string;
    keywords: string;
    clues: string;
    publishedOn: string;
    noCover: string;
    whichBookCover: string;
    coverLightening: string;
    onlySilhouette: string;
  };
  searchBox: {
    roundEnded: string;
    typeBookOrAuthor: string;
    typeAuthorName: string;
  };
  compare: {
    sequence: string;
    best: string;
    /** Uma frase natural por atributo — "mais X" não flexiona bem para todo statKey (ex.: ano). */
    hints: { year: string; pages: string; sales_estimate: string };
    correct: string;
    wrongContinues: string;
    notEnoughBooks: string;
    loadingRound: string;
    biggerBadge: string;
  };
  achievements: {
    title: string;
    stats: { xp: string; correct: string; dailyStreak: string; achievements: string };
    groups: Record<AchievementGroupId, string>;
  };
  modes: Record<string, ModeText>;
  achievementDefs: Record<string, AchievementText>;
  events: Record<string, string>;
}

const modesPt: Record<string, ModeText> = {
  daily: { name: "Diário", description: "Um livro por dia, igual para todos. Dicas a cada palpite." },
  unlimited: { name: "Ilimitado", description: "Livros infinitos, sem limite de partidas." },
  age: { name: "Idade do Livro", description: "Um livro é revelado; o próximo é mais antigo ou mais recente?", statLabel: "Publicado em" },
  pages: { name: "Número de Páginas", description: "Um livro é revelado; o próximo tem mais ou menos páginas?", statLabel: "Páginas" },
  sales: { name: "Vendas", description: "Um livro é revelado; o próximo vendeu mais ou menos cópias?", statLabel: "Cópias vendidas (milhões)" },
  quote: { name: "Frase", description: "De qual livro é esta frase?" },
  opening: { name: "Primeira Frase", description: "Adivinhe o livro pela sua primeira frase." },
  closing: { name: "Última Frase", description: "Adivinhe o livro pela sua última frase." },
  "character-quote": { name: "Fala de Personagem", description: "De qual livro é esta fala?" },
  character: { name: "Personagem", description: "Adivinhe o livro pela descrição de um personagem." },
  "book-by-character": { name: "Livro pelo Personagem", description: "Dado o nome de um personagem, qual é o livro?" },
  chapter: { name: "Capítulo", description: "Adivinhe o livro pelo nome de um capítulo." },
  adaptation: { name: "Adaptação", description: "Qual livro deu origem a esta adaptação?" },
  emoji: { name: "Emoji", description: "Adivinhe o livro representado pelos emojis." },
  synopsis: { name: "Sinopse", description: "Adivinhe o livro por uma pequena sinopse." },
  tags: { name: "Tags", description: "Adivinhe o livro por palavras-chave." },
  timeline: { name: "Timeline", description: "Pistas sobre ano, país e gênero, uma de cada vez." },
  cover: { name: "Capa (Zoom)", description: "A capa aparece com zoom; abre mais a cada erro." },
  blur: { name: "Capa Borrada", description: "A capa começa borrada e vai clareando a cada erro." },
  silhouette: { name: "Silhueta", description: "Só a silhueta da capa; detalhes surgem a cada erro." },
  author: { name: "Autor", description: "Mostramos o título; você descobre quem escreveu." },
  "author-guess": { name: "Adivinhe o Autor", description: "Compare país, idioma, época e gênero até descobrir quem é." },
  mixed: { name: "Misto", description: "Cada rodada sorteia um modo diferente." },
};

const modesEn: Record<string, ModeText> = {
  daily: { name: "Daily", description: "One book a day, the same for everyone. Clues with every guess." },
  unlimited: { name: "Unlimited", description: "Infinite books, no limit on plays." },
  age: { name: "Book Age", description: "One book is revealed; is the next one older or newer?", statLabel: "Published in" },
  pages: { name: "Page Count", description: "One book is revealed; does the next one have more or fewer pages?", statLabel: "Pages" },
  sales: { name: "Sales", description: "One book is revealed; did the next one sell more or fewer copies?", statLabel: "Copies sold (millions)" },
  quote: { name: "Quote", description: "Which book is this quote from?" },
  opening: { name: "Opening Line", description: "Guess the book by its opening line." },
  closing: { name: "Final Line", description: "Guess the book by its final line." },
  "character-quote": { name: "Character Quote", description: "Which book is this line from?" },
  character: { name: "Character", description: "Guess the book from a character's description." },
  "book-by-character": { name: "Book by Character", description: "Given a character's name, which book is it?" },
  chapter: { name: "Chapter", description: "Guess the book by a chapter's name." },
  adaptation: { name: "Adaptation", description: "Which book inspired this adaptation?" },
  emoji: { name: "Emoji", description: "Guess the book represented by the emojis." },
  synopsis: { name: "Synopsis", description: "Guess the book from a short synopsis." },
  tags: { name: "Tags", description: "Guess the book by its keywords." },
  timeline: { name: "Timeline", description: "Clues about year, country and genre, one at a time." },
  cover: { name: "Cover (Zoom)", description: "The cover appears zoomed in; it widens with every miss." },
  blur: { name: "Blurred Cover", description: "The cover starts blurred and clears with every miss." },
  silhouette: { name: "Silhouette", description: "Only the cover's silhouette; details emerge with every miss." },
  author: { name: "Author", description: "We show the title; you figure out who wrote it." },
  "author-guess": { name: "Guess the Author", description: "Compare country, language, era and genre until you figure out who it is." },
  mixed: { name: "Mixed", description: "Each round picks a different mode at random." },
};

const achievementsPt: Record<string, AchievementText> = {
  "primeiro-acerto": { name: "Primeiro acerto", description: "Acerte um livro pela primeira vez." },
  "primeira-vitoria-diaria": { name: "Primeira vitória diária", description: "Vença o desafio diário." },
  "primeiro-modo": { name: "Primeiro modo concluído", description: "Vença qualquer modo." },
  "acertos-10": { name: "10 acertos", description: "Acumule 10 acertos." },
  "acertos-50": { name: "50 acertos", description: "Acumule 50 acertos." },
  "acertos-100": { name: "100 acertos", description: "Acumule 100 acertos." },
  "acertos-500": { name: "500 acertos", description: "Acumule 500 acertos." },
  "acertos-1000": { name: "1000 acertos", description: "Acumule 1000 acertos." },
  "streak-7": { name: "7 dias seguidos", description: "Vença o diário 7 dias seguidos." },
  "streak-30": { name: "30 dias seguidos", description: "Vença o diário 30 dias seguidos." },
  "streak-100": { name: "100 dias seguidos", description: "Vença o diário 100 dias seguidos." },
  "acertos-seguidos-20": { name: "20 seguidos", description: "Acerte 20 partidas seguidas." },
  "de-primeira": { name: "Acertar de primeira", description: "Vença no primeiro palpite." },
  "sem-dicas": { name: "Sem dicas", description: "Vença sem usar nenhuma dica." },
  "so-pela-frase": { name: "Só pela frase", description: "Vença o modo Frase." },
  "so-pelos-emojis": { name: "Só pelos emojis", description: "Vença o modo Emoji." },
  "capa-primeiro-zoom": { name: "Olho de águia", description: "Acerte a capa no primeiro zoom." },
  "todos-os-modos": { name: "Poliglota dos modos", description: "Vença todos os modos ao menos uma vez." },
};

const achievementsEn: Record<string, AchievementText> = {
  "primeiro-acerto": { name: "First correct guess", description: "Guess a book correctly for the first time." },
  "primeira-vitoria-diaria": { name: "First daily win", description: "Win the daily challenge." },
  "primeiro-modo": { name: "First mode completed", description: "Win any mode." },
  "acertos-10": { name: "10 correct guesses", description: "Reach 10 correct guesses." },
  "acertos-50": { name: "50 correct guesses", description: "Reach 50 correct guesses." },
  "acertos-100": { name: "100 correct guesses", description: "Reach 100 correct guesses." },
  "acertos-500": { name: "500 correct guesses", description: "Reach 500 correct guesses." },
  "acertos-1000": { name: "1000 correct guesses", description: "Reach 1000 correct guesses." },
  "streak-7": { name: "7-day streak", description: "Win the daily 7 days in a row." },
  "streak-30": { name: "30-day streak", description: "Win the daily 30 days in a row." },
  "streak-100": { name: "100-day streak", description: "Win the daily 100 days in a row." },
  "acertos-seguidos-20": { name: "20 in a row", description: "Get 20 games right in a row." },
  "de-primeira": { name: "First-try win", description: "Win on your very first guess." },
  "sem-dicas": { name: "No hints", description: "Win without using any hint." },
  "so-pela-frase": { name: "Just from the quote", description: "Win the Quote mode." },
  "so-pelos-emojis": { name: "Just from emojis", description: "Win the Emoji mode." },
  "capa-primeiro-zoom": { name: "Eagle eye", description: "Guess the cover on the very first zoom." },
  "todos-os-modos": { name: "Master of all modes", description: "Win every mode at least once." },
};

const eventsPt: Record<string, string> = {
  "semana-fantasia": "Semana da Fantasia",
  "semana-romance": "Semana do Romance",
  "semana-ficcao-cientifica": "Semana da Ficção Científica",
  "semana-terror": "Semana do Terror",
  "semana-misterio": "Semana do Mistério",
  "semana-classicos": "Semana dos Clássicos",
  "semana-brasil": "Semana da Literatura Brasileira",
  halloween: "Halloween",
  "dia-das-criancas": "Dia das Crianças",
  "black-friday": "Black Friday",
  natal: "Natal",
  "ano-novo": "Ano Novo",
  "dia-mundial-do-livro": "Dia Mundial do Livro",
};

const eventsEn: Record<string, string> = {
  "semana-fantasia": "Fantasy Week",
  "semana-romance": "Romance Week",
  "semana-ficcao-cientifica": "Sci-Fi Week",
  "semana-terror": "Horror Week",
  "semana-misterio": "Mystery Week",
  "semana-classicos": "Classics Week",
  "semana-brasil": "Brazilian Literature Week",
  halloween: "Halloween",
  "dia-das-criancas": "Children's Day",
  "black-friday": "Black Friday",
  natal: "Christmas",
  "ano-novo": "New Year",
  "dia-mundial-do-livro": "World Book Day",
};

export const dictionaries: Record<UiLocale, Dictionary> = {
  pt: {
    common: {
      back: "voltar",
      share: "Compartilhar",
      copied: "Copiado!",
      achievementUnlocked: "Conquista desbloqueada!",
    },
    home: {
      tagline: (n) => `Adivinhe livros de ${n} formas diferentes. Sem cadastro — é só jogar.`,
      eventActive: "Evento ativo",
      achievementsLink: "Ver conquistas e estatísticas",
      bookLanguageLabel: "Idioma dos livros",
      uiLanguageLabel: "Idioma da interface",
      langAll: "Todos os idiomas",
      langAllShort: "Todos",
      langPt: "Português",
      langEn: "Inglês",
      groups: {
        comparação: "Comparação",
        frases: "Frases",
        livro: "Adivinhe pelo Livro",
        "outras-pistas": "Outras Pistas",
        capa: "Capa",
        autor: "Autor",
        especial: "Especial",
      },
      footer: "Um jogo diário para quem ama livros.",
    },
    play: {
      modeNotFound: "Modo não encontrado. 🤔",
      backToHome: "voltar ao início",
      loadingRound: "Carregando rodada…",
      notEnoughContent: "Este modo ainda não tem conteúdo suficiente. Volte em breve!",
      couldNotLoadRound: "Não foi possível carregar a rodada.",
      couldNotSubmitGuess: "Não foi possível enviar o palpite.",
      attemptsRemaining: (n) => `${n} tentativa${n === 1 ? "" : "s"} restante${n === 1 ? "" : "s"}`,
      wonMessage: (n) => `Acertou em ${n} tentativa${n === 1 ? "" : "s"}!`,
      lostMessageDaily: "Acabaram as tentativas. Volte amanhã!",
      lostMessageOther: "Não foi dessa vez!",
      newRound: "Nova rodada 🎲",
    },
    guessRow: {
      author: "Autor",
      year: "Ano",
      country: "País",
      language: "Idioma",
      genre: "Gênero",
      pages: "Páginas",
      sales: "Vendas",
      firstWork: "1ª obra",
    },
    clue: {
      whoWrote: "Quem escreveu?",
      famousQuote: "Frase célebre",
      firstLine: "Primeira frase",
      lastLine: "Última frase",
      someoneSaid: "Alguém disse…",
      whichBookCharacter: "De qual livro é este personagem?",
      character: "Personagem",
      chapterName: "Nome de um capítulo",
      adaptationOf: (kind) => `Adaptação (${kind})`,
      whichBookEmoji: "Que livro é este?",
      synopsis: "Sinopse",
      keywords: "Palavras-chave",
      clues: "Pistas",
      publishedOn: "Publicado em",
      noCover: "sem capa",
      whichBookCover: "Que livro é esta capa?",
      coverLightening: "A capa vai clareando",
      onlySilhouette: "Só a silhueta",
    },
    searchBox: {
      roundEnded: "Rodada encerrada",
      typeBookOrAuthor: "Digite o título ou autor…",
      typeAuthorName: "Digite o nome do autor…",
    },
    compare: {
      sequence: "Sequência",
      best: "Melhor",
      hints: {
        year: "Clique no livro que você acha que é mais recente.",
        pages: "Clique no livro que você acha que tem mais páginas.",
        sales_estimate: "Clique no livro que você acha que vendeu mais cópias.",
      },
      correct: "Certo! 🎉",
      wrongContinues: "Errou! Mas o jogo continua — nova rodada em instantes.",
      notEnoughBooks: "Este modo ainda não tem livros suficientes para comparar.",
      loadingRound: "Carregando rodada…",
      biggerBadge: "MAIOR",
    },
    achievements: {
      title: "Conquistas",
      stats: { xp: "XP", correct: "Acertos", dailyStreak: "Sequência diária", achievements: "Conquistas" },
      groups: {
        "first-steps": "Primeiros passos",
        progression: "Progressão",
        streaks: "Sequência",
        challenges: "Desafios",
      },
    },
    modes: modesPt,
    achievementDefs: achievementsPt,
    events: eventsPt,
  },
  en: {
    common: {
      back: "back",
      share: "Share",
      copied: "Copied!",
      achievementUnlocked: "Achievement unlocked!",
    },
    home: {
      tagline: (n) => `Guess books ${n} different ways. No sign-up — just play.`,
      eventActive: "Active event",
      achievementsLink: "View achievements and stats",
      bookLanguageLabel: "Book language",
      uiLanguageLabel: "Interface language",
      langAll: "All languages",
      langAllShort: "All",
      langPt: "Portuguese",
      langEn: "English",
      groups: {
        comparação: "Comparison",
        frases: "Quotes",
        livro: "Guess from the Book",
        "outras-pistas": "Other Clues",
        capa: "Cover",
        autor: "Author",
        especial: "Special",
      },
      footer: "A daily game for people who love books.",
    },
    play: {
      modeNotFound: "Mode not found. 🤔",
      backToHome: "back to home",
      loadingRound: "Loading round…",
      notEnoughContent: "This mode doesn't have enough content yet. Check back soon!",
      couldNotLoadRound: "Couldn't load the round.",
      couldNotSubmitGuess: "Couldn't submit the guess.",
      attemptsRemaining: (n) => `${n} attempt${n === 1 ? "" : "s"} remaining`,
      wonMessage: (n) => `Solved in ${n} attempt${n === 1 ? "" : "s"}!`,
      lostMessageDaily: "Out of attempts. Come back tomorrow!",
      lostMessageOther: "Not this time!",
      newRound: "New round 🎲",
    },
    guessRow: {
      author: "Author",
      year: "Year",
      country: "Country",
      language: "Language",
      genre: "Genre",
      pages: "Pages",
      sales: "Sales",
      firstWork: "1st work",
    },
    clue: {
      whoWrote: "Who wrote it?",
      famousQuote: "Famous quote",
      firstLine: "Opening line",
      lastLine: "Final line",
      someoneSaid: "Someone said…",
      whichBookCharacter: "Which book is this character from?",
      character: "Character",
      chapterName: "Name of a chapter",
      adaptationOf: (kind) => `Adaptation (${kind})`,
      whichBookEmoji: "Which book is this?",
      synopsis: "Synopsis",
      keywords: "Keywords",
      clues: "Clues",
      publishedOn: "Published in",
      noCover: "no cover",
      whichBookCover: "Which book is this cover?",
      coverLightening: "The cover is clearing up",
      onlySilhouette: "Only the silhouette",
    },
    searchBox: {
      roundEnded: "Round ended",
      typeBookOrAuthor: "Type the title or author…",
      typeAuthorName: "Type the author's name…",
    },
    compare: {
      sequence: "Streak",
      best: "Best",
      hints: {
        year: "Click the book you think is more recent.",
        pages: "Click the book you think has more pages.",
        sales_estimate: "Click the book you think sold more copies.",
      },
      correct: "Correct! 🎉",
      wrongContinues: "Wrong! But the game goes on — new round in a moment.",
      notEnoughBooks: "This mode doesn't have enough books to compare yet.",
      loadingRound: "Loading round…",
      biggerBadge: "HIGHER",
    },
    achievements: {
      title: "Achievements",
      stats: { xp: "XP", correct: "Correct", dailyStreak: "Daily streak", achievements: "Achievements" },
      groups: {
        "first-steps": "First steps",
        progression: "Progression",
        streaks: "Streaks",
        challenges: "Challenges",
      },
    },
    modes: modesEn,
    achievementDefs: achievementsEn,
    events: eventsEn,
  },
};
