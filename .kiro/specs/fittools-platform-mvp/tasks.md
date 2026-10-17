# Implementation Plan: FitTools Brasil MVP v1.0

## Overview

Plano de implementação do **FitTools Brasil MVP v1.0**, uma plataforma web fitness B2C que migra 8 calculadoras fitness (vanilla JavaScript) para uma arquitetura moderna, com autenticação opcional e perfil de saúde do usuário.

**Stack (decisões fixadas do projeto):**

- **Frontend**: Nuxt **3.21.11** (SSG, não usar Nuxt 4) + Vue **3.5.43** + Pinia **4.1.0** + TypeScript + Tailwind CSS. Versões exatas, sem `^` ou `~`.
- **Backend**: Node.js 20 LTS + Fastify + TypeScript + Prisma **5.22.0** (ORM, versão exata) + Zod + Pino.
- **Banco de dados**: PostgreSQL 15+.
- **Hospedagem**: uma única VPS Hetzner administrada pelo time, com `docker compose` orquestrando Caddy (HTTPS automático e servidor dos arquivos estáticos do frontend), API Fastify e PostgreSQL. Sem Vercel, Render ou Supabase.
- **CI/CD**: GitHub Actions (testes, build, imagem da API no GHCR, deploy por SSH/rsync).

**Fases:**

1. Setup Inicial (concluída)
2. Backend - Infraestrutura (concluída)
3. Backend - Autenticação
4. Backend - Perfil de Usuário
5. Frontend - Estrutura Base
6. Frontend - Autenticação
7. Frontend - Calculadoras
8. Frontend - Perfil de Usuário
9. SEO e Performance
10. Testes E2E
11. Deploy (VPS Hetzner + Docker)

**Resumo:**

| Métrica | Valor |
|---------|-------|
| Total de tarefas | 61 (10 concluídas, 51 pendentes) |
| Total de fases | 11 |
| Estimativa total | 160-206 horas |
| Calculadoras | 8 |
| Endpoints API | 5 (`/health`, `/auth/register`, `/auth/login`, `/users/me`, `/users/me/profile`) |
| Páginas frontend | 12 |

| Fase | Descrição | Nº Tarefas | Estimativa |
|------|-----------|------------|------------|
| 1 | Setup Inicial | 3 | 3-4h |
| 2 | Backend - Infraestrutura | 7 | 14-19h |
| 3 | Backend - Autenticação | 6 | 16-20h |
| 4 | Backend - Perfil de Usuário | 4 | 10-12h |
| 5 | Frontend - Estrutura Base | 7 | 16-20h |
| 6 | Frontend - Autenticação | 4 | 10-12h |
| 7 | Frontend - Calculadoras | 12 | 40-50h |
| 8 | Frontend - Perfil de Usuário | 3 | 8-10h |
| 9 | SEO e Performance | 5 | 12-16h |
| 10 | Testes E2E | 4 | 12-16h |
| 11 | Deploy (Hetzner + Docker) | 6 | 19-27h |

## Tasks

- [x] 1. Fase 1: Setup Inicial
  - Status da fase: concluída (monorepo, backend Fastify/TypeScript e frontend Nuxt 3 criados).

  - [x] 1.1 Criar estrutura de monorepo
    - Descrição: criar a estrutura de pastas para organizar frontend e backend como projetos independentes na raiz do workspace.
    - Critérios de aceitação:
      - Diretório `fittools-backend/` criado na raiz do workspace
      - Diretório `fittools-frontend/` criado na raiz do workspace
      - `.gitignore` global com entradas para node_modules, .env, .DS_Store
      - `README.md` raiz com instruções de setup
    - Arquivos afetados: `/fittools-backend/`, `/fittools-frontend/`, `/.gitignore`, `/README.md`
    - Dependências: nenhuma
    - Estimativa: XS (< 1h)
    - Comando útil: `mkdir fittools-backend fittools-frontend`
    - Notas: monorepo simples, sem Yarn Workspaces ou Turborepo (simplifica o MVP); cada projeto tem seu próprio `package.json` e `node_modules`.
    - Status: concluída
    - _Requirements: 10.4_

  - [x] 1.2 Setup do projeto backend (Fastify + TypeScript)
    - Descrição: inicializar o backend com Fastify, TypeScript, ESLint e estrutura de pastas.
    - Critérios de aceitação:
      - `npm init -y` executado em `fittools-backend/`
      - TypeScript instalado e `tsconfig.json` configurado (target ES2022, moduleResolution bundler)
      - Fastify instalado (`fastify@^4.28`)
      - ESLint configurado com `@typescript-eslint`
      - Pastas criadas: `src/routes`, `src/services`, `src/middlewares`, `src/schemas`, `src/utils`, `src/config`, `src/database`, `tests/`
      - Script `npm run dev` funciona com `tsx watch src/server.ts`
      - Script `npm run build` compila TypeScript para `dist/`
    - Arquivos afetados: `fittools-backend/package.json`, `tsconfig.json`, `.eslintrc.json`, `src/server.ts`, `.env.example`
    - Dependências: 1.1
    - Estimativa: S (1-2h)
    - Comandos úteis: `npm init -y`; `npm install fastify@^4.28 typescript@^5.3 tsx@^4.7 --save-dev`; `npm install @types/node@^20 --save-dev`; `npx tsc --init`
    - Notas: usar `tsx` para hot-reload em development; `tsconfig.json` com `"strict": true` e `"esModuleInterop": true`.
    - Status: concluída
    - _Requirements: 3.10, 10.1_

  - [x] 1.3 Setup do projeto frontend (Nuxt 3 + TypeScript)
    - Descrição: inicializar o frontend com Nuxt 3, TypeScript, Tailwind CSS, Pinia e VueUse.
    - Critérios de aceitação:
      - Projeto criado com `npx nuxi@latest init fittools-frontend`
      - TypeScript habilitado (automático no Nuxt 3)
      - Tailwind CSS instalado e configurado (`@nuxtjs/tailwindcss`)
      - Pinia instalado (`@pinia/nuxt`)
      - VueUse instalado (`@vueuse/nuxt`)
      - Pastas criadas: `pages/`, `components/`, `composables/`, `stores/`, `layouts/`, `types/`
      - `npm run dev` funciona em `localhost:3000`
      - `npm run generate` gera SSG em `.output/public`
    - Arquivos afetados: `fittools-frontend/package.json`, `nuxt.config.ts`, `tailwind.config.ts`, `.env.example`
    - Dependências: 1.1
    - Estimativa: S (1-2h)
    - Comandos úteis: `npx nuxi@latest init .`; `npm install @nuxtjs/tailwindcss @pinia/nuxt @vueuse/nuxt`; `npx nuxi module add tailwindcss pinia`
    - Notas: configurar `ssr: true` e `nitro.prerender` para SSG. Versões fixadas (decisão do projeto): Nuxt 3.21.11 (não usar Nuxt 4), Pinia 4.1.0 e Vue 3.5.43, todas exatas no `package.json`.
    - Status: concluída
    - _Requirements: 2.1, 8.1, 8.7, 10.6_

- [x] 2. Fase 2: Backend - Infraestrutura
  - Status da fase: concluída. Tasks 2.1, 2.1b, 2.2, 2.3, 2.4, 2.5 e 2.6 estão implementadas (o PostgreSQL local em Docker está no ar, a primeira migration foi aplicada, o repositório Git existe na raiz do monorepo e o `prisma` está em `dependencies`). O primeiro commit Git foi feito e enviado ao GitHub (`7ab6bab` na `main`, com `HEAD` e `origin/main` no mesmo commit). Ressalva: o `trustProxy` (ativo só em produção) foi validado apenas por compilação; o teste em execução atrás do Caddy fica para a Task 11.6.

  - [x] 2.1 Configurar Prisma ORM
    - Descrição: instalar e configurar o Prisma como ORM para PostgreSQL com o schema inicial.
    - Critérios de aceitação:
      - Prisma com versões exatas (`prisma@5.22.0`, `@prisma/client@5.22.0`)
      - `prisma init` executado com datasource PostgreSQL
      - `schema.prisma` com os modelos User e UserHealthProfile conforme o design
      - ENUMs criados: Sex, ActivityLevel, FitnessGoal
      - Relação 1:1 entre User e UserHealthProfile
      - Índices em `users.email` e `user_health_profiles.user_id`
      - Script `npm run prisma:generate` gera o Prisma Client
    - Arquivos afetados: `fittools-backend/prisma/schema.prisma`, `package.json` (scripts), `src/database/client.ts` (singleton do Prisma)
    - Dependências: 1.2
    - Estimativa: M (2-3h)
    - Comandos úteis: `npm install prisma @prisma/client`; `npx prisma init`
    - Notas:
      - O Prisma não suporta CHECK constraints no `schema.prisma`; os CHECKs (`weight_kg` 30-300, `height_cm` 120-230, `age` 14-100) são adicionados editando o SQL da migration gerada, na Task 2.2.
      - UUID como tipo de ID com `@db.Uuid`; timestamps com `@db.Timestamptz(3)`.
      - O pacote `prisma` (CLI) foi movido para `dependencies` na Task 2.6, pois a CLI roda `prisma migrate deploy` dentro da imagem da API.
    - Status: concluída (schema e Prisma Client gerados; sem migration ainda)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.8_

  - [x] 2.1b Instalar Docker Desktop e criar PostgreSQL local (docker-compose.dev.yml)
    - Descrição: instalar o Docker Desktop na máquina Windows do desenvolvedor (backend WSL2) e criar o `docker-compose.dev.yml` com apenas o PostgreSQL 15+ para desenvolvimento. O mesmo Docker será usado em produção na VPS Hetzner (Fase 11). Esta tarefa desbloqueia a Task 2.2.
    - Responsabilidades:
      - Usuário (manual, fora do repositório): instalar o Docker Desktop, habilitar WSL2 e virtualização na BIOS/UEFI (se necessário), reiniciar o Windows e confirmar que o Docker Desktop está em execução.
      - Código no repositório: `docker-compose.dev.yml` e ajuste dos arquivos `.env.example`/`.env` do backend.
    - Critérios de aceitação:
      - Docker Desktop com backend WSL2; `docker --version` e `docker compose version` funcionam no PowerShell
      - `docker run --rm hello-world` executa com sucesso
      - `docker-compose.dev.yml` na raiz do monorepo com um único serviço `db` (`postgres:15-alpine`)
      - Porta 5432 publicada somente em localhost (`127.0.0.1:5432:5432`), nunca em `0.0.0.0`
      - Dados persistidos em volume nomeado (`pgdata_dev`); `docker compose down` sem `-v` preserva os dados
      - Credenciais de desenvolvimento no compose (`POSTGRES_USER=fittools`, `POSTGRES_PASSWORD=fittools_dev`, `POSTGRES_DB=fittools`, `TZ=UTC`), marcadas como "somente uso local"
      - `healthcheck` com `pg_isready`
      - `DATABASE_URL` em `fittools-backend/.env.example` e `.env` coerente: `postgresql://fittools:fittools_dev@localhost:5432/fittools`
      - Banco `fittools_test` criado para testes de integração e `TEST_DATABASE_URL` documentada no `.env.example` (opcional)
      - Container sobe `healthy` e aceita conexão (`docker compose -f docker-compose.dev.yml exec db pg_isready -U fittools -d fittools`)
    - Arquivos afetados: `docker-compose.dev.yml` (criar, raiz), `fittools-backend/.env.example` (DATABASE_URL e TEST_DATABASE_URL), `fittools-backend/.env` (gitignored), `README.md` (seção "Banco de dados local")
    - Dependências: 1.1
    - Estimativa: M (2-3h, incluindo instalação do Docker Desktop e reinicialização)
    - Comandos úteis (PowerShell):
      - `docker --version`, `docker compose version`, `docker run --rm hello-world`
      - `docker compose -f docker-compose.dev.yml up -d` e `... ps`
      - `docker compose -f docker-compose.dev.yml exec db createdb -U fittools fittools_test`
      - `docker compose -f docker-compose.dev.yml down` (preserva dados) / `down -v` (apaga dados)
    - Notas:
      - Conteúdo de referência do compose: seção "docker-compose.dev.yml (PostgreSQL local)" do `design.md`.
      - Em desenvolvimento só o PostgreSQL roda em Docker; o frontend (`nuxt dev`) e a API (`npm run dev`) rodam direto na máquina.
      - Se a porta 5432 já estiver em uso por outro PostgreSQL local, parar o outro serviço ou alterar a porta do host e a `DATABASE_URL` juntas.
      - O Docker Desktop tem termos de licença próprios para uso comercial por empresas de maior porte; confirmar no site da Docker. Alternativa: Docker Engine dentro do WSL2.
      - Credenciais apenas de desenvolvimento; as de produção são geradas aleatoriamente (Task 11.2).
    - Status: concluída. Verificado de fato: Docker Desktop 29.8.2 instalado (modo per-user, backend WSL 2); `docker-compose.dev.yml` criado na raiz com `postgres:15-alpine`, porta publicada só em `127.0.0.1:5432`, volume `pgdata_dev` e healthcheck; container `fittools-db-dev` com status `healthy`; banco `fittools_test` criado; `.env.example` e `.env` do backend com `DATABASE_URL` e `TEST_DATABASE_URL` coerentes; `README.md` da raiz reescrito com a seção "Banco de dados local" e as instruções de backend e frontend; `.gitignore` completado (inclui `.nuxt/` e `.env.*` com exceção de `.env.example`).
    - _Requirements: 10.4, 10.8_

  - [x] 2.2 Criar primeira migration do database
    - Descrição: gerar e aplicar a primeira migration criando `users` e `user_health_profiles`, editando o SQL gerado para incluir os CHECK constraints (que o Prisma não declara no schema) e validar o `/health` com o banco realmente conectado.
    - Critérios de aceitação:
      - PostgreSQL de desenvolvimento em execução e `healthy` (Task 2.1b)
      - Migration criada com `npx prisma migrate dev --name init --create-only` (gera o SQL sem aplicar, para permitir a edição)
      - SQL cria as tabelas `users` e `user_health_profiles`
      - ENUMs PostgreSQL criados (Sex, ActivityLevel, FitnessGoal)
      - Constraints nativos do Prisma presentes (NOT NULL, UNIQUE, FK com `ON DELETE CASCADE`)
      - Índices conforme o schema (`users.email` único, `user_health_profiles.user_id` único)
      - `migration.sql` editado manualmente para adicionar CHECK constraints em `user_health_profiles`: `weight_kg` 30-300, `height_cm` 120-230, `age` 14-100 (valores `NULL` continuam permitidos, pois o perfil pode ser parcial)
      - Migration aplicada com `npx prisma migrate dev`; `npx prisma migrate status` indica "Database schema is up to date"
      - Teste manual dos CHECKs: `INSERT` fora da faixa (ex: `age = 5`) é rejeitado pelo banco
      - Com o banco conectado, `GET /health` responde 200 com `database: "connected"`; com o container parado (`docker compose -f docker-compose.dev.yml stop db`), responde 503 com `database: "disconnected"` em até ~5s
      - Pasta `fittools-backend/prisma/migrations/` (incluindo `migration_lock.toml`) versionada no Git e fora do `.gitignore` — o repositório Git existe (criado na raiz do monorepo) e as migrations não estão ignoradas (verificado com `git check-ignore`); o commit foi feito e enviado ao GitHub (`7ab6bab` na `main`), incluindo as migrations (registrado também na Task 2.6, item 9)
    - Trecho SQL a acrescentar ao final do `migration.sql`:

          ALTER TABLE "user_health_profiles"
            ADD CONSTRAINT "chk_weight_kg" CHECK ("weight_kg" IS NULL OR ("weight_kg" >= 30 AND "weight_kg" <= 300)),
            ADD CONSTRAINT "chk_height_cm" CHECK ("height_cm" IS NULL OR ("height_cm" >= 120 AND "height_cm" <= 230)),
            ADD CONSTRAINT "chk_age" CHECK ("age" IS NULL OR ("age" >= 14 AND "age" <= 100));

    - Arquivos afetados: `fittools-backend/prisma/migrations/<timestamp>_init/migration.sql` (criar e editar), `prisma/migrations/migration_lock.toml` (gerado), `.gitignore` (verificar que `prisma/migrations` não é ignorada)
    - Dependências: 2.1, 2.1b, 2.5
    - Estimativa: S (1-2h)
    - Comandos úteis: `npx prisma migrate dev --name init --create-only`; editar o SQL; `npx prisma migrate dev`; `npx prisma migrate status`; `curl http://localhost:3001/health`
    - Notas:
      - Fluxo `--create-only` → editar o SQL → aplicar. Depois de aplicada e commitada, não editar mais a migration: mudanças futuras entram em novas migrations.
      - Em produção (Fase 11) só `prisma migrate deploy` é usado e exige `prisma/migrations/` versionada.
      - Manter a migration retrocompatível com a versão anterior do código sempre que possível, pois em produção ela roda antes da troca da API.
      - As colunas são nullable; o CHECK trata `NULL` explicitamente com `IS NULL OR`.
    - Status: concluída. O repositório Git existe, as migrations não são ignoradas e já estão versionadas no commit `7ab6bab` da `main`, enviado ao GitHub. Verificado de fato: migration `20261016121524_init` criada com `--create-only`, editada para incluir os CHECKs `chk_weight_kg`, `chk_height_cm` e `chk_age` (aceitando NULL) e aplicada; `prisma migrate status` indica "Database schema is up to date"; teste manual no PostgreSQL: `age = 5`, `weight_kg = 500` e `height_cm = 50` foram rejeitados e um perfil válido (80 kg, 178 cm, 28 anos) foi aceito; `GET /health` respondeu 200 com `database: "connected"` com o banco no ar e 503 com `database: "disconnected"` com o container parado (cerca de 6 s medidos no cliente, com timeout interno de 5 s).
    - _Requirements: 7.1, 7.2, 7.5, 7.9, 10.7_

  - [x] 2.3 Configurar variáveis de ambiente
    - Descrição: criar o sistema de validação de variáveis de ambiente usando Zod.
    - Critérios de aceitação:
      - `src/config/env.ts` com schema Zod validando todas as env vars
      - Variáveis validadas: DATABASE_URL, JWT_SECRET, JWT_EXPIRATION_DAYS, PORT, NODE_ENV, CORS_ORIGIN, HOST
      - Processo encerra com erro descritivo se env vars obrigatórias faltarem
      - Tipos TypeScript inferidos do schema Zod
      - `.env.example` atualizado com todas as variáveis
    - Arquivos afetados: `fittools-backend/src/config/env.ts`, `.env.example`, `.env` (gitignored)
    - Dependências: 1.2
    - Estimativa: S (1h)
    - Comando útil: `npm install zod dotenv`
    - Notas: `z.string().url()` para DATABASE_URL e CORS_ORIGIN; `z.string().min(32)` para JWT_SECRET; exportar objeto `env` tipado. `CORS_ORIGIN` aceita uma ou mais origens separadas por vírgula (em produção: domínio principal e `www`). O `DATABASE_URL` de desenvolvimento aponta para o PostgreSQL do `docker-compose.dev.yml` (Task 2.1b).
    - Status: concluída (`src/config/env.ts`)
    - _Requirements: 10.1, 10.2_

  - [x] 2.4 Implementar logging estruturado com Pino
    - Descrição: configurar o logger Pino integrado ao Fastify para logging estruturado.
    - Critérios de aceitação:
      - Pino configurado no Fastify com nível de log baseado em NODE_ENV
      - Registra todas as requisições HTTP com método, URL, statusCode e responseTime
      - NUNCA registra senhas, tokens ou dados sensíveis
      - JSON estruturado em produção, pretty print em development
      - Serializers customizados de req/res removendo campos sensíveis
    - Arquivos afetados: `fittools-backend/src/server.ts` (config do logger)
    - Dependências: 1.2
    - Estimativa: S (1h)
    - Comando útil: `npm install pino pino-pretty`
    - Notas: Pino já vem integrado ao Fastify; usar `serializers.req` para remover o header Authorization. Em produção os logs saem em JSON no stdout do container e são coletados pelo Docker (rotação via `max-size`/`max-file` no Compose, Task 11.2).
    - Status: concluída (redação de credenciais configurada)
    - _Requirements: 3.9, 4.9, 10.5_

  - [x] 2.5 Implementar endpoint de health check
    - Descrição: criar o endpoint `/health` retornando o status do servidor e da conexão com o database.
    - Critérios de aceitação:
      - `GET /health` acessível sem autenticação
      - Retorna 200 com `{status: "ok", timestamp: <ISO8601>, uptime: <seconds>, database: "connected"}`
      - Banco inacessível: 503 com `database: "disconnected"`
      - Teste de conexão usa `prisma.$queryRaw('SELECT 1')` com timeout de 5s
      - Resposta em < 50ms para 99% das requisições
    - Arquivos afetados: `fittools-backend/src/routes/health.routes.ts`, `src/server.ts` (registro da rota)
    - Dependências: 2.1, 2.4
    - Estimativa: S (1h)
    - Notas: usar `process.uptime()`. O endpoint serve o `HEALTHCHECK` do container Docker, o health check do Caddy (`health_uri /health`) e a ferramenta de uptime externa (Task 11.6). O teste com banco conectado (200 + `database: "connected"`) é feito na Task 2.2.
    - Status: concluída (timeout de 5s na consulta ao banco)
    - _Requirements: 10.9, 12.5_

  - [x] 2.6 Configurar CORS e headers de segurança
    - Descrição: configurar CORS e headers de segurança HTTP com plugins Fastify, e preparar a API para rodar atrás do Caddy em produção.
    - Itens já concluídos (1-6):
      - Plugin `@fastify/cors` instalado e configurado
      - CORS permite apenas as origens de CORS_ORIGIN (whitelist)
      - CORS permite métodos GET, POST, PUT, DELETE, OPTIONS
      - CORS permite headers Content-Type e Authorization
      - Plugin `@fastify/helmet` instalado com CSP básico
      - Headers de segurança aplicados: X-Frame-Options, X-Content-Type-Options
    - Itens concluídos (7-9):
      - Preparação para produção atrás do Caddy: instância Fastify criada com `trustProxy: env.NODE_ENV === 'production'` (ativo somente em produção), para que `request.ip` e o rate limiting por IP (Task 4.4) enxerguem o IP real do visitante e não o IP interno do Caddy
      - Preparação para produção: pacote `prisma` movido de `devDependencies` para `dependencies` em `fittools-backend/package.json` (versão exata 5.22.0), pois a CLI é necessária em produção para `prisma migrate deploy`
      - Preparação para produção: pasta `fittools-backend/prisma/migrations/` versionada no Git (confirmar que não está no `.gitignore`)
    - Arquivos afetados: `fittools-backend/src/app.ts` (`trustProxy` condicionado a produção), `src/server.ts` (plugins), `package.json` (mover `prisma` para `dependencies`)
    - Dependências: 1.2 (itens 1-6, concluídos); 2.2 (itens 7-9, concluídos após a primeira migration)
    - Estimativa: S (1-2h)
    - Comando útil: `npm install @fastify/cors @fastify/helmet`
    - Notas:
      - A origin do CORS deve ser uma function verificando a whitelist; o CSP do Helmet deve permitir estilos inline do Tailwind.
      - `trustProxy` é seguro em produção porque a porta 3001 não é publicada: a API só é alcançável pelo Caddy, via rede Docker interna. Nunca habilitar `trustProxy` se a API ficar exposta diretamente à internet, ou o cliente poderá forjar o IP via `X-Forwarded-For`.
      - Em desenvolvimento a API fica exposta diretamente (sem proxy); por isso `trustProxy` foi condicionado a `env.NODE_ENV === 'production'`, evitando que o IP usado no rate limiting seja forjado via `X-Forwarded-For`.
      - A CLI do Prisma em `dependencies` aumenta ligeiramente a imagem Docker, mas permite `docker compose run --rm migrate` (Tasks 11.1 e 11.2).
      - `prisma/migrations` versionada é pré-requisito do `prisma migrate deploy` no deploy (Task 11.5).
    - Status: concluída (itens 1-9). Verificado de fato: (7) `trustProxy: env.NODE_ENV === 'production'` adicionado em `fittools-backend/src/app.ts` (só em produção, pois em desenvolvimento a API fica exposta diretamente e confiar no `X-Forwarded-For` permitiria forjar o IP do rate limiting); o backend compila (`npm run build`). Ressalva: o comportamento em produção atrás do Caddy NÃO foi testado em execução, apenas por compilação; a validação em execução (dois IPs distintos com contadores independentes) fica para a Task 11.6. (8) pacote `prisma` movido de `devDependencies` para `dependencies` em `fittools-backend/package.json`, versão exata 5.22.0; Prisma Client regenerado e build ok. (9) repositório Git criado na raiz do monorepo (`git init -b main`); verificado com `git check-ignore` que `.env`, `node_modules`, `dist`, `.nuxt` e `.output` são ignorados, e que `.env.example`, `prisma/migrations/<timestamp>_init/migration.sql` e `prisma/migrations/migration_lock.toml` NÃO são ignorados (portanto são versionados); nenhum arquivo sensível entre os 38 arquivos versionados. O primeiro commit foi feito pelo usuário e enviado ao GitHub: `7ab6bab` na branch `main` ("Setup inicial: backend Fastify, frontend Nuxt 3 e PostgreSQL com Docker"), com 38 arquivos; `HEAD` e `origin/main` apontam para o mesmo commit (remote `origin`: https://github.com/BentoLeandro/fittools.git). Entre os arquivos versionados, os únicos com nomes de variáveis de ambiente são os dois `.env.example`; `.env`, `node_modules`, `dist`, `.nuxt` e `.output` não foram versionados. As migrations (`prisma/migrations/<timestamp>_init/migration.sql` e `migration_lock.toml`) estão no commit.
    - _Requirements: 3.3, 6.8, 10.5_

- [ ] 3. Fase 3: Backend - Autenticação

  - [ ] 3.1 Implementar JWT utilities
    - Descrição: criar funções utilitárias para geração e verificação de tokens JWT.
    - Critérios de aceitação:
      - `signJWT(userId, email)` gera token com payload `{user_id, email, iat, exp}`
      - Algoritmo HS256 na assinatura
      - Expiração configurável via JWT_EXPIRATION_DAYS
      - `verifyJWT(token)` decodifica e verifica a assinatura
      - Erros específicos para token expirado vs token inválido
      - Interface TypeScript `JWTPayload` exportada
    - Arquivos afetados: `fittools-backend/src/utils/jwt.util.ts` (criar), `src/types/index.ts` (criar - interfaces)
    - Dependências: 2.3
    - Estimativa: M (2h)
    - Comandos úteis: `npm install jsonwebtoken`; `npm install @types/jsonwebtoken --save-dev`
    - Notas: usar `jwt.sign()` e `jwt.verify()` da biblioteca jsonwebtoken; o secret vem de `env.JWT_SECRET`.
    - _Requirements: 4.2, 4.3, 4.6, 4.7_

  - [ ] 3.2 Implementar password hashing service
    - Descrição: criar o service para hash e verificação de senhas usando bcrypt.
    - Critérios de aceitação:
      - `hashPassword(password)` retorna hash bcrypt com cost factor 12
      - `verifyPassword(password, hash)` compara senha com hash
      - Tempo de execução de ~300ms para hash/verify (cost 12)
      - Service exporta a classe `AuthService` com métodos tipados
      - Testes garantem que a mesma senha gera hashes diferentes (salt aleatório)
    - Arquivos afetados: `fittools-backend/src/services/auth.service.ts` (criar)
    - Dependências: 1.2
    - Estimativa: M (2h)
    - Comandos úteis: `npm install bcrypt`; `npm install @types/bcrypt --save-dev`
    - Notas: cost factor 12 = 2^12 = 4096 iterações; bcrypt é seguro contra timing attacks.
    - _Requirements: 4.4, 4.9_

  - [ ] 3.3 Criar schemas de validação com Zod
    - Descrição: criar schemas Zod para validação de payloads de autenticação.
    - Critérios de aceitação:
      - `registerSchema` valida email, password e name
      - Email validado com `.email()` e normalizado com `.toLowerCase().trim()`
      - Password: mínimo 8 caracteres, máximo 128, regex para maiúscula + minúscula + número
      - Name: 2-100 caracteres, regex para caracteres válidos (letras, espaços, hífens)
      - `loginSchema` valida email e password
      - Mensagens de erro em português brasileiro
    - Arquivos afetados: `fittools-backend/src/schemas/auth.schema.ts` (criar)
    - Dependências: 2.3
    - Estimativa: M (2h)
    - Notas: usar `.refine()` para validações customizadas; regex da senha `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/`.
    - _Requirements: 3.7, 4.8, 9.1_

  - [ ] 3.4 Implementar endpoint POST /api/v1/auth/register
    - Descrição: criar o endpoint de registro de usuários com validação, hashing e geração de JWT.
    - Critérios de aceitação:
      - `POST /api/v1/auth/register` aceita JSON `{email, password, name}`
      - Validação Zod aplicada; retorna 400 com campos detalhados se falhar
      - Email duplicado retorna 409 Conflict
      - Senha hasheada com bcrypt antes de salvar
      - User criado no DB com Prisma
      - JWT gerado e retornado com os dados do usuário
      - Status 201 Created em sucesso
      - `password_hash` NUNCA exposto na resposta
    - Arquivos afetados: `fittools-backend/src/routes/auth.routes.ts` (criar), `src/server.ts` (registrar rota)
    - Dependências: 3.1, 3.2, 3.3, 2.1
    - Estimativa: M (3-4h)
    - Notas: usar `prisma.user.create()` com try/catch para `Prisma.PrismaClientKnownRequestError` (P2002 = unique constraint); retornar `{user: {...}, token: "..."}`.
    - _Requirements: 4.4, 4.5, 4.8, 5.1_

  - [ ] 3.5 Implementar endpoint POST /api/v1/auth/login
    - Descrição: criar o endpoint de login com verificação de credenciais e geração de JWT.
    - Critérios de aceitação:
      - `POST /api/v1/auth/login` aceita JSON `{email, password}`
      - Validação Zod aplicada
      - Email normalizado para lowercase antes de buscar no DB
      - User buscado com Prisma `findUnique({where: {email}})`
      - Senha verificada com `verifyPassword()`
      - Credenciais inválidas retornam 401 com a mesma mensagem para email inexistente e senha errada (previne enumeração)
      - JWT gerado e retornado com os dados do usuário
      - Status 200 OK em sucesso
    - Arquivos afetados: `fittools-backend/src/routes/auth.routes.ts` (atualizar)
    - Dependências: 3.4
    - Estimativa: M (2-3h)
    - Notas: mesma mensagem de erro para email não encontrado e senha incorreta; tempo de resposta constante (~300ms) previne timing attacks.
    - _Requirements: 4.1, 4.7_

  - [ ] 3.6 Implementar JWT middleware
    - Descrição: criar o middleware Fastify para verificar JWT em rotas autenticadas.
    - Critérios de aceitação:
      - `jwtMiddleware` extrai o token do header Authorization
      - Formato exigido: `Bearer <token>`
      - Token verificado com `verifyJWT()`
      - `request.user` populado com `{id, email}` do payload
      - Token ausente retorna 401 com mensagem clara
      - Token inválido/expirado retorna 401 com mensagem específica
      - Aplicável como `preHandler` em rotas específicas
    - Arquivos afetados: `fittools-backend/src/middlewares/jwt.middleware.ts` (criar), `src/types/index.ts` (declaração de `request.user`)
    - Dependências: 3.1
    - Estimativa: M (2-3h)
    - Notas: usar Fastify decorators para tipar `request.user`; split do header `const [bearer, token] = authHeader.split(' ')`.
    - _Requirements: 4.6, 4.7, 4.10, 4.11, 5.8, 9.2_

- [ ] 4. Fase 4: Backend - Perfil de Usuário

  - [ ] 4.1 Criar schemas de validação de health profile
    - Descrição: criar schemas Zod para validação de dados de perfil de saúde.
    - Critérios de aceitação:
      - `healthProfileSchema` valida weight_kg, height_cm, age, sex, activity_level, fitness_goal
      - Faixas numéricas: weight 30-300, height 120-230, age 14-100
      - ENUMs validados para sex, activity_level, fitness_goal
      - `.multipleOf(0.01)` para weight e height (2 casas decimais)
      - Todos os campos opcionais (perfil pode ser parcial)
      - Mensagens de erro em português brasileiro
    - Arquivos afetados: `fittools-backend/src/schemas/user.schema.ts` (criar)
    - Dependências: 2.3
    - Estimativa: M (2h)
    - Notas: usar `.optional()` em todos os campos; os ENUMs devem corresponder aos tipos Prisma.
    - _Requirements: 3.7, 5.3, 5.9, 5.10, 5.11_

  - [ ] 4.2 Implementar endpoint GET /api/v1/users/me
    - Descrição: criar o endpoint que retorna os dados do usuário autenticado e seu perfil de saúde.
    - Critérios de aceitação:
      - `GET /api/v1/users/me` protegido por `jwtMiddleware`
      - user_id extraído de `request.user.id`
      - User buscado com Prisma incluindo a relação health_profile
      - Retorna 200 com `{user: {...}, health_profile: {...} | null}`
      - `password_hash` NUNCA exposto
      - User não encontrado retorna 404 (JWT válido mas usuário deletado)
      - Resposta em < 100ms para 95% das requisições
    - Arquivos afetados: `fittools-backend/src/routes/user.routes.ts` (criar), `src/services/user.service.ts` (criar), `src/server.ts` (registrar rota)
    - Dependências: 3.6, 2.1
    - Estimativa: M (2-3h)
    - Notas: usar `prisma.user.findUnique({include: {health_profile: true}})` com `select` para excluir `password_hash`.
    - _Requirements: 5.5, 5.7, 5.8, 9.3, 12.4_

  - [ ] 4.3 Implementar endpoint PUT /api/v1/users/me/profile
    - Descrição: criar o endpoint para criar ou atualizar o perfil de saúde do usuário autenticado.
    - Critérios de aceitação:
      - `PUT /api/v1/users/me/profile` protegido por `jwtMiddleware`
      - Validação Zod com `healthProfileSchema`
      - user_id extraído de `request.user.id`
      - Operação upsert: cria se não existir, atualiza se existir
      - Retorna 200 com o perfil atualizado
      - Valores fora das faixas retornam 400
      - Timestamp `updated_at` atualizado automaticamente
    - Arquivos afetados: `fittools-backend/src/routes/user.routes.ts` (atualizar), `src/services/user.service.ts` (atualizar)
    - Dependências: 4.1, 4.2
    - Estimativa: M (3-4h)
    - Notas: usar `prisma.userHealthProfile.upsert()` com where `{user_id: userId}`, update `payload`, create `{user_id: userId, ...payload}`.
    - _Requirements: 5.2, 5.3, 5.4, 5.6, 5.7, 7.10_

  - [ ] 4.4 Implementar rate limiting
    - Descrição: configurar rate limiting por IP e por user_id para prevenir abuso.
    - Critérios de aceitação:
      - Plugin `@fastify/rate-limit` instalado e configurado
      - Limite global: 60 req/15min por IP para rotas não autenticadas
      - Limite autenticado: 300 req/15min por user_id
      - Limite específico do login: 5 req/15min por IP
      - Exceder o limite retorna 429 com header Retry-After
      - KeyGenerator customizado usa user_id se autenticado, senão IP
      - Whitelist para 127.0.0.1 (health checks)
    - Arquivos afetados: `fittools-backend/src/middlewares/rateLimit.ts` (criar), `src/server.ts` (registrar plugin), `src/routes/auth.routes.ts` (limite no login)
    - Dependências: 1.2, 2.6
    - Estimativa: M (3-4h)
    - Comando útil: `npm install @fastify/rate-limit`
    - Notas:
      - No MVP usar store em memória; produção futura usaria Redis. KeyGenerator: `(req) => req.user?.id || req.ip`.
      - Em produção a API fica atrás do Caddy; o rate limiting por IP só funciona corretamente com `trustProxy` ativo em produção (`env.NODE_ENV === 'production'`, Task 2.6, item 7). Sem isso, todos os visitantes compartilhariam o IP interno do Caddy e o mesmo contador.
      - Validar, após o primeiro deploy, que dois IPs diferentes têm contadores independentes (Task 11.6).
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

- [ ] 5. Fase 5: Frontend - Estrutura Base

  - [x] 5.1 Configurar Nuxt para SSG
    - Descrição: configurar o Nuxt 3 para Static Site Generation com rotas pré-renderizadas.
    - Critérios de aceitação:
      - `nuxt.config.ts` com `ssr: true`
      - `nitro.prerender.crawlLinks: true`
      - Rotas explícitas em `nitro.prerender.routes` (8 calculadoras + páginas estáticas)
      - Meta tags globais (lang, charset, viewport)
      - `npm run generate` gera HTML estático em `.output/public`
      - HTML gerado contém o conteúdo completo (não apenas shell vazio)
      - Robots e sitemap configurados (`@nuxtjs/robots`, `@nuxtjs/sitemap`)
    - Arquivos afetados: `fittools-frontend/nuxt.config.ts`, `package.json` (módulos)
    - Dependências: 1.3
    - Estimativa: M (2-3h)
    - Comandos úteis: `npm install @nuxtjs/sitemap @nuxtjs/robots`; `npx nuxi module add sitemap robots`
    - Notas: listar as 8 calculadoras em `prerender.routes`; configurar `sitemap.hostname` com o domínio de produção; confirmar que `npm run generate` produz `404.html` em `.output/public` (o Caddy o serve com status 404, Task 11.2); `.output/public` é o diretório enviado por `rsync` à VPS (Task 11.5).
    - Status: concluída. Verificado de fato com `npm run generate` (Nuxt 3.21.11): gerou `index.html` (com o conteúdo da home e `lang="pt-BR"`), `404.html`, `200.html`, `robots.txt` e `sitemap.xml` em `.output/public`. O `robots.txt` bloqueia `/login`, `/registro` e `/perfil` e aponta para `https://fittoolsbrasil.com.br/sitemap.xml`; o sitemap lista a home e fica sem as rotas privadas. Teste temporário com páginas descartáveis (removidas depois): `calculadora-de-imc` entrou sozinha no pré-render e no sitemap, `/login` foi gerado mas ficou fora do sitemap, e `NUXT_PUBLIC_SITE_URL` mudou o domínio no sitemap e no `robots.txt`. Solução para as rotas inexistentes: as 8 calculadoras ficam numa constante e só entram em `prerender.routes` as que já têm arquivo em `pages/`. Versões fixas: `@nuxtjs/sitemap` 8.6.2, `@nuxtjs/robots` 6.2.4, `zod` 3.23.8 e `@types/node` 20.19.43 (dev). As versões mais novas desses módulos (sitemap 9 e robots 7) exigem Nuxt 4, por isso ficamos nas majors anteriores. Ressalvas: o build mostra um aviso do Nitro sobre `cache-driver.js` que não impede nada; o domínio `fittoolsbrasil.com.br` ainda precisa ser confirmado como registrado.
    - _Requirements: 2.1, 2.7, 2.8, 2.9, 10.6_

  - [x] 5.2 Criar Pinia store (userStore)
    - Descrição: criar o store Pinia para gerenciar autenticação e dados do usuário.
    - Critérios de aceitação:
      - Store `userStore` em `stores/user.ts`
      - State: `token`, `user`, `healthProfile`, `isAuthenticated`
      - Actions: `login(token, user)`, `logout()`, `fetchUserData()`, `updateHealthProfile(profile)`
      - Token persistido em localStorage com a chave `fittools_auth_token`
      - `isAuthenticated` é computed verificando a existência do token
      - `fetchUserData()` busca `/api/v1/users/me` se houver token
      - `logout()` limpa o token do localStorage e reseta o state
    - Arquivos afetados: `fittools-frontend/stores/user.ts` (criar), `types/api.ts` (criar - interfaces User, HealthProfile)
    - Dependências: 1.3
    - Estimativa: M (3-4h)
    - Notas: usar `useLocalStorage()` do VueUse; computed `hasHealthProfile` e `userName`.
    - Status: concluída. Verificado de fato: 13 testes unitários (Vitest 3.2.7 + happy-dom) passando em `tests/unit/user-store.test.ts`, cobrindo sessão (login/logout), persistência no `localStorage` com a chave `fittools_auth_token` e valor puro (sem aspas JSON), recarregamento da página, `fetchUserData` (sucesso, sem perfil, 401 encerra a sessão, falha de rede e erro 500 mantêm a sessão) e `updateHealthProfile` (sucesso, 400 sobe o erro, 401 encerra a sessão). `nuxt typecheck` passou, e foi provado que ele enxerga o store (dois erros de tipo plantados num arquivo temporário foram detectados e o arquivo removido); `npm run generate` continua gerando as 7 rotas. Arquivos: `stores/user.ts`, `types/api.ts`, `vitest.config.ts`, `tests/unit/user-store.test.ts`. Decisões: (1) o store usa `$fetch` direto (e não o `useApi` da 5.5) para não haver dependência circular; (2) `useLocalStorage` com `initOnMounted` evita erro de hidratação, já que o HTML do SSG é sempre de visitante, então componentes que mudam conforme o login (ex.: Header, Task 5.4) devem usar `<ClientOnly>` ou só reagir depois de montados; (3) `flush: sync` grava o token na hora, e `listenToStorageChanges: false` porque o VueUse pausava a gravação até o próximo tick depois de cada escrita, e um logout logo após o login deixava o token no storage (descoberto pelos testes); o JWT é sem estado, então não há ganho de segurança em espelhar o logout entre abas. Dependências novas (versões exatas): `@vueuse/core` 15.0.0, e em dev `vitest` 3.2.7 (a 5.x exige Node 22+), `happy-dom` 21.0.3, `typescript` 5.9.3 e `vue-tsc` 3.3.13; scripts `test:unit` e `typecheck`. Atenção para a Fase 4: o Prisma devolve `Decimal` como texto no JSON, e `HealthProfile` espera `weight_kg` e `height_cm` como número, então o endpoint deve converter com `Number()`.
    - _Requirements: 8.1, 8.2, 8.3, 8.8, 8.10_

  - [ ] 5.3 Criar layouts (default, calculator)
    - Descrição: criar os layouts base para as páginas da plataforma.
    - Critérios de aceitação:
      - `default.vue` com Header + slot + Footer
      - `calculator.vue` com estrutura específica para calculadoras
      - Header exibe logo, navegação e botão Login (não autenticado) ou Avatar (autenticado)
      - Footer exibe links legais (Privacidade, Termos), redes sociais e copyright
      - Layouts responsivos (mobile-first)
      - Classes Tailwind CSS aplicadas
    - Arquivos afetados: `fittools-frontend/layouts/default.vue`, `layouts/calculator.vue` (criar)
    - Dependências: 1.3
    - Estimativa: M (3-4h)
    - Notas: Header deve usar `useRouter` e `navigateTo`; Footer sticky bottom em páginas curtas.
    - Status: Implementada; falta a revisão visual do usuário (não foi aberta num navegador). Entregue: `layouts/default.vue` (link 'Pular para o conteúdo', cabeçalho sticky com logo, menu 'Calculadoras' com as 8 páginas e login dentro de `<ClientOnly>` com 'Entrar' como fallback, ou avatar com a inicial e botão 'Sair' quando logado; rodapé com calculadoras, Política de Privacidade, Termos de Uso, e-mail de contato, redes sociais (lista vazia por enquanto, só aparece se houver itens) e copyright com o aviso de que a ferramenta não substitui orientação médica), `layouts/calculator.vue` (aninha o layout default via `<NuxtLayout name="default">` para o cabeçalho e o rodapé existirem uma vez só, e acrescenta o container e o aviso legal obrigatório do Requisito 11.3), `app.vue` agora com `<NuxtLayout>`, `assets/css/tailwind.css` (base, foco visível, botões `.btn`), `tailwind.config.ts` com a paleta do site antigo, e `utils/site.ts` como fonte única das 8 calculadoras, links legais, redes sociais e aviso legal. Verificado: `nuxt typecheck` passa; `npm run generate` gera 9 rotas sem erro de link quebrado; no HTML gerado da página de pré-visualização há exatamente 1 cabeçalho, 1 rodapé e 1 main, o aviso legal, os links /privacidade e /termos, 'Entrar' (visitante) e nenhum 'Sair'. NÃO verificado: aparência real, responsividade mobile, comportamento do menu e o estado logado. Pendências: a página provisória `pages/dev-preview-calculadora.vue` (privada, fora do sitemap e bloqueada no robots) deve ser removida, junto com a entrada em PRIVATE_ROUTES do nuxt.config.ts, quando a primeira calculadora existir; as páginas /privacidade e /termos ainda não existem (os links levam a 404 até serem criadas; o pré-render as ignora); na Task 5.4 o cabeçalho e o rodapé serão extraídos para componentes. O pré-render agora ignora (`nitro.prerender.ignore`) só as rotas conhecidas que ainda não têm arquivo em `pages/`, sem esconder erros reais.
    - _Requirements: 11.4, 14.3, 14.8_

  - [ ] 5.4 Criar componentes comuns (Header, Footer, Toast)
    - Descrição: criar componentes reutilizáveis para navegação e feedback.
    - Critérios de aceitação:
      - `Header.vue` com logo, menu de navegação e botão de autenticação
      - `Footer.vue` com links legais e redes sociais
      - `Toast.vue` para notificações (sucesso, erro, info)
      - Toast posicionado no top-right com animações de entrada/saída
      - Componentes totalmente tipados com TypeScript
      - Classes Tailwind CSS responsivas
    - Arquivos afetados: `fittools-frontend/components/Common/Header.vue`, `Footer.vue`, `Toast.vue` (criar)
    - Dependências: 5.3
    - Estimativa: M (3-4h)
    - Notas: Toast pode usar `@vueuse/core` para timeout automático; Header reage a `userStore.isAuthenticated`.
    - _Requirements: 9.5, 11.4, 14.3_

  - [ ] 5.5 Criar composable useApi
    - Descrição: criar o composable para chamadas à API backend com header de autenticação automático.
    - Critérios de aceitação:
      - `useApi()` retorna instância axios customizada
      - Base URL a partir de `NUXT_PUBLIC_API_BASE_URL`
      - Interceptor de request anexa `Authorization: Bearer <token>` se houver token
      - Interceptor de response trata 401 limpando o token e redirecionando para /login
      - Erros de rede com mensagens amigáveis
      - Tipos TypeScript para payloads e responses
    - Arquivos afetados: `fittools-frontend/composables/useApi.ts` (criar)
    - Dependências: 5.2
    - Estimativa: M (2-3h)
    - Comando útil: `npm install axios`
    - Notas: usar `useUserStore()` dentro do composable; `axios.interceptors.request.use()` e `axios.interceptors.response.use()`.
    - _Requirements: 8.5, 8.6, 9.7, 9.8_

  - [ ] 5.6 Criar middleware de autenticação
    - Descrição: criar o middleware Nuxt para proteger rotas autenticadas.
    - Critérios de aceitação:
      - `middleware/auth.ts` criado
      - Verifica `userStore.isAuthenticated`
      - Se não autenticado, redireciona para `/login` com `?redirect=<url_original>`
      - Aplicável via `definePageMeta({middleware: 'auth'})`
      - Executa apenas client-side (não no SSG build)
    - Arquivos afetados: `fittools-frontend/middleware/auth.ts` (criar)
    - Dependências: 5.2
    - Estimativa: S (1-2h)
    - Notas: usar `navigateTo()`; salvar a URL original com `navigateTo(\`/login?redirect=${to.path}\`)`.
    - _Requirements: 8.4_

  - [ ] 5.7 Criar página homepage (index.vue)
    - Descrição: criar a homepage com hero section e grid de calculadoras.
    - Critérios de aceitação:
      - `pages/index.vue` criada
      - Hero com título, subtítulo e CTA "Começar Agora"
      - Grid responsivo (2 colunas mobile, 4 desktop) com 8 cards de calculadoras
      - Cada card exibe ícone, título, descrição curta e link
      - Meta tags SEO (título, descrição, OG tags)
      - Lighthouse Performance ≥ 85 e SEO ≥ 95
    - Arquivos afetados: `fittools-frontend/pages/index.vue` (criar)
    - Dependências: 5.3
    - Estimativa: M (3-4h)
    - Notas: usar `useHead()` para meta tags; cards com `<NuxtLink>` para navegação client-side.
    - _Requirements: 2.2, 2.5, 12.1, 14.2_

- [ ] 6. Fase 6: Frontend - Autenticação

  - [ ] 6.1 Criar página de login (/login)
    - Descrição: criar a página de login com formulário de email/senha.
    - Critérios de aceitação:
      - `pages/login.vue` criada
      - Formulário com campos email e password
      - Validação client-side (formato de email, senha mínima)
      - Submissão chama `POST /api/v1/auth/login` via useApi
      - Sucesso: salva o token no userStore e redireciona para /perfil ou para o query param `redirect`
      - Erro: mensagem abaixo do formulário
      - Link "Não tem conta? Registre-se" para /registro
      - Meta tags SEO
    - Arquivos afetados: `fittools-frontend/pages/login.vue` (criar)
    - Dependências: 5.5, 5.2
    - Estimativa: M (3-4h)
    - Notas: usar `useState()` para o loading state; spinner no botão durante a submissão.
    - _Requirements: 4.1, 8.2, 9.6_

  - [ ] 6.2 Criar página de registro (/registro)
    - Descrição: criar a página de registro com formulário de nome/email/senha.
    - Critérios de aceitação:
      - `pages/registro.vue` criada
      - Formulário com campos name, email, password
      - Validação client-side (nome ≥ 2 chars, email válido, senha forte)
      - Feedback visual de força de senha (fraco/médio/forte)
      - Submissão chama `POST /api/v1/auth/register` via useApi
      - Sucesso: salva o token no userStore e redireciona para /perfil
      - Erro: mensagens inline específicas por campo
      - Link "Já tem conta? Faça login" para /login
    - Arquivos afetados: `fittools-frontend/pages/registro.vue` (criar)
    - Dependências: 5.5, 5.2
    - Estimativa: M (3-4h)
    - Notas: indicador de força com zxcvbn ou regex simples; exibir os requisitos de senha (8+ chars, maiúscula, minúscula, número).
    - _Requirements: 4.4, 4.5, 4.8, 9.6_

  - [ ] 6.3 Criar componentes de formulário de autenticação
    - Descrição: extrair componentes reutilizáveis para os formulários de auth.
    - Critérios de aceitação:
      - `Auth/LoginForm.vue` encapsula a lógica de login
      - `Auth/RegisterForm.vue` encapsula a lógica de registro
      - Componentes emitem os eventos `@success` e `@error`
      - Validação inline com mensagens de erro
      - Estados de loading com spinners
      - Acessibilidade: labels, aria-attributes e focus management
    - Arquivos afetados: `fittools-frontend/components/Auth/LoginForm.vue`, `RegisterForm.vue` (criar)
    - Dependências: 6.1, 6.2
    - Estimativa: M (3-4h)
    - Notas: usar `<form @submit.prevent>`; `input type="email"` para o teclado mobile correto.
    - _Requirements: 9.6_

  - [ ] 6.4 Implementar auto-login na inicialização
    - Descrição: verificar o token no localStorage e buscar os dados do usuário ao iniciar a aplicação.
    - Critérios de aceitação:
      - Plugin Nuxt `plugins/auth-init.ts` criado
      - Executa na inicialização client-side
      - Verifica se o token existe no localStorage
      - Se existe, chama `userStore.fetchUserData()`
      - Se `fetchUserData` retornar 401, limpa o token e reseta o store
      - Não bloqueia a renderização (assíncrono)
    - Arquivos afetados: `fittools-frontend/plugins/auth-init.ts` (criar)
    - Dependências: 5.2, 5.5
    - Estimativa: M (2-3h)
    - Notas: usar `defineNuxtPlugin()` com callback async; try/catch para erros de rede.
    - _Requirements: 8.3, 8.6_

- [ ] 7. Fase 7: Frontend - Calculadoras

  - [ ] 7.1 Migrar composable useScience.ts
    - Descrição: migrar todas as fórmulas de `assets/js/science.js` para um composable TypeScript.
    - Critérios de aceitação:
      - `useScience()` em `composables/useScience.ts`
      - 8 calculadoras migradas: IMC, Calorias, Proteína, Gordura Corporal, 1RM, Frequência Cardíaca, Hidratação, Pace
      - Funções exportadas: `computeBMI()`, `classifyBMI()`, `computeBMR()`, `computeTDEE()`, `proteinRange()`, `bodyFatNavy()`, `compute1RM()`, `generate1RMTable()`, `hrZones()`, `waterIntake()`, `pace()`, `riegelProjection()`
      - Função auxiliar `round(n, decimals)` exportada
      - Interfaces TypeScript para todos os retornos
      - Comentários JSDoc com fórmulas e referências científicas
      - Precisão numérica idêntica ao `science.js` original
      - As fórmulas são implementadas como funções puras de TypeScript, sem dependência de Vue, Nuxt, DOM ou estado reativo (sem `ref`, `useRuntimeConfig`, `window`); o `useScience()` apenas as expõe ao Vue. Os testes unitários rodam em ambiente Node (Vitest) sem montar componentes.
    - Arquivos afetados: `fittools-frontend/composables/useScience.ts` (criar), `types/calculators.ts` (criar - interfaces)
    - Dependências: 1.3
    - Estimativa: L (6-8h)
    - Notas: cada função com JSDoc e referência científica; usar `Math.pow()` e `Math.round()`; retornar objetos tipados, não primitivos soltos.
    - Notas: isso mantém as fórmulas portáveis: permite movê-las para um pacote compartilhado ou para o backend no pós-MVP sem reescrever nem divergir resultados (ver item pós-MVP nas Notas).
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 8.7, 12.10, 14.1_

  - [ ] 7.2 Criar testes unitários das fórmulas
    - Descrição: criar testes unitários verificando a precisão das fórmulas científicas.
    - Critérios de aceitação:
      - Suite `tests/unit/useScience.test.ts` com Vitest
      - Testes para as 8 calculadoras com pares entrada/saída conhecidos
      - Casos baseados em literatura científica
      - Testes de valores extremos mas válidos
      - Cobertura de código ≥ 90% para `useScience.ts`
      - Todos passam com `npm run test:unit`
    - Arquivos afetados: `fittools-frontend/tests/unit/useScience.test.ts`, `vitest.config.ts` (criar)
    - Dependências: 7.1
    - Estimativa: M (4-5h)
    - Comando útil: `npm install vitest @vue/test-utils --save-dev`
    - Notas: usar `describe()` e `it()`; comparar com tolerância `expect(result).toBeCloseTo(expected, 1)`.
    - _Requirements: 13.1, 14.1, 14.6_

  - [ ]* 7.3 Criar property-based tests das fórmulas
    - Descrição: criar property-based tests verificando propriedades matemáticas universais. Opcional para o lançamento inicial; pode ser adiada para v1.1.
    - Critérios de aceitação:
      - Testes com fast-check em `tests/properties/useScience.property.test.ts`
      - Propriedade: IMC sempre positivo para entradas válidas
      - Propriedade: round-trip do IMC preserva o valor original
      - Propriedade: TMB/TDEE seguem a relação matemática correta
      - Propriedade: 1RM monotônico (mais peso → maior 1RM)
      - Propriedade: idempotência (mesma entrada → mesma saída)
      - Mínimo de 100 iterações por propriedade
    - Arquivos afetados: `fittools-frontend/tests/properties/useScience.property.test.ts` (criar)
    - Dependências: 7.1
    - Estimativa: L (6-8h)
    - Comando útil: `npm install fast-check --save-dev`
    - Notas: usar `fc.assert(fc.property(...))`; generators `fc.float({min, max})` e `fc.integer({min, max})`; cada propriedade deve mapear para propriedades do design.
    - _Requirements: 1.12, 1.13, 13.7_

  - [ ] 7.4 Criar componentes reutilizáveis de calculadora
    - Descrição: criar componentes reutilizáveis para formulários e resultados das calculadoras.
    - Critérios de aceitação:
      - `Calculator/Form.vue` aceita a prop `fields` (array de config de campos)
      - `Calculator/Field.vue` renderiza um campo individual com validação
      - `Calculator/Result.vue` exibe resultado com headline, classificação e cards informativos
      - `Calculator/ScientificRef.vue` exibe a caixa de citações científicas
      - Componentes totalmente tipados com TypeScript
      - Validação inline com feedback visual (vermelho para erro, verde para válido)
      - Componentes acessíveis (labels, aria-*, roles)
    - Arquivos afetados: `fittools-frontend/components/Calculator/Form.vue`, `Field.vue`, `Result.vue`, `ScientificRef.vue` (criar)
    - Dependências: 7.1
    - Estimativa: L (6-8h)
    - Notas: Form usa slots para customização; Field suporta number, select e radio; Result usa `tone` para cores (good/warn/bad/info).
    - _Requirements: 8.9, 9.10, 11.2, 11.6, 14.3_

  - [ ] 7.5 Criar página /calculadora-de-imc
    - Descrição: implementar a página da calculadora de IMC com SSG e meta tags.
    - Critérios de aceitação:
      - `pages/calculadora-de-imc.vue` criada
      - Meta tags únicas (título, descrição, OG tags, canonical URL)
      - JSON-LD (WebApplication + FAQPage)
      - Formulário com peso (kg) e altura (cm)
      - Validação client-side (30-300kg, 120-230cm)
      - Cálculo instantâneo com `useScience().computeBMI()`
      - Resultado exibe IMC, classificação WHO e faixa de peso ideal
      - Caixa de referências científicas (WHO 2000)
      - Aviso legal "Não substitui orientação médica"
      - Lighthouse SEO ≥ 95 e Performance ≥ 85
    - Arquivos afetados: `fittools-frontend/pages/calculadora-de-imc.vue` (criar)
    - Dependências: 7.1, 7.4, 5.3
    - Estimativa: M (3-4h)
    - Notas: usar `useHead()` para meta tags; pré-preencher campos se `userStore.hasHealthProfile` (ver Task 8.2).
    - _Requirements: 1.1, 2.2, 2.3, 2.4, 2.10, 11.1, 11.3, 11.6_

  - [ ] 7.6 Criar página /calculadora-de-calorias
    - Descrição: implementar a página da calculadora de calorias (TMB/TDEE).
    - Critérios de aceitação:
      - `pages/calculadora-de-calorias.vue` criada
      - Formulário com sexo, peso, altura, idade e nível de atividade
      - Cálculo com `computeBMR()` e `computeTDEE()`
      - Resultado exibe TMB, TDEE e breakdown por objetivo (déficit/manutenção/superávit)
      - Referências científicas (Mifflin-St Jeor 1990)
      - Meta tags e JSON-LD
      - Lighthouse SEO ≥ 95
    - Arquivos afetados: `fittools-frontend/pages/calculadora-de-calorias.vue` (criar)
    - Dependências: 7.1, 7.4
    - Estimativa: M (3-4h)
    - Notas: O site antigo NÃO tem página de calorias (a pasta `html/` tem só 1rm, agua, frequencia-cardiaca, gordura-corporal, imc, pace e proteina; existe apenas a lógica em `assets/js/calculators.js`). Esta página é NOVA: o texto editorial (explicação da fórmula Mifflin-St Jeor, tabela de fatores de atividade, FAQ, referências e JSON-LD) deve ser escrito do zero na Fase 7, não migrado.
    - _Requirements: 1.2, 2.2, 2.3, 11.1, 11.3_

  - [ ] 7.7 Criar página /calculadora-de-proteina
    - Descrição: implementar a página da calculadora de proteína.
    - Critérios de aceitação:
      - `pages/calculadora-de-proteina.vue` criada
      - Formulário com peso e objetivo fitness
      - Cálculo com `proteinRange()`
      - Resultado exibe a faixa diária (min-max g) e a faixa por kg
      - Exemplos de alimentos ricos em proteína
      - Referências científicas (ISSN 2017)
      - Meta tags e structured data
    - Arquivos afetados: `fittools-frontend/pages/calculadora-de-proteina.vue` (criar)
    - Dependências: 7.1, 7.4
    - Estimativa: M (3-4h)
    - _Requirements: 1.3, 2.2, 2.3, 11.1, 11.3_

  - [ ] 7.8 Criar página /calculadora-de-gordura-corporal
    - Descrição: implementar a página da calculadora de gordura corporal (US Navy).
    - Critérios de aceitação:
      - `pages/calculadora-de-gordura-corporal.vue` criada
      - Formulário com sexo, altura, pescoço, cintura e quadril (se feminino)
      - Cálculo com `bodyFatNavy()`
      - Resultado exibe o percentual de gordura e a classificação (atlético/fitness/média/obesidade)
      - Referências científicas (US Navy 1984)
      - Meta tags e structured data
    - Arquivos afetados: `fittools-frontend/pages/calculadora-de-gordura-corporal.vue` (criar)
    - Dependências: 7.1, 7.4
    - Estimativa: M (3-4h)
    - _Requirements: 1.4, 2.2, 2.3, 11.1, 11.3_

  - [ ] 7.9 Criar página /calculadora-de-1rm
    - Descrição: implementar a página da calculadora de 1RM (uma repetição máxima).
    - Critérios de aceitação:
      - `pages/calculadora-de-1rm.vue` criada
      - Formulário com peso levantado e repetições
      - Cálculo com `compute1RM()` e `generate1RMTable()`
      - Resultado exibe o 1RM estimado e a tabela de percentuais (100%, 95%, 90%...)
      - Referências científicas (Brzycki 1993, Epley 1985)
      - Meta tags e structured data
    - Arquivos afetados: `fittools-frontend/pages/calculadora-de-1rm.vue` (criar)
    - Dependências: 7.1, 7.4
    - Estimativa: M (3-4h)
    - _Requirements: 1.5, 2.2, 2.3, 11.3_

  - [ ] 7.10 Criar página /calculadora-de-frequencia-cardiaca
    - Descrição: implementar a página da calculadora de frequência cardíaca (zonas de treino).
    - Critérios de aceitação:
      - `pages/calculadora-de-frequencia-cardiaca.vue` criada
      - Formulário com idade e FC de repouso
      - Cálculo com `hrZones()`
      - Resultado exibe a FC máxima e as 5 zonas de treino (Z1-Z5) com ranges
      - Descrição de cada zona (recuperação, aeróbico, limiar, VO2max, anaeróbico)
      - Referências científicas (Tanaka 2001, Karvonen 1957)
      - Meta tags e structured data
    - Arquivos afetados: `fittools-frontend/pages/calculadora-de-frequencia-cardiaca.vue` (criar)
    - Dependências: 7.1, 7.4
    - Estimativa: M (3-4h)
    - _Requirements: 1.6, 2.2, 2.3, 11.1, 11.3_

  - [ ] 7.11 Criar página /calculadora-de-agua
    - Descrição: implementar a página da calculadora de hidratação (ingestão de água).
    - Critérios de aceitação:
      - `pages/calculadora-de-agua.vue` criada
      - Formulário com peso e minutos de exercício
      - Cálculo com `waterIntake()`
      - Resultado exibe a ingestão total e o breakdown (base + exercício)
      - Dicas de hidratação (antes/durante/depois do treino)
      - Referências científicas (ACSM 2007)
      - Meta tags e structured data
    - Arquivos afetados: `fittools-frontend/pages/calculadora-de-agua.vue` (criar)
    - Dependências: 7.1, 7.4
    - Estimativa: M (3-4h)
    - Notas: A URL é /calculadora-de-agua (igual à do site antigo). O nome "hidratação" é só o título da página.
    - _Requirements: 1.7, 2.2, 2.3, 11.1, 11.3_

  - [ ] 7.12 Criar página /calculadora-de-pace
    - Descrição: implementar a página da calculadora de pace (ritmo de corrida).
    - Critérios de aceitação:
      - `pages/calculadora-de-pace.vue` criada
      - Formulário com distância (km) e tempo (min:seg)
      - Cálculo com `pace()` e `riegelProjection()`
      - Resultado exibe o pace médio (min/km) e projeções para 5k, 10k, 21k e 42k
      - Referências científicas (Riegel 1981)
      - Meta tags e structured data
    - Arquivos afetados: `fittools-frontend/pages/calculadora-de-pace.vue` (criar)
    - Dependências: 7.1, 7.4
    - Estimativa: M (3-4h)
    - _Requirements: 1.8, 2.2, 2.3, 11.1, 11.3_

- [ ] 8. Fase 8: Frontend - Perfil de Usuário

  - [ ] 8.1 Criar página /perfil
    - Descrição: criar a página de perfil do usuário autenticado com formulário de health profile.
    - Critérios de aceitação:
      - `pages/perfil.vue` criada
      - Middleware `auth` aplicado (redireciona para /login se não autenticado)
      - Exibe dados do usuário (nome, email) somente leitura
      - Formulário editável do health profile: peso, altura, idade, sexo, nível de atividade, objetivo
      - Campos pré-preenchidos se o perfil existir
      - Botão "Salvar Perfil" chama `PUT /api/v1/users/me/profile`
      - Sucesso exibe o toast "Perfil atualizado com sucesso!"
      - Erro exibe mensagens inline
      - Meta tag robots noindex (página privada)
    - Arquivos afetados: `fittools-frontend/pages/perfil.vue` (criar)
    - Dependências: 5.6, 5.5, 5.2
    - Estimativa: L (4-6h)
    - Notas: usar `definePageMeta({middleware: 'auth'})`; v-model bidirecional; spinner no botão durante o save.
    - _Requirements: 5.2, 5.5, 5.6, 8.4, 9.5, 9.6_

  - [ ] 8.2 Implementar pré-preenchimento das calculadoras
    - Descrição: pré-preencher os campos das calculadoras com dados do health profile se o usuário estiver autenticado.
    - Critérios de aceitação:
      - Composable `useProfileAutofill()` criado
      - Verifica `userStore.hasHealthProfile`
      - Se houver perfil, retorna valores pré-preenchidos para peso, altura, idade e sexo
      - As calculadoras usam o composable para inicializar os campos
      - O usuário pode editar os valores pré-preenchidos
      - Visitantes anônimos veem campos vazios
    - Arquivos afetados: `fittools-frontend/composables/useProfileAutofill.ts` (criar); as 8 páginas de calculadoras (atualizar)
    - Dependências: 8.1, 7.5 a 7.12
    - Estimativa: M (3-4h)
    - Notas: composable reativo ao userStore; usar `watchEffect()` para atualizar os campos quando o perfil carregar.
    - _Requirements: 8.10, 5.5_

  - [ ] 8.3 Adicionar avatar e dropdown de usuário no Header
    - Descrição: adicionar avatar e menu dropdown no Header para usuários autenticados.
    - Critérios de aceitação:
      - Header exibe o avatar (iniciais do nome) se `userStore.isAuthenticated`
      - Clique no avatar abre dropdown com os links Perfil e Logout
      - Logout chama `userStore.logout()` e redireciona para a homepage
      - Dropdown fecha ao clicar fora (click outside do VueUse)
      - Animação suave de abertura/fechamento
      - Responsivo em mobile
    - Arquivos afetados: `fittools-frontend/components/Common/Header.vue` (atualizar)
    - Dependências: 5.4, 5.2
    - Estimativa: M (2-3h)
    - Notas: iniciais com `user.name.split(' ').map(n => n[0]).join('')`; usar `onClickOutside` do VueUse.
    - _Requirements: 8.1, 8.10_

- [ ] 9. Fase 9: SEO e Performance

  - [ ] 9.1 Implementar meta tags dinâmicas em todas as páginas
    - Descrição: garantir que todas as páginas têm meta tags únicas e otimizadas.
    - Critérios de aceitação:
      - As 8 calculadoras têm títulos únicos (máx. 60 caracteres)
      - Todas as páginas têm descrições únicas (máx. 160 caracteres)
      - Todas as páginas têm OG tags (og:title, og:description, og:type, og:url, og:image)
      - Todas as páginas têm Twitter Card tags
      - Canonical URLs configuradas
      - Robots meta configurado (index para públicas, noindex para privadas)
    - Arquivos afetados: todas as páginas (atualizar `useHead()`)
    - Dependências: 7.5 a 7.12, 8.1
    - Estimativa: M (3-4h)
    - Notas: criar constante com os metadados de cada página; OG images podem ser placeholder por enquanto.
    - _Requirements: 2.2, 2.4, 14.4_

  - [ ] 9.2 Implementar JSON-LD structured data
    - Descrição: adicionar structured data em todas as calculadoras para rich results.
    - Critérios de aceitação:
      - Schema `WebApplication` em todas as calculadoras
      - Schema `FAQPage` com perguntas frequentes relevantes
      - Validação com a ferramenta de dados estruturados do Google sem erros
      - JSON-LD injetado via `useHead()` com script `application/ld+json`
    - Arquivos afetados: as 8 páginas de calculadoras (atualizar)
    - Dependências: 9.1
    - Estimativa: M (3-4h)
    - Notas: criar helper `generateStructuredData(type, data)`; as FAQs devem ter perguntas reais que usuários fazem.
    - _Requirements: 2.3, 11.7, 14.4_

  - [ ] 9.3 Gerar sitemap.xml e robots.txt
    - Descrição: configurar a geração automática de sitemap.xml e robots.txt.
    - Critérios de aceitação:
      - `sitemap.xml` gerado em build com todas as rotas públicas
      - Rotas privadas (/perfil, /login, /registro) excluídas do sitemap
      - Prioridades: homepage 1.0, calculadoras 0.9, outras 0.5
      - Changefreq: homepage weekly, calculadoras monthly
      - `robots.txt`: Allow `/`, Disallow `/perfil` `/login` `/registro`
      - URL do sitemap incluída no `robots.txt`
    - Arquivos afetados: `fittools-frontend/nuxt.config.ts` (módulo sitemap), `public/robots.txt` (criar)
    - Dependências: 5.1
    - Estimativa: S (1-2h)
    - Notas: o módulo `@nuxtjs/sitemap` já deve estar instalado (Task 5.1); configurar `sitemap.hostname` com o domínio de produção.
    - _Requirements: 2.1, 2.10_

  - [ ] 9.4 Otimizar performance (code splitting, lazy loading)
    - Descrição: aplicar otimizações de performance para melhorar os scores do Lighthouse.
    - Critérios de aceitação:
      - Code splitting por rota habilitado (automático no Nuxt)
      - Componentes pesados lazy-loaded com `defineAsyncComponent`
      - Imagens (se existirem) usam `<NuxtImg>` com lazy loading
      - Fontes otimizadas com `font-display: swap`
      - CSS crítico inline, resto defer
      - Bundle JavaScript inicial < 200KB gzipped
      - Lighthouse Performance ≥ 85 em todas as páginas (mobile)
    - Arquivos afetados: `fittools-frontend/nuxt.config.ts` (otimizações), componentes pesados (lazy loading)
    - Dependências: 9.1, 9.2
    - Estimativa: M (3-4h)
    - Notas: `defineAsyncComponent(() => import('./Component.vue'))`; analisar o bundle com `npx nuxi analyze`.
    - _Requirements: 12.1, 12.2, 12.9, 2.6_

  - [ ] 9.5 Realizar auditorias Lighthouse e corrigir issues
    - Descrição: executar auditorias Lighthouse em todas as páginas e corrigir os problemas encontrados.
    - Critérios de aceitação:
      - Lighthouse executado em 10 páginas principais (homepage + 8 calculadoras + perfil)
      - Performance ≥ 85 (mobile) em todas
      - SEO ≥ 95 em todas as páginas públicas
      - Accessibility ≥ 90 em todas
      - Best Practices ≥ 90 em todas
      - Relatórios salvos em `docs/lighthouse-reports/`
    - Arquivos afetados: múltiplas páginas (correções), `docs/lighthouse-reports/` (criar)
    - Dependências: 9.4
    - Estimativa: M (3-4h)
    - Comando útil: `npx lighthouse https://localhost:3000 --view`
    - Notas: rodar em modo incógnito; usar throttling 4G mobile.
    - _Requirements: 2.5, 2.6, 12.1_

- [ ] 10. Fase 10: Testes E2E

  - [ ] 10.1 Configurar Playwright para testes E2E
    - Descrição: instalar e configurar o Playwright para testes end-to-end.
    - Critérios de aceitação:
      - `@playwright/test` instalado
      - `playwright.config.ts` criado
      - Browsers instalados (Chromium, Firefox, WebKit)
      - Base URL `http://localhost:3000`
      - Scripts npm `test:e2e` e `test:e2e:ui`
      - Pasta `tests/e2e/` criada
    - Arquivos afetados: `fittools-frontend/playwright.config.ts` (criar), `package.json` (scripts)
    - Dependências: 1.3
    - Estimativa: S (1-2h)
    - Comandos úteis: `npm install @playwright/test --save-dev`; `npx playwright install`
    - Notas: configurar retry 1 (falhas intermitentes) e workers 3.
    - _Requirements: 13.10_

  - [ ] 10.2 Criar testes E2E de autenticação
    - Descrição: criar testes E2E para os fluxos de registro e login.
    - Critérios de aceitação:
      - Registro com credenciais válidas → sucesso → redireciona para /perfil
      - Registro com email duplicado → erro 409
      - Login com credenciais válidas → sucesso → redireciona para a página anterior
      - Login com credenciais inválidas → erro 401
      - Logout → token removido → redireciona para a homepage
      - Todos passam com `npm run test:e2e`
    - Arquivos afetados: `fittools-frontend/tests/e2e/auth.spec.ts` (criar)
    - Dependências: 10.1, 6.1, 6.2
    - Estimativa: M (3-4h)
    - Notas: `page.goto()`, `page.fill()`, `page.click()`, `expect(page).toHaveURL()`; helper de email único `test-${Date.now()}@exemplo.com`.
    - _Requirements: 13.10_

  - [ ] 10.3 Criar testes E2E de calculadoras
    - Descrição: criar testes E2E para as jornadas de uso das calculadoras.
    - Critérios de aceitação:
      - Visitante anônimo acessa a calculadora de IMC → preenche campos → vê o resultado
      - Usuário autenticado acessa uma calculadora → campos pré-preenchidos com o perfil
      - Entrada inválida → exibe mensagem de erro
      - Testes para pelo menos 3 calculadoras (IMC, Calorias, 1RM)
      - Todos passam
    - Arquivos afetados: `fittools-frontend/tests/e2e/calculators.spec.ts` (criar)
    - Dependências: 10.1, 7.5 a 7.12
    - Estimativa: M (3-4h)
    - Notas: `page.locator()` para selecionar elementos; verificar resultados com `expect(page.locator('.result')).toContainText()`.
    - _Requirements: 13.4, 13.10_

  - [ ] 10.4 Criar testes E2E de perfil de usuário
    - Descrição: criar testes E2E para o gerenciamento de perfil.
    - Critérios de aceitação:
      - Usuário cria perfil de saúde → salva → toast de sucesso
      - Usuário atualiza perfil existente → salva → dados persistidos
      - Validação de campos do perfil → erro inline para dados inválidos
      - Middleware auth redireciona o visitante para /login ao acessar /perfil
      - Todos passam
    - Arquivos afetados: `fittools-frontend/tests/e2e/profile.spec.ts` (criar)
    - Dependências: 10.1, 8.1
    - Estimativa: M (2-3h)
    - Notas: usar `storageState` do Playwright para compartilhar a sessão autenticada; limpar o DB de teste entre execuções.
    - _Requirements: 13.10, 8.4_

- [ ] 11. Fase 11: Deploy (VPS Hetzner + Docker)
  - Modelo de hospedagem (decisão do projeto): uma única VPS da Hetzner administrada pelo time, com `docker compose` orquestrando Caddy (HTTPS automático e servidor dos arquivos estáticos do frontend), API Fastify e PostgreSQL 15. O frontend não tem container: o Caddy serve diretamente `.output/public` gerado por `nuxt generate`. Plataformas gerenciadas não são usadas. Detalhes de referência (Dockerfile, compose, Caddyfile, scripts de backup e workflow) estão nas seções "Implantação" e "Decisões Técnicas" do `design.md`.
  - Divisão de responsabilidades: cada tarefa indica o que é feito pelo usuário (conta, DNS, painel, acesso à VPS) e o que é código no repositório. Preços, tipos de servidor e regiões da Hetzner: confirmar no site da Hetzner antes de contratar.
  - Ordem sugerida: 11.1 → 11.2 → 11.3 → 11.4 → 11.5 → 11.6. As tarefas 11.1 e 11.2 (código) e as ações do usuário da 11.3 (conta Hetzner, domínio e DNS) podem ser adiantadas em paralelo com as fases de frontend.

  - [ ] 11.1 Criar Dockerfile multi-stage da API e .dockerignore
    - Descrição: empacotar a API Fastify em uma imagem Docker enxuta e segura, com build multi-stage, execução sem root, `HEALTHCHECK` e sem rodar migrations no `CMD` (as migrations são uma etapa explícita do deploy).
    - Responsabilidades:
      - Código no repositório: `Dockerfile` e `.dockerignore` do backend, ajustes no `package.json`.
      - Usuário: executar o build e o teste local da imagem (requer Docker Desktop da Task 2.1b).
    - Critérios de aceitação:
      - `fittools-backend/Dockerfile` com dois estágios: `builder` (todas as dependências, `prisma generate` e `npm run build` com `tsc`) e `runner` (apenas dependências de produção, Prisma Client gerado e `dist/`)
      - Imagem base `node:20-alpine`, com `openssl` instalado (necessário para os engines do Prisma no Alpine)
      - `prisma` (CLI, versão exata 5.22.0) disponível na imagem final via `dependencies` (Task 2.6, item 8); `npx prisma migrate deploy` funciona dentro do container
      - Container executa como usuário `node` (sem root)
      - `HEALTHCHECK` consultando `GET /health` em `127.0.0.1:3001`
      - `CMD ["node", "dist/server.js"]` em formato exec (Node como PID 1, recebendo SIGTERM para desligamento gracioso); nenhuma migration no `CMD`
      - `fittools-backend/.dockerignore` excluindo `node_modules`, `dist`, `.env`, `.env.*` (exceto `.env.example`), `tests`, `*.log` e `.git`
      - Confirmado que o `.env` não entra na imagem (`docker run --rm <imagem> ls -a /app`)
      - `docker build` conclui sem erros e a imagem inicia localmente apontando para o PostgreSQL de desenvolvimento
      - Saída do `tsc` compatível com `node dist/server.js` (confirmar `outDir`, `module` CommonJS e caminho de `server.js` em `dist/`)
      - `trustProxy` ativo em produção (condicionado a `env.NODE_ENV === 'production'`, Task 2.6, item 7) na instância Fastify antes de gerar a imagem de produção; a imagem deve rodar com `NODE_ENV=production` (definido no `Dockerfile` ou no `.env` de produção), caso contrário o `trustProxy` fica desativado
    - Arquivos afetados: `fittools-backend/Dockerfile`, `fittools-backend/.dockerignore` (criar), `package.json` (`prisma` em `dependencies`, se ainda não feito na 2.6), `tsconfig.json` (verificar `outDir`/`module`)
    - Dependências: 2.2, 2.6, 4.4
    - Estimativa: M (2-3h)
    - Comandos úteis (PowerShell): `docker build -t fittools-api:local .`; `docker run --rm -p 3001:3001 --env-file .env fittools-api:local`; `curl http://localhost:3001/health`; `docker run --rm fittools-api:local ls -a /app`; `docker run --rm fittools-api:local whoami`
    - Notas:
      - Referência completa: seção "Dockerfile da API" do `design.md`.
      - Dentro de um container, `localhost` na `DATABASE_URL` aponta para o próprio container; ao testar localmente use `host.docker.internal`.
      - Copiar `package.json`/`package-lock.json` antes do código para aproveitar o cache de camadas.
      - As migrations rodam no deploy via `docker compose run --rm migrate` (Tasks 11.2 e 11.5), evitando que reinícios ou réplicas tentem migrar o banco ao mesmo tempo.
    - _Requirements: 10.1, 10.10_

  - [ ] 11.2 Criar docker-compose.yml de produção, Caddyfile e modelo de .env
    - Descrição: criar a stack de produção (Caddy + API + PostgreSQL) com redes isoladas, o Caddyfile com HTTPS automático, headers de cache/segurança e fallback 404 correto, e o modelo do `.env` de produção (sem segredos reais).
    - Responsabilidades:
      - Código no repositório: `deploy/docker-compose.yml`, `deploy/Caddyfile` e `deploy/.env.production.example`.
      - Usuário: gerar os segredos reais de produção (senha do banco e `JWT_SECRET`) e gravá-los somente no `/opt/fittools/.env` do servidor (Task 11.3); definir o e-mail de contato do Let's Encrypt no Caddyfile.
    - Critérios de aceitação:
      - `deploy/docker-compose.yml` define `caddy` (`caddy:2-alpine`, portas 80 e 443), `api` (imagem `ghcr.io/<usuario-em-minusculas>/fittools-api:${API_TAG:-latest}`), `db` (`postgres:15-alpine`) e `migrate` (mesma imagem da API, `npx prisma migrate deploy`, `profiles: ["tools"]`, `restart: "no"`)
      - Somente o Caddy publica portas no host (80 e 443); API (3001) e PostgreSQL (5432) não têm `ports`
      - Redes: `edge` (Caddy ↔ API) e `backend` com `internal: true` (API ↔ PostgreSQL, sem acesso à internet)
      - Volumes nomeados `pgdata`, `caddy_data` (certificados TLS; não apagar) e `caddy_config`
      - `restart: unless-stopped` em `caddy`, `api` e `db`; `db` com `healthcheck` (`pg_isready`); `api` com `depends_on: db: condition: service_healthy`; Caddy sem `depends_on` da API (o frontend estático permanece no ar se a API cair)
      - Rotação de logs do Docker (`json-file`, `max-size: 10m`, `max-file: 3`) em todos os serviços
      - `deploy/Caddyfile` com três blocos: `www.fittoolsbrasil.com.br` (redirect permanente para o domínio principal), `fittoolsbrasil.com.br` (arquivos estáticos de `/srv/releases/current`) e `api.fittoolsbrasil.com.br` (`reverse_proxy api:3001` com `health_uri /health`)
      - Frontend no Caddy: `encode zstd gzip`; `Cache-Control: public, max-age=31536000, immutable` para `/_nuxt/*`; `Cache-Control: public, max-age=0, must-revalidate` para as demais rotas; `try_files {path} {path}/index.html`; headers `Strict-Transport-Security`, `X-Content-Type-Options` e `Referrer-Policy`; remoção do header `Server`
      - Rotas inexistentes servem `404.html` com status HTTP 404 (via `handle_errors`), evitando "soft 404" no Google; confirmado que `nuxt generate` produz `404.html`
      - `deploy/.env.production.example` com `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL` (host `db`), `JWT_SECRET`, `JWT_EXPIRATION_DAYS`, `PORT`, `HOST`, `NODE_ENV=production`, `CORS_ORIGIN` (domínio principal e `www`, separados por vírgula) e `API_TAG`, apenas com placeholders e instruções de geração (`openssl rand -hex 24` para a senha do banco, `openssl rand -base64 48` para o `JWT_SECRET`)
      - Nenhum segredo real versionado; `.env` de produção listado no `.gitignore`
      - `docker compose -f deploy/docker-compose.yml config` valida o arquivo sem erros
    - Arquivos afetados: `deploy/docker-compose.yml`, `deploy/Caddyfile`, `deploy/.env.production.example` (criar), `.gitignore` (atualizar)
    - Dependências: 11.1, 5.1
    - Estimativa: M (3-4h)
    - Comandos úteis:
      - `docker compose -f deploy/docker-compose.yml --env-file deploy/.env.production.example config`
      - `docker run --rm -v ${PWD}/deploy/Caddyfile:/etc/caddy/Caddyfile:ro caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile`
    - Notas:
      - Referências completas: seções "docker-compose.yml de Produção", "Caddyfile" e "Arquivo `.env` de produção" do `design.md`.
      - Usar senha hexadecimal para o banco, evitando URL-encoding na `DATABASE_URL`.
      - `NUXT_PUBLIC_API_BASE_URL` e `NUXT_PUBLIC_SITE_URL` são embutidas no HTML em `nuxt generate`; alterá-las exige novo build do frontend (Task 11.5).
      - Se o Cloudflare gratuito for adotado (opcional), manter `api.` sem proxy (apenas DNS) e ativar o proxy do frontend só depois que o Caddy já tiver emitido os certificados, em modo SSL "Full (strict)".
      - Imagem no GHCR: o nome do usuário/organização deve estar em minúsculas.
    - _Requirements: 10.1, 10.3, 10.4, 10.8, 12.3, 12.6_

  - [ ] 11.3 Provisionar e proteger a VPS Hetzner
    - Descrição: contratar e preparar a VPS (acesso, firewall, usuário sem root, atualizações automáticas, fail2ban, Docker e ferramentas de backup), seguindo o "Checklist de Hardening da VPS" do `design.md`. É a tarefa de maior responsabilidade do usuário, pois o servidor é administrado por ele.
    - Responsabilidades:
      - Usuário (pré-requisitos, fora do repositório): criar a conta na Hetzner e contratar a VPS (tipo, preço e região: confirmar no site da Hetzner; a Hetzner não tem datacenter no Brasil, avaliar a região dos EUA/Ashburn pela latência para o público brasileiro); confirmar que o domínio `fittoolsbrasil.com.br` está registrado e há acesso ao painel de DNS; criar os registros DNS `A` (e `AAAA`, se houver IPv6) de `fittoolsbrasil.com.br`, `www` e `api` apontando para o IP da VPS; criar o Cloud Firewall no painel da Hetzner; gerar as chaves SSH (pessoal e dedicada ao CI) e guardar a chave privada de backup (`age`) fora da VPS.
      - Código no repositório: documentação do procedimento (`deploy/README.md`); nenhuma configuração do servidor é versionada com segredos.
    - Critérios de aceitação:
      - Conta Hetzner criada e VPS contratada; IP público anotado
      - Domínio `fittoolsbrasil.com.br` registrado, com DNS `A`/`AAAA` para `fittoolsbrasil.com.br`, `www` e `api` apontando para a VPS; propagação verificada (`nslookup`/`dig`)
      - Usuário `deploy` criado, sem privilégios de root (`sudo` apenas se necessário); o servidor não é operado como `root`
      - SSH somente por chave: `PasswordAuthentication no`, `PermitRootLogin no`, `PubkeyAuthentication yes`, `AllowUsers deploy`; testado em uma segunda sessão antes de fechar a sessão atual
      - Chave SSH dedicada ao CI (ed25519), separada da chave pessoal e revogável
      - Hetzner Cloud Firewall liberando entrada apenas para TCP 22 (idealmente restrito ao IP do administrador), 80 e 443
      - `fail2ban` ativo para o `sshd`
      - `unattended-upgrades` habilitado para atualizações automáticas de segurança (avaliar reinício automático em janela de baixo tráfego para patches de kernel) e sincronização de horário ativa (`systemd-timesyncd` ou `chrony`)
      - Docker Engine com plugin Compose v2, `age`, `rclone` e `rsync` instalados; usuário `deploy` no grupo `docker` (equivale a root no host; limitar quem tem esse acesso)
      - Diretórios `/opt/fittools`, `/opt/fittools/releases`, `/opt/fittools/scripts` e `/opt/fittools/backups` pertencentes ao usuário `deploy`
      - `/opt/fittools/.env` com os segredos reais gerados pelo usuário, `chmod 600`, dono `deploy`, nunca no Git ou em imagens
      - Se a imagem da API for privada no GHCR: `docker login ghcr.io` no servidor com token `read:packages` (alternativa: tornar o pacote público, pois a imagem não contém segredos)
      - Verificação externa (ex: `nmap` a partir de outra máquina): apenas 22, 80 e 443 abertas; 3001 e 5432 fechadas
      - `deploy/README.md` documenta o passo a passo de provisionamento e o checklist de hardening
    - Arquivos afetados: `deploy/README.md` (criar); no servidor: `/etc/ssh/sshd_config`, `/opt/fittools/.env` (configuração manual, fora do repositório)
    - Dependências: 11.2 (estrutura de arquivos de deploy); as ações de conta, domínio e DNS não dependem de código e podem ser adiantadas
    - Estimativa: L (4-6h, mais o tempo de propagação do DNS)
    - Comandos úteis:
      - `ssh-keygen -t ed25519 -C "fittools-admin" -f ~/.ssh/fittools_admin` e `ssh-keygen -t ed25519 -C "fittools-ci" -f ~/.ssh/fittools_ci`
      - `nslookup fittoolsbrasil.com.br` e `nslookup api.fittoolsbrasil.com.br`
      - Na VPS (como deploy): `sudo apt update && sudo apt install -y fail2ban unattended-upgrades rsync rclone age`; `docker --version && docker compose version`
      - De fora da VPS: `nmap -Pn -p 22,80,443,3001,5432 <IP_DA_VPS>`
    - Notas:
      - Portas publicadas pelo Docker contornam o `ufw`; o Cloud Firewall da Hetzner é o controle efetivo.
      - Nunca fechar a sessão SSH original antes de validar o login por chave em outra sessão.
      - Guardar o `.env` de produção também em um gerenciador de senhas, para recuperação em caso de perda da VPS.
      - Rotacionar `JWT_SECRET` e a senha do banco em caso de suspeita de vazamento (rotacionar o `JWT_SECRET` invalida todos os tokens ativos).
      - A política de privacidade deve mencionar o armazenamento dos dados em servidor fora do Brasil (redação final a validar por profissional jurídico).
      - Sem o DNS apontando para a VPS, o Caddy não consegue emitir os certificados HTTPS.
    - _Requirements: 10.4, 10.8, 6.8_

  - [ ] 11.4 Implementar backup e restauração do PostgreSQL
    - Descrição: criar os scripts de backup diário (`pg_dump` criptografado com `age`, enviado para fora da VPS) e de restauração em banco temporário, configurar o agendamento e validar o ciclo completo com um teste de restauração. O banco guarda dados de saúde (peso, altura, idade, objetivo), considerados dados pessoais sensíveis pela LGPD.
    - Responsabilidades:
      - Código no repositório: `deploy/scripts/backup.sh` e `deploy/scripts/restore.sh`.
      - Usuário: contratar o armazenamento externo (Hetzner Storage Box ou Object Storage; confirmar valores e protocolo no site da Hetzner), gerar o par de chaves `age` (guardar a privada fora da VPS), configurar o `rclone` e o `cron` no servidor.
    - Critérios de aceitação:
      - `backup.sh` executa `pg_dump --format=custom` dentro do container `db`, criptografa a saída com `age` (chave pública em `/opt/fittools/backup-recipient.txt`) e grava em `/opt/fittools/backups` com `umask 077`
      - Script usa `set -euo pipefail`, remove arquivo parcial em caso de falha (`trap`) e valida que o arquivo gerado não está vazio
      - Backup enviado para fora da VPS com `rclone` (remote configurado pelo usuário), nas pastas `daily/`, `weekly/` (domingos) e `monthly/` (dia 1)
      - Retenção remota: 14 diários, 8 semanais e 12 mensais; retenção local: 7 dias
      - `restore.sh` descriptografa com a chave privada e restaura apenas em banco temporário cujo nome casa com `^restore_[a-z0-9_]+$` (nunca sobrescreve a produção), executando verificação básica (contagem de `users` e `user_health_profiles`)
      - Cron do usuário `deploy` executa o backup diariamente (03:15 UTC) com log em `/opt/fittools/backups/backup.log`
      - Teste de restauração realizado com sucesso: backup baixado do armazenamento externo, restaurado em banco temporário, contagens conferidas, banco temporário removido e cópia da chave privada apagada da VPS
      - Data e resultado do último teste registrados em `deploy/README.md`; teste repetido mensalmente
      - Monitor de execução do backup (dead man's switch) configurado ou, no mínimo, revisão semanal do log registrada como rotina
      - Procedimento de restauração real (desastre) documentado: parar a `api`, recriar o banco, `pg_restore`, subir a `api` e validar `GET /health`; inclui o caso de perda total da VPS
      - Documentado que snapshots da Hetzner complementam, mas não substituem, o `pg_dump` externo e criptografado
    - Arquivos afetados: `deploy/scripts/backup.sh`, `deploy/scripts/restore.sh` (criar), `deploy/README.md` (política de backup, restauração e registro de testes)
    - Dependências: 11.2, 11.3
    - Estimativa: M (3-4h)
    - Comandos úteis:
      - Gerar o par de chaves (no computador do administrador, não na VPS): `age-keygen -o fittools-backup-key.txt`; a linha "Public key: age1..." vai para `/opt/fittools/backup-recipient.txt`
      - Destino externo (na VPS): `rclone config`
      - Execução manual e agendamento: `/opt/fittools/scripts/backup.sh`; `crontab -e` com `15 3 * * * /opt/fittools/scripts/backup.sh >> /opt/fittools/backups/backup.log 2>&1`
      - Teste de restauração: `rclone copy hetzner-backup:fittools/daily/<arquivo> .`; `/opt/fittools/scripts/restore.sh <arquivo>.dump.age <chave-privada.txt> restore_test`
    - Notas:
      - Referências completas dos scripts e da política: seção "Backup e Restauração do PostgreSQL" do `design.md`.
      - Os scripts devem ter finais de linha LF (não CRLF); configurar `.gitattributes` com `*.sh text eol=lf`.
      - Antes de qualquer migration destrutiva (remoção de coluna/tabela, mudança de tipo), executar o backup manualmente e confirmar que o arquivo chegou ao armazenamento externo.
      - Perder a chave privada `age` torna os backups irrecuperáveis; guardá-la em gerenciador de senhas ou cofre offline.
    - _Requirements: 10.8, 7.1_

  - [ ] 11.5 Configurar CI/CD com GitHub Actions e deploy automático na VPS
    - Descrição: criar o workflow `.github/workflows/ci.yml` com testes em todo push/PR e, somente em push na `main`, o deploy: `nuxt generate`, build e publicação da imagem da API no GHCR, `rsync` do frontend para uma release nova, `prisma migrate deploy`, `docker compose up -d`, troca atômica do link `releases/current`, smoke test e procedimento de rollback.
    - Responsabilidades:
      - Código no repositório: workflow do GitHub Actions e scripts de teste nos `package.json`.
      - Usuário: criar o repositório no GitHub com Actions habilitado, cadastrar os secrets e variables, gerar o `known_hosts` do servidor e (opcional) configurar revisores obrigatórios no environment `production`.
    - Critérios de aceitação:
      - `.github/workflows/ci.yml` executa em push para `main` e `develop` e em pull requests para `main`, com `concurrency` (cancela execuções antigas em PRs)
      - Job `test-backend`: PostgreSQL 15 como service container, `npm ci`, `prisma generate`, `prisma migrate deploy`, testes unitários e de integração
      - Job `test-frontend`: `npm ci`, testes unitários, `npm run generate` e testes E2E (Playwright, Chromium)
      - Scripts `test:unit` e `test:integration` (backend) e `test:unit` e `test:e2e` (frontend) existem nos `package.json`; se ainda não houver testes de backend, usar `vitest run --passWithNoTests`
      - Job `deploy` com `needs: [test-backend, test-frontend]`, executado apenas em push na `main`, no environment `production`, com `concurrency` própria (sem cancelamento no meio de um deploy)
      - Secrets e variables no GitHub: `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KNOWN_HOSTS` (secrets) e `NUXT_PUBLIC_API_BASE_URL`, `NUXT_PUBLIC_SITE_URL` (variables); segredos da aplicação (`JWT_SECRET`, senha do banco) não passam pelo GitHub
      - Frontend: `nuxt generate` com as URLs de produção e `rsync -az --delete` de `.output/public` para `/opt/fittools/releases/<git-sha>/`
      - API: build e push da imagem para o GHCR com tags `<git-sha>` e `latest` (usando `GITHUB_TOKEN`, permissão `packages: write`)
      - No servidor: atualizar `API_TAG` no `.env`, `docker compose pull api migrate`, `docker compose run --rm migrate` (se falhar, o pipeline para e a API antiga continua rodando), `docker compose up -d --remove-orphans` e `caddy reload`
      - Troca atômica do frontend: `ln -sfn <sha> current.tmp && mv -T current.tmp current` (link relativo); mantém as 5 releases mais recentes
      - `deploy/docker-compose.yml`, `deploy/Caddyfile` e `deploy/scripts/*.sh` copiados para o servidor a cada deploy
      - Smoke test ao final: `curl -fsS https://api.fittoolsbrasil.com.br/health` e `curl -fsSI https://fittoolsbrasil.com.br/calculadora-de-imc` com retry; falha do smoke test marca o deploy como falho
      - Rollback documentado em `deploy/README.md` e validado ao menos uma vez: ajustar `API_TAG` para o SHA anterior, `docker compose up -d` e apontar `releases/current` para a release anterior; migrations já aplicadas não são revertidas automaticamente e por isso devem ser retrocompatíveis
      - Chave SSH do CI limitada ao usuário `deploy` e `known_hosts` fixado (evita man-in-the-middle no primeiro acesso)
    - Arquivos afetados: `.github/workflows/ci.yml` (criar), `fittools-backend/package.json` (scripts `test:unit` e `test:integration`), `fittools-frontend/package.json` (verificar `test:unit`, `generate`, `test:e2e`), `deploy/README.md` (rollback e secrets)
    - Dependências: 7.2, 10.4, 11.1, 11.2, 11.3, 11.4
    - Estimativa: L (4-6h)
    - Comandos úteis:
      - `ssh-keyscan -t ed25519 <IP_OU_HOST_DA_VPS>` (gera o `known_hosts` para o secret `DEPLOY_KNOWN_HOSTS`)
      - Rollback manual (na VPS, em `/opt/fittools`): `sed -i "s/^API_TAG=.*/API_TAG=<sha-anterior>/" .env`; `docker compose up -d`; `cd releases && ln -sfn <sha-anterior> current.tmp && mv -T current.tmp current`
      - Estado das migrations: `docker compose run --rm migrate npx prisma migrate status`
    - Notas:
      - Referência completa do workflow: seção "CI/CD — GitHub Actions" do `design.md`.
      - Usar `actions/checkout@v4`, `actions/setup-node@v4` (com cache de npm), `docker/login-action@v3` e `docker/build-push-action@v6`.
      - Manter o job `deploy` desabilitado (ou o workflow sem `push` na `main`) até que os scripts de teste e a VPS estejam prontos.
      - Alternativa sem registry: enviar o código por `rsync` e executar `docker compose build api` no servidor; mais simples, mas consome CPU/RAM da VPS e perde a rastreabilidade por SHA.
      - GitHub Actions: confirmar os limites do plano no site do GitHub.
    - _Requirements: 13.2, 13.3, 10.6, 10.7_

  - [ ] 11.6 Primeiro deploy, verificação ponta a ponta e monitoramento básico
    - Descrição: executar o primeiro deploy em produção pelo pipeline, validar de ponta a ponta (HTTPS, API, CORS, páginas estáticas, 404, rate limiting, portas fechadas, Lighthouse) e configurar monitoramento básico de disponibilidade, disco e backup.
    - Responsabilidades:
      - Usuário: disparar o primeiro deploy (push na `main`), conferir o DNS, criar a conta na ferramenta de uptime externa e receber os alertas; (opcional) ativar o Cloudflare gratuito.
      - Código no repositório: testes/scripts de verificação e `deploy/README.md` com o runbook e o registro dos resultados.
    - Critérios de aceitação:
      - Pipeline executado com sucesso em push na `main` (testes, build, push da imagem, migration, `up -d`, troca do `current`, smoke test)
      - Certificados HTTPS emitidos pelo Caddy para `fittoolsbrasil.com.br`, `www` e `api`; `http://` redireciona para `https://`; `www` redireciona para o domínio principal
      - `https://api.fittoolsbrasil.com.br/health` responde 200 com `database: "connected"`
      - Fluxo real no navegador: registro, login, `GET /users/me` e `PUT /users/me/profile` funcionando contra a API de produção, sem erro de CORS a partir de `https://fittoolsbrasil.com.br`
      - Requisição de origem não autorizada (header `Origin` diferente) é bloqueada pelo CORS
      - As 8 calculadoras e a homepage carregam como HTML estático completo (conteúdo no HTML, não apenas shell vazio); `sitemap.xml` e `robots.txt` acessíveis
      - URL inexistente retorna status HTTP 404 com a página `404.html` (não 200), evitando "soft 404"
      - Cache correto: `/_nuxt/*` com `immutable` e 1 ano; HTML com `must-revalidate`
      - Rate limiting por IP efetivo atrás do Caddy: dois IPs diferentes têm contadores independentes (valida `trustProxy`); login bloqueia na 6ª tentativa em 15 min com 429 e `Retry-After`
      - Portas 5432 e 3001 fechadas vistas de fora da VPS; `.env` não acessível; nenhum segredo em logs (`docker compose logs api`)
      - Lighthouse em produção (mobile): Performance ≥ 85, SEO ≥ 95, Accessibility ≥ 90, Best Practices ≥ 90; relatórios em `docs/lighthouse-reports/`
      - Monitor externo de uptime (ferramenta de livre escolha; confirmar plano e limites no site do serviço) em `https://api.fittoolsbrasil.com.br/health` e na home, com alerta por e-mail
      - Alerta (ou rotina semanal de revisão) de uso de disco da VPS e monitor da execução do backup (Task 11.4)
      - Primeiro backup manual executado e validado após o primeiro deploy
      - Reinício da VPS (`reboot`) testado: a stack volta sozinha (`restart: unless-stopped`) e `/health` responde
      - Resultados registrados em `deploy/README.md` (data, versão/SHA, observações)
    - Arquivos afetados: `deploy/README.md` (runbook e registro da verificação), `docs/lighthouse-reports/` (criar), `.github/workflows/ci.yml` (ajustar, se o smoke test precisar de correções)
    - Dependências: 11.5, 9.5, 11.4
    - Estimativa: M (3-4h)
    - Comandos úteis:
      - `curl -I http://fittoolsbrasil.com.br`; `curl -I https://www.fittoolsbrasil.com.br`; `curl -fsS https://api.fittoolsbrasil.com.br/health`
      - `curl -I https://fittoolsbrasil.com.br/pagina-que-nao-existe` (esperado: 404)
      - `curl -I -H "Origin: https://exemplo-malicioso.com" https://api.fittoolsbrasil.com.br/health`
      - `curl -sI https://fittoolsbrasil.com.br/ | grep -iE "cache-control|strict-transport"`
      - `nmap -Pn -p 22,80,443,3001,5432 <IP_DA_VPS>`
      - `npx lighthouse https://fittoolsbrasil.com.br/calculadora-de-imc --preset=desktop --view`
      - Na VPS: `docker compose ps`; `docker compose logs --tail=100 api`; `df -h`; `sudo reboot`
    - Notas:
      - Se o Cloudflare gratuito for adotado: manter `api.` sem proxy (apenas DNS) e ativar o proxy do frontend só depois de os certificados do Caddy estarem emitidos, em modo SSL "Full (strict)".
      - Para o teste de rate limiting com IPs distintos, usar duas redes diferentes (ex: conexão fixa e dados móveis).
      - Escalabilidade e alta disponibilidade (segunda VPS, banco gerenciado) ficam para pós-MVP; a VPS única é um ponto único de falha mitigado por backup externo testado.
      - O custo mensal da VPS e do armazenamento externo deve ser confirmado no site da Hetzner.
    - _Requirements: 10.4, 10.9, 12.5, 12.8, 6.4_

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["3.1", "3.2", "3.3", "4.1", "5.1", "5.2", "5.3"] },
    { "id": 1, "tasks": ["3.4", "3.6", "5.4", "5.5", "5.6", "5.7", "7.1"] },
    { "id": 2, "tasks": ["3.5", "6.1", "6.2", "6.4", "7.2", "7.4", "8.1", "8.3", "9.3"] },
    { "id": 3, "tasks": ["4.2", "6.3", "7.5", "7.6", "7.7", "7.8", "7.9", "7.10", "7.11", "7.12", "10.1"] },
    { "id": 4, "tasks": ["4.3", "4.4", "7.3", "8.2"] },
    { "id": 5, "tasks": ["9.1", "10.2", "10.3", "10.4", "11.1"] },
    { "id": 6, "tasks": ["9.2", "11.2"] },
    { "id": 7, "tasks": ["9.4", "11.3"] },
    { "id": 8, "tasks": ["9.5", "11.4"] },
    { "id": 9, "tasks": ["11.5"] },
    { "id": 10, "tasks": ["11.6"] }
  ]
}
```

## Notes

### Decisões e versões fixas

- Tarefas concluídas: 1.1, 1.2, 1.3, 2.1, 2.1b, 2.2, 2.3, 2.4, 2.5 e 2.6. As Fases 1 e 2 estão concluídas; restam 51 tarefas pendentes. Ressalvas da Fase 2: o primeiro commit foi feito e enviado ao GitHub (`7ab6bab` na `main`, com as migrations incluídas); o `trustProxy` (condicionado a `NODE_ENV === 'production'`) foi validado apenas por compilação, e o teste em execução atrás do Caddy fica para a Task 11.6.
- Versões exatas (sem `^` ou `~`): Nuxt 3.21.11 (não usar Nuxt 4), Pinia 4.1.0, Vue 3.5.43, Prisma e `@prisma/client` 5.22.0.
- Hospedagem decidida: VPS Hetzner única com Docker Compose (Caddy + API Fastify + PostgreSQL). Vercel, Render e Supabase não são usados.
- O `prisma` (CLI) precisa estar em `dependencies` para que `prisma migrate deploy` rode dentro da imagem da API; a pasta `prisma/migrations/` deve estar versionada no Git.
- `trustProxy` foi implementado como `env.NODE_ENV === 'production'` (Task 2.6): só é seguro em produção porque a porta 3001 não é publicada; sem ele o rate limiting por IP (Task 4.4) enxergaria apenas o IP interno do Caddy. Em desenvolvimento fica desativado, pois a API é exposta diretamente. Validado só por compilação; o teste em execução (dois IPs com contadores independentes) fica para a Task 11.6.
- Os CHECK constraints de `user_health_profiles` não existem no `schema.prisma`; são adicionados à mão no SQL da migration inicial (Task 2.2) e tratam `NULL` explicitamente.
- O site antigo não tem os arquivos `assets/js/app.js` e `assets/js/gamification.js` (as páginas os referenciam, mas eles não existem). Portanto o cabeçalho, o rodapé e o motor que montava os formulários a partir de `calculators.js` não estão disponíveis para copiar; o layout e os formulários são desenhados do zero, seguindo a paleta de `assets/css/styles.css`.
- A URL da calculadora de hidratação é `/calculadora-de-agua` (igual à do site antigo, conforme os Requisitos 2.10 e 14.2). A página `/calculadora-de-calorias` não existe no site antigo e é nova (Task 7.6).

### Opcionais e priorização

- A Task 7.3 (property-based tests, marcada com `*`) é a única tarefa claramente opcional para o lançamento do MVP e pode ser adiada para v1.1. As demais tarefas de teste (7.2 e Fase 10) são obrigatórias, pois a Task 11.5 depende de 7.2 e 10.4.
- Pós-MVP (v1.1): analytics e tracking de conversão, histórico de medições, gráficos de evolução, exportação de dados (PDF) e compartilhamento social de resultados.
  - Pós-MVP: cálculo no servidor para o mobile (FORA DO ESCOPO DO MVP; sem tarefa associada ainda): no MVP o cálculo é feito no navegador (resposta instantânea, sem latência nem consumo de rate limit). Quando o app mobile existir, avaliar expor `POST /api/v1/calculators/<nome>` reaproveitando as mesmas funções puras (ver Task 7.1), mantendo o cálculo local na web. As fórmulas são equações científicas públicas, então mover o cálculo para o servidor não as torna secretas; o ganho é validação, histórico e regras proprietárias futuras. Se for implementado, o Requisito 1.10 deve ser revisto.

### Grafo de dependências

- O grafo oficial é o bloco JSON em "Task Dependency Graph". Ele segue as dependências declaradas em cada tarefa e separa em ondas diferentes as tarefas que alteram o mesmo arquivo (por exemplo `server.ts`, `auth.routes.ts`, `package.json` e as páginas de calculadoras).
- As tarefas concluídas (1.1, 1.2, 1.3, 2.1, 2.1b, 2.2, 2.3, 2.4, 2.5, 2.6) não aparecem no grafo; as 51 tarefas pendentes aparecem exatamente uma vez cada. Checkpoints e itens de nível superior (fases) ficam fora do grafo.
- Pelas dependências por tarefa, o frontend (Fases 5 a 8) pode avançar em paralelo ao backend. Os testes E2E (10.2 a 10.4) foram posicionados após as tarefas de backend (4.3) por precisarem da API em execução.
- Visão macro das fases (referência):

```mermaid
graph TD
    F1[Fase 1: Setup Inicial] --> F2[Fase 2: Backend - Infraestrutura]
    F2 --> F3[Fase 3: Backend - Autenticação]
    F3 --> F4[Fase 4: Backend - Perfil de Usuário]
    F4 --> F5[Fase 5: Frontend - Estrutura Base]
    F5 --> F6[Fase 6: Frontend - Autenticação]
    F5 --> F7[Fase 7: Frontend - Calculadoras]
    F6 --> F8[Fase 8: Frontend - Perfil de Usuário]
    F7 --> F8
    F8 --> F9[Fase 9: SEO e Performance]
    F9 --> F10[Fase 10: Testes E2E]
    F10 --> F11[Fase 11: Deploy - VPS Hetzner + Docker]
```

### Fase 11: responsabilidades do usuário vs. código

- Usuário (fora do repositório): contratar a VPS Hetzner, registrar o domínio e configurar o DNS, criar o Cloud Firewall, gerar chaves SSH e a chave `age` de backup, contratar o armazenamento externo de backup, cadastrar secrets e variables no GitHub, gerar os segredos de produção (`JWT_SECRET`, senha do banco) e gravá-los somente em `/opt/fittools/.env`, criar o monitor de uptime externo.
- Código (repositório): Dockerfile e `.dockerignore`, `deploy/docker-compose.yml`, `deploy/Caddyfile`, `deploy/.env.production.example`, scripts `backup.sh` e `restore.sh`, workflow `.github/workflows/ci.yml` e `deploy/README.md`.
- Preços, tipos de servidor, regiões da Hetzner, limites do GitHub Actions e planos de ferramentas de uptime devem ser confirmados nos sites dos respectivos serviços.
- Os scripts `.sh` precisam de finais de linha LF (`.gitattributes` com `*.sh text eol=lf`).

### Avisos

- Ambiente de desenvolvimento: a máquina tem pouco espaço em disco e memória (cerca de 6 GB de RAM). O Docker Desktop foi instalado em modo per-user; em sessões de terminal abertas antes da instalação pode ser necessário adicionar `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin` ao PATH para que `docker` e `docker-credential-desktop` sejam encontrados.
- Credenciais do `docker-compose.dev.yml` são somente de desenvolvimento; nunca reutilizar em produção.
- Docker Desktop tem termos de licença próprios para uso comercial por empresas de maior porte; confirmar no site da Docker (alternativa: Docker Engine no WSL2).
- Perder a chave privada `age` torna os backups irrecuperáveis; guardá-la fora da VPS.
- Rollback não reverte migrations já aplicadas; manter migrations retrocompatíveis.
- A política de privacidade deve mencionar o armazenamento dos dados em servidor fora do Brasil (redação final validada por profissional jurídico).
- Esta lista é somente um plano de implementação; nenhuma tarefa foi executada por este fluxo. Para executar, abra o `tasks.md` e use "Start task" ao lado de cada item.

### Checklist de MVP completo

Backend
- [ ] API Fastify em container Docker na VPS Hetzner, atrás do Caddy (`https://api.fittoolsbrasil.com.br`)
- [ ] PostgreSQL acessível apenas pela rede interna do Docker (porta 5432 fechada externamente)
- [ ] Fastify com `trustProxy` ativo em produção (validação em execução atrás do Caddy na Task 11.6)
- [x] `prisma` em `dependencies` (realizado na Task 2.6)
- [ ] 5 endpoints funcionais: `/health`, `/auth/register`, `/auth/login`, `/users/me`, `/users/me/profile`
- [ ] Autenticação JWT, rate limiting e CORS configurados
- [ ] Migrations versionadas em `prisma/migrations` (com CHECK constraints) e aplicadas via `prisma migrate deploy`
- [ ] Logs estruturados e testes de integração passando; health check retornando 200

Frontend
- [ ] SSG gerando HTML estático; 12 páginas funcionais (homepage + 8 calculadoras + login + registro + perfil)
- [ ] 8 calculadoras com fórmulas precisas; meta tags únicas e JSON-LD em todas as páginas
- [ ] Lighthouse Performance ≥ 85 (mobile) e SEO ≥ 95
- [ ] Login, registro, logout, perfil editável e pré-preenchimento das calculadoras
- [ ] Testes E2E passando; deploy automático (GitHub Actions → VPS Hetzner)
- [ ] URL inexistente retorna HTTP 404 com `404.html`

Segurança
- [ ] Senhas com bcrypt (cost 12); JWT com expiração de 7 dias
- [ ] CORS restrito, rate limiting em login e endpoints críticos, headers do Helmet
- [ ] Nenhuma senha ou token em logs ou respostas; validação de entrada em todos os endpoints
- [ ] VPS protegida: SSH somente por chave, usuário `deploy` sem root, Cloud Firewall (22/80/443), fail2ban e atualizações automáticas
- [ ] `.env` de produção com `chmod 600`, fora do Git e das imagens
- [ ] HTTPS automático (Let's Encrypt via Caddy) em `fittoolsbrasil.com.br`, `www` e `api`

Infraestrutura e backup
- [ ] Docker Desktop e PostgreSQL local via `docker-compose.dev.yml`
- [ ] Domínio `fittoolsbrasil.com.br` registrado e DNS apontando para a VPS
- [ ] Backup diário criptografado (`age`) enviado para fora da VPS, com teste de restauração registrado
- [ ] Rollback do deploy documentado e validado

SEO
- [ ] Sitemap.xml, robots.txt, canonical URLs e OG tags em todas as páginas
- [ ] JSON-LD validado; URLs amigáveis (`/calculadora-de-imc`); carregamento < 3s (4G mobile)

Legal
- [ ] Aviso "Não substitui orientação médica" e referências científicas em todas as calculadoras
- [ ] Links para Política de Privacidade e Termos de Uso no footer (com menção ao armazenamento fora do Brasil)
- [ ] Banner de consentimento de cookies (LGPD)

Monitoramento
- [ ] Logs estruturados em produção; health check no container, no Caddy e em monitor de uptime externo
- [ ] Alerta ou rotina de revisão de disco e da execução do backup
- [ ] Alertas de downtime e Google Analytics (opcionais)
