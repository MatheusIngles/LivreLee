# 📚 LivreLee

Jogo diário de adivinhação de livros, estilo Wordle. 23 modos diferentes de descobrir o livro — grade de atributos, frases, emoji, capa, "maior ou menor" entre duas cartas e mais. Sem cadastro: tudo funciona com um id anônimo salvo no navegador.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind** — frontend e API no mesmo projeto, deploy na Vercel
- **Supabase** — PostgreSQL e Storage para capas (sem Auth: o projeto não usa contas de usuário)
- **Vercel Cron** — seleciona o livro do dia e o evento sazonal à meia-noite (Brasília)
- **lucide-react** — ícones da interface

## Rodando localmente

```bash
npm install
npm run dev
```

Sem configurar nada, o app roda com um dataset local de 12 livros ([src/lib/seed-books.ts](src/lib/seed-books.ts)) e conteúdo de demonstração ([src/lib/seed-content.ts](src/lib/seed-content.ts)) — dá para jogar todos os 23 modos de ponta a ponta sem banco.

## Conectando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. No SQL Editor, rode [supabase/schema.sql](supabase/schema.sql) e depois [supabase/seed.sql](supabase/seed.sql) (~1000 livros reais, gerado — veja abaixo)
3. Copie `.env.example` para `.env.local` e preencha com as chaves do projeto (Settings → API). O painel às vezes chama a chave pública de "anon key", às vezes de "publishable key" — o app aceita as duas variáveis, use a que aparecer no seu painel
4. Reinicie o `npm run dev` — os dados passam a vir do banco

**Se a busca/palpite der erro "permission denied for table ..."**: faltam os `GRANT` de tabela para os papéis `anon`/`authenticated` — RLS sozinho não libera acesso. Isso acontece se você rodou uma versão antiga do `schema.sql` antes dos grants existirem. Rode direto no SQL Editor:

```sql
grant usage on schema public to anon, authenticated;
grant select on public.books, public.quotes, public.characters, public.chapters,
  public.adaptations, public.book_emojis, public.events,
  public.achievements to anon, authenticated;
-- daily_challenges precisa de INSERT também: se o cron ainda não rodou hoje,
-- a própria leitura da rodada sorteia e grava o desafio na hora, usando a
-- chave anônima.
grant select, insert on public.daily_challenges to anon, authenticated;
grant select, insert on public.scores to anon, authenticated;
```

**Se os jobs de ingestão (`node scripts/run-jobs.mjs ...` ou o GitHub Action) derem "permission denied for table books"**: mesma causa, mas para a `service_role` — ela ignora RLS, mas ainda precisa do `GRANT` de tabela (é uma camada separada). Rode:

```sql
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
```

Depois de rodar, force o PostgREST a recarregar o cache de permissões (senão o efeito só aparece minutos depois):

```sql
NOTIFY pgrst, 'reload schema';
```

(Rodar o `schema.sql` inteiro de novo não funciona nesse caso — `create policy` não tem `if not exists` e vai dar erro de "policy already exists".)

**Importante em produção:** defina `ROUND_SECRET` (ou pelo menos `CRON_SECRET`) nas variáveis de ambiente. Os tokens de rodada são assinados com HMAC; sem um segredo próprio, o código cai num valor fixo de desenvolvimento e qualquer um que leia o repositório pode forjar uma "vitória".

### Gerando o acervo de livros

O `supabase/seed.sql` é gerado por um script que puxa livros reais da [Open Library](https://openlibrary.org), limitado a **português e inglês** (os dois idiomas com filtro no jogo):

```bash
node scripts/fetch-books.mjs
```

Coleta ~1000 livros distribuídos entre 22 gêneros, com título, autor, ano, páginas e capa reais. País/idioma vêm de um mapa de autores conhecidos ([scripts/jobs/book-lang.mjs](scripts/jobs/book-lang.mjs)) ou são inferidos com segurança a partir do filtro de idioma da própria busca — nunca chutados a partir de uma lista de edições/traduções ambígua.

Para manter o banco atualizado depois do seed inicial, use o runner de jobs:

```bash
node scripts/run-jobs.mjs --list     # lista os jobs disponíveis
node scripts/run-jobs.mjs            # roda o conjunto padrão (openlibrary + google-books)
```

- `openlibrary` — importa livros novos incrementalmente (upsert por `source`+`source_key`, sem duplicar)
- `google-books` — enriquece com sinopse/tags/páginas os livros que ainda não têm sinopse
- `covers` — preenche `cover_url` dos livros que ficaram sem capa (busca por ISBN e depois por título+autor na Open Library)
- `characters` — personagens principais via Wikidata (propriedade P674 "characters" do item do livro): nome + descrição curta, dado estruturado sob CC0
- `adaptations` — filmes/séries/peças/jogos via Wikidata (obras que apontam para o livro via P144 "based on")
- `quotes` — primeira/última frase (modos Primeira Frase/Última Frase) via Project Gutenberg, **só para livros em domínio público**: como o Gutenberg só distribui obras com copyright expirado, extrair a 1ª/última frase do texto integral não tem o risco jurídico de raspar trechos de livro protegido. Citação "famosa" (modo Frase) e fala de personagem continuam manuais — exigem julgamento humano sobre relevância, não só posição no texto.
- `sales` — preenche `sales_estimate` com o número de cópias vendidas citado no resumo da Wikipedia do livro (ex. "sold over 120 million copies"). Não é uma estimativa inventada, mas também não é verificada por curadoria — é o número que a própria Wikipedia relata, com a precisão/atualidade que ela tiver. Decisão consciente do projeto: sem isso, o modo **Vendas** ficaria restrito aos 12 livros do dataset local.
- `recalc-rankings` — stub registrado no runner, sem fonte configurada.

**Esses jobs não rodam sozinhos** — são scripts Node soltos, ninguém os agenda automaticamente (os únicos crons reais do projeto são `/api/cron/daily` e `/api/cron/events`, ver [vercel.json](vercel.json), e cuidam só do desafio do dia/evento ativo). Pra rodar continuamente, tem um workflow do GitHub Actions pronto em [.github/workflows/ingestion-jobs.yml](.github/workflows/ingestion-jobs.yml):

- Roda 1x/dia às 04:00 UTC (uma hora depois do cron do desafio diário), com o conjunto completo de jobs.
- Também roda sob demanda: aba **Actions → Jobs de ingestão → Run workflow**, com a opção de escolher só alguns jobs (ex. `covers` para testar isolado).
- Precisa de 3 *repository secrets* (**Settings → Secrets and variables → Actions → New repository secret**):
  - `SUPABASE_URL` — mesma URL do `.env.local`
  - `SUPABASE_SERVICE_ROLE_KEY` — a service role key (nunca a anon/publishable)
  - `GOOGLE_BOOKS_KEY` — opcional, só se quiser volume maior na API do Google Books

GitHub Actions foi escolhido em vez de um cron na Vercel chamando uma API route porque os jobs de Wikidata/Gutenberg fazem várias chamadas sequenciais com pausas entre elas (educadas com as APIs públicas) — isso passa fácil do timeout de função serverless da Vercel, e o Actions não tem esse limite.

### Sorteio do livro diário

O desafio diário é **sorteado automaticamente**, com uma variante por idioma (`daily`, `daily-pt`, `daily-en`) para que o filtro de idioma dos livros não quebre a regra de "todo mundo vê o mesmo livro". O cron [/api/cron/daily](src/app/api/cron/daily/route.ts) garante as três linhas do dia em `daily_challenges`; se ele não rodar, a própria leitura da rodada sorteia e registra na hora (self-healing). Nunca repete um livro **dentro do mesmo idioma** até o acervo se esgotar. Lógica em [src/lib/daily.ts](src/lib/daily.ts).

### Eventos sazonais

Um evento (semanal por gênero, ou sazonal por data — Halloween, Natal etc.) fica sempre ativo, calculado puramente pelo calendário em [src/lib/events.ts](src/lib/events.ts) — funciona sem banco. O cron [/api/cron/events](src/app/api/cron/events/route.ts) só espelha isso na tabela `events` para histórico/relatório.

## Deploy (Vercel)

1. Importe o repositório na Vercel
2. Configure as variáveis de ambiente do `.env.example` (incluindo `CRON_SECRET` e `ROUND_SECRET`)
3. Os crons em [vercel.json](vercel.json) rodam `/api/cron/daily` (03:00 UTC) e `/api/cron/events` (03:05 UTC) — ambos à meia-noite de Brasília

## Modos de jogo

23 modos em 7 grupos (registro central em [src/lib/modes/registry.ts](src/lib/modes/registry.ts); nomes/descrições em [src/lib/i18n/dictionaries.ts](src/lib/i18n/dictionaries.ts)):

| Grupo | Modos |
|---|---|
| **Comparação** | Diário, Ilimitado, Idade do Livro, Número de Páginas, Vendas |
| **Frases** | Frase, Primeira Frase, Última Frase, Fala de Personagem |
| **Adivinhe pelo Livro** | Personagem, Livro pelo Personagem, Capítulo, Adaptação |
| **Outras Pistas** | Emoji, Sinopse, Tags, Timeline |
| **Capa** | Capa (Zoom), Capa Borrada, Silhueta |
| **Autor** | Autor, Adivinhe o Autor |
| **Especial** | Misto (sorteia um modo de pista a cada rodada) |

Duas mecânicas de jogo, escolhidas por `mode.mechanic` no registro:

- **`guess`** (a maioria): busca o livro/autor por texto, recebe uma grade de feedback (ou uma pista — frase, emoji, capa...), até `maxGuesses` tentativas. Roda por `/api/round` + `/api/guess`.
- **`higher-lower`** (Idade, Páginas, Vendas): duas cartas de livro lado a lado — uma revelada, outra oculta — e o jogador clica em qual acha que tem o valor maior. Acertou, o jogo continua em sequência (streak); errou, só reseta o streak — não tem fim, o jogador "pode jogar várias vezes" sem sair da tela. Roda por `/api/compare/round` + `/api/compare/guess`, com token assinado próprio ([src/lib/compare-token.ts](src/lib/compare-token.ts)).

Adicionar um modo novo na mecânica `guess` não exige nova página nem rota: basta um objeto em `registry.ts` (mais um caso em [Clue.tsx](src/components/Clue.tsx) se for um tipo de pista inédito) e as traduções em `dictionaries.ts`.

## Sem contas de usuário

Não há login. Cada navegador tem um `client_id` (UUID) gerado na primeira visita, usado só para o ranking anônimo do modo diário. Progresso (estatísticas, conquistas, sequência) fica em `localStorage` — limpar o navegador reseta tudo. Ver [src/lib/storage.ts](src/lib/storage.ts).

## Conquistas

Catálogo estático de 18 conquistas em 4 grupos (Primeiros Passos, Progressão, Sequência, Desafios) — [src/lib/achievements.ts](src/lib/achievements.ts). Avaliadas e guardadas no cliente a cada partida; não há tabela de conquistas por usuário no banco (a tabela `achievements` do schema é só um catálogo de referência, não lida pelo app hoje).

## Internacionalização (PT/EN)

Interface em português ou inglês, independente do filtro de idioma dos livros (são dois conceitos diferentes — dá pra jogar em inglês vendo só livros em português). Preferência salva no navegador via [`LocaleProvider`](src/lib/i18n/LocaleProvider.tsx); todo texto exibido (nomes/descrições de modo, conquistas, eventos, mensagens de jogo) vem de [dictionaries.ts](src/lib/i18n/dictionaries.ts) — os registros de modos/conquistas/eventos guardam só `id`/`slug`, nunca o texto em si, pra não ter duas cópias divergindo.

## Estrutura

```
src/
  app/
    page.tsx                    # home: modos agrupados + filtros de idioma
    conquistas/page.tsx         # conquistas e estatísticas
    play/[mode]/page.tsx        # player genérico (mecânica "guess")
    api/
      books, authors/search/    # autocomplete
      round/, guess/            # rodada e palpite (mecânica "guess")
      compare/round/, guess/    # rodada e palpite (mecânica "higher-lower")
      cover/                    # fallback de capa (Google Books) sob demanda
      score/                    # ranking anônimo (client_id)
      cron/daily/, cron/events/ # Vercel Cron
  components/
    SearchBox.tsx                # busca com autocomplete e teclado
    GuessRow.tsx                 # grade de atributos (mecânica "guess")
    Clue.tsx                     # renderiza a pista de cada modo
    CompareGame.tsx               # UI da mecânica "higher-lower"
    icons.tsx                    # ícones lucide por modo/grupo/conquista
    LocaleSwitch.tsx              # alternador de idioma da interface
  lib/
    modes/registry.ts + types.ts # registro central dos 23 modos
    rounds.ts                    # monta pista + resposta (mecânica "guess")
    compare.ts                   # sorteia par de livros (mecânica "higher-lower")
    round-token.ts, compare-token.ts  # tokens HMAC stateless
    data.ts                      # camada de dados (Supabase ou seed local)
    daily.ts                     # sorteio do livro do dia (sem repetir)
    game.ts                      # comparação de palpites (grade de atributos)
    events.ts                    # eventos semanais/sazonais (calendário puro)
    achievements.ts, storage.ts  # conquistas e persistência local
    i18n/                        # dicionário PT/EN + contexto de locale
    cover-fallback.ts             # busca capa alternativa (Google Books)
    seed-books.ts, seed-content.ts  # dataset local de desenvolvimento
    supabase/                    # clientes browser e server
scripts/
  fetch-books.mjs               # gera supabase/seed.sql da Open Library
  run-jobs.mjs                  # runner dos jobs de manutenção do banco
  jobs/                         # openlibrary, google-books, book-lang, lib
supabase/
  schema.sql                    # tabelas + RLS
  seed.sql                      # ~1000 livros (gerado)
```

## Roadmap

- **Feito:** 23 modos (2 mecânicas), diário sem repetição, conquistas, eventos sazonais, i18n PT/EN, filtro de idioma do acervo, ranking anônimo sem contas
- **Próximos:** jobs de citações/personagens/adaptações/vendas (hoje são stubs no runner), painel admin de curadoria, app Android (Capacitor), premium
