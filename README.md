# 📚 LivreLee

Jogo diário de adivinhação de livros, estilo Wordle/Loldle. Todo dia um livro; cada palpite revela dicas (autor, ano, país, idioma, gênero, páginas) comparando com o alvo.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind** — frontend e API no mesmo projeto, deploy na Vercel
- **Supabase** — PostgreSQL, Auth (Google/Apple/GitHub/email/visitante) e Storage para capas
- **Vercel Cron** — seleciona o livro do dia à meia-noite (Brasília)

## Rodando localmente

```bash
npm install
npm run dev
```

Sem configurar nada, o app roda com um dataset local de 12 livros ([src/lib/seed-books.ts](src/lib/seed-books.ts)) — dá para jogar de ponta a ponta.

## Conectando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. No SQL Editor, rode [supabase/schema.sql](supabase/schema.sql) e depois [supabase/seed.sql](supabase/seed.sql) (contém ~1000 livros reais)
3. Copie `.env.example` para `.env.local` e preencha com as chaves do projeto (Settings → API)
4. Reinicie o `npm run dev` — os dados passam a vir do banco

### Gerando o acervo de livros

O `supabase/seed.sql` é gerado por um script que puxa livros reais da [Open Library](https://openlibrary.org):

```bash
node scripts/fetch-books.mjs
```

Ele coleta ~1000 livros distribuídos entre gêneros, com título, autor, ano, páginas e capa reais. País/idioma vêm de um mapa de autores conhecidos + heurística conservadora — os campos ambíguos ficam `NULL` (para não publicar dado errado) e podem ser curados depois no admin.

### Sorteio do livro diário

O desafio diário é **sorteado automaticamente**: o cron [/api/cron/daily](src/app/api/cron/daily/route.ts) escolhe, à meia-noite de Brasília, um livro aleatório **que ainda não foi usado** (reinicia o ciclo quando o acervo esgota) e grava em `daily_challenges`. Todos os jogadores leem essa mesma linha, então o livro do dia é igual para todo mundo. A lógica está em [src/lib/daily.ts](src/lib/daily.ts).

## Deploy (Vercel)

1. Importe o repositório na Vercel
2. Configure as variáveis de ambiente do `.env.example` (incluindo `CRON_SECRET`)
3. O cron em [vercel.json](vercel.json) roda `/api/cron/daily` às 03:00 UTC (00:00 Brasília) e registra o desafio do dia em `daily_challenges`

## Estrutura

```
src/
  app/
    page.tsx              # home com os modos de jogo
    daily/page.tsx        # modo diário (UI do jogo)
    api/
      books/search/       # autocomplete de livros
      guess/              # valida palpite e devolve comparação
      cron/daily/         # seleção do livro do dia (Vercel Cron)
  components/
    SearchBox.tsx         # busca com autocomplete e teclado
    GuessRow.tsx          # linha de comparação estilo Loldle
  lib/
    data.ts               # camada de dados (Supabase ou seed local)
    daily.ts              # sorteio do livro do dia (sem repetir)
    game.ts               # comparação de palpites
    seed-books.ts         # dataset local de desenvolvimento (12 livros)
    supabase/             # clientes browser e server
scripts/
  fetch-books.mjs         # gera supabase/seed.sql da Open Library
supabase/
  schema.sql              # tabelas + RLS
  seed.sql                # ~1000 livros (gerado)
```

## Roadmap

- **v1 (MVP):** modo diário ✅, ilimitado, frases, capa (zoom), login, estatísticas, compartilhamento ✅, admin
- **v2:** personagens, autores, emojis, blur, ranking, conquistas, XP
- **v3:** eventos sazonais, temas, app Android (Capacitor), premium, multiplayer
