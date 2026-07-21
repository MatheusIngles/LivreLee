/**
 * Fallback de capa em tempo de execução: quando um livro não tem `cover_url`
 * (comum em parte do acervo importado da Open Library, que às vezes não tem
 * `cover_i`), busca uma capa na Google Books API. Chamado sob demanda pela
 * rota /api/cover — nunca de dentro da montagem de uma rodada, para não
 * atrasar a resposta com uma chamada de rede externa. Sem chave de API — uso
 * ocasional, então fica dentro do limite público.
 */

const TIMEOUT_MS = 2500;

export async function resolveCoverUrl(title: string, author: string): Promise<string | null> {
  try {
    const q = `intitle:${title}${author ? `+inauthor:${author}` : ""}`;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=1`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    const json = await res.json();
    const thumb = json.items?.[0]?.volumeInfo?.imageLinks?.thumbnail as string | undefined;
    return thumb ? thumb.replace(/^http:/, "https:") : null;
  } catch {
    return null;
  }
}
