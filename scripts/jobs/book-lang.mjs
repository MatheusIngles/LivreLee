// Mapas de idioma/país compartilhados pelos scripts de ingestão. O acervo do
// LivreLee é limitado a livros em português e inglês (ver fetch-books.mjs e
// jobs/openlibrary.mjs) — os únicos dois idiomas com filtro no jogo hoje.

/** Código MARC da Open Library -> [nome do idioma em PT-BR, país default]. */
export const LANG = {
  eng: ["Inglês", "Reino Unido"],
  por: ["Português", "Brasil"],
};

/** Only these two are allowed in the seed/ingestion pipeline. */
export const ALLOWED_LANGUAGES = new Set(["Inglês", "Português"]);

/**
 * Nacionalidade de autor conhecida -> [país, idioma em que escreveu]. Usado
 * para preencher o país com precisão (tem precedência sobre o país default
 * do idioma) para os autores mais comuns do acervo.
 */
export const AUTHORS = {
  "William Shakespeare": ["Reino Unido", "Inglês"],
  "Agatha Christie": ["Reino Unido", "Inglês"],
  "Charles Dickens": ["Reino Unido", "Inglês"],
  "L. Frank Baum": ["Estados Unidos", "Inglês"],
  "H. Rider Haggard": ["Reino Unido", "Inglês"],
  "Gilbert Keith Chesterton": ["Reino Unido", "Inglês"],
  "Arthur Conan Doyle": ["Reino Unido", "Inglês"],
  "Lucy Maud Montgomery": ["Canadá", "Inglês"],
  "Louisa May Alcott": ["Estados Unidos", "Inglês"],
  "Rudyard Kipling": ["Reino Unido", "Inglês"],
  "Edith Nesbit": ["Reino Unido", "Inglês"],
  "Andrew Lang": ["Reino Unido", "Inglês"],
  "Mark Twain": ["Estados Unidos", "Inglês"],
  "John Buchan": ["Reino Unido", "Inglês"],
  "Zane Grey": ["Estados Unidos", "Inglês"],
  "Edgar Allan Poe": ["Estados Unidos", "Inglês"],
  "Nathaniel Hawthorne": ["Estados Unidos", "Inglês"],
  "F. Scott Fitzgerald": ["Estados Unidos", "Inglês"],
  "Wilkie Collins": ["Reino Unido", "Inglês"],
  "Jack London": ["Estados Unidos", "Inglês"],
  "Edgar Rice Burroughs": ["Estados Unidos", "Inglês"],
  "J. K. Rowling": ["Reino Unido", "Inglês"],
  "E. M. Forster": ["Reino Unido", "Inglês"],
  "Jane Austen": ["Reino Unido", "Inglês"],
  "Willa Cather": ["Estados Unidos", "Inglês"],
  "G. A. Henty": ["Reino Unido", "Inglês"],
  "Lewis Carroll": ["Reino Unido", "Inglês"],
  "Oscar Wilde": ["Irlanda", "Inglês"],
  "George MacDonald": ["Reino Unido", "Inglês"],
  "Robert Michael Ballantyne": ["Reino Unido", "Inglês"],
  "Thomas Hardy": ["Reino Unido", "Inglês"],
  "Virginia Woolf": ["Reino Unido", "Inglês"],
  "James Fenimore Cooper": ["Estados Unidos", "Inglês"],
  "Theodore Dreiser": ["Estados Unidos", "Inglês"],
  "Ian Fleming": ["Reino Unido", "Inglês"],
  "Robert Louis Stevenson": ["Reino Unido", "Inglês"],
  "Bram Stoker": ["Irlanda", "Inglês"],
  "Washington Irving": ["Estados Unidos", "Inglês"],
  "H. G. Wells": ["Reino Unido", "Inglês"],
  "Herman Melville": ["Estados Unidos", "Inglês"],
  "Henry James": ["Estados Unidos", "Inglês"],
  "Joseph Conrad": ["Reino Unido", "Inglês"],
  "George Eliot": ["Reino Unido", "Inglês"],
  "Charlotte Brontë": ["Reino Unido", "Inglês"],
  "Emily Brontë": ["Reino Unido", "Inglês"],
  "Machado de Assis": ["Brasil", "Português"],
  "Jorge Amado": ["Brasil", "Português"],
  "Paulo Coelho": ["Brasil", "Português"],
  "J. R. R. Tolkien": ["Reino Unido", "Inglês"],
  "C. S. Lewis": ["Reino Unido", "Inglês"],
  "George Orwell": ["Reino Unido", "Inglês"],
  "Aldous Huxley": ["Reino Unido", "Inglês"],
  "Ernest Hemingway": ["Estados Unidos", "Inglês"],
  "John Steinbeck": ["Estados Unidos", "Inglês"],
  "Ray Bradbury": ["Estados Unidos", "Inglês"],
  "Isaac Asimov": ["Estados Unidos", "Inglês"],
  "Stephen King": ["Estados Unidos", "Inglês"],
  "José Saramago": ["Portugal", "Português"],
  "Eça de Queirós": ["Portugal", "Português"],
  "Fernando Pessoa": ["Portugal", "Português"],
  "Clarice Lispector": ["Brasil", "Português"],
  "Guimarães Rosa": ["Brasil", "Português"],
};

/** País/idioma de um livro dado o código de idioma da busca (já filtrado). */
export function resolveCountryLanguage(author, langCode) {
  if (AUTHORS[author]) {
    const [country, language] = AUTHORS[author];
    return { country, language };
  }
  const fallback = LANG[langCode];
  return fallback ? { language: fallback[0], country: fallback[1] } : { language: null, country: null };
}
