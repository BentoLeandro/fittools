# FitTools Brasil

Plataforma fitness com calculadoras científicas, SEO e contas de usuário.
Monorepo com frontend (Nuxt 3), backend (Fastify) e PostgreSQL.

## Estrutura

```
SiteGhandi/
├── fittools-backend/        API REST (Fastify + TypeScript + Prisma)
├── fittools-frontend/       Site (Nuxt 3, geração estática)
├── docker-compose.dev.yml   PostgreSQL para desenvolvimento local
├── html/ e assets/          Site antigo em vanilla JS (referência da migração)
└── .kiro/specs/             Requisitos, design e plano de tarefas
```

## Stack

- Frontend: Nuxt 3.21.11, Vue 3.5.43, Pinia 4.1.0, Tailwind CSS
- Backend: Node.js, Fastify 4, TypeScript, Prisma 5.22.0, Zod, Pino
- Banco: PostgreSQL 15
- Hospedagem prevista: VPS Hetzner com Docker (Fase 11 do plano)

## Pré-requisitos

- Node.js 20 LTS ou superior (testado também no Node 24)
- Docker Desktop (Windows com WSL 2)

## Banco de dados local

O PostgreSQL roda em Docker e fica acessível só em `127.0.0.1:5432`.
As credenciais do `docker-compose.dev.yml` servem apenas para a sua máquina.

```powershell
# Subir o banco
docker compose -f docker-compose.dev.yml up -d

# Ver se está saudável
docker compose -f docker-compose.dev.yml ps

# Criar o banco usado pelos testes de integração (só na primeira vez)
docker compose -f docker-compose.dev.yml exec db createdb -U fittools fittools_test

# Parar (mantém os dados)
docker compose -f docker-compose.dev.yml down

# Parar e APAGAR todos os dados locais
docker compose -f docker-compose.dev.yml down -v
```

## Backend

```powershell
cd fittools-backend
copy .env.example .env      # depois troque o JWT_SECRET por um valor aleatório
npm install
npx prisma migrate dev      # aplica as migrations no banco local
npm run dev                 # http://localhost:3001  (teste: /health)
```

O `JWT_SECRET` precisa ter pelo menos 32 caracteres. Se alguma variável do
`.env` estiver faltando ou inválida, o servidor não inicia e mostra quais.

Migrations: o Prisma não declara CHECK constraints no `schema.prisma`. Elas
ficam editadas à mão no SQL da migration. Depois que uma migration é aplicada e
versionada, não a edite mais; mudanças entram em uma nova migration.

## Frontend

```powershell
cd fittools-frontend
npm install
npm run dev                 # http://localhost:3000
npm run generate            # gera o site estático em .output/public
```

## Documentação do projeto

Em `.kiro/specs/fittools-platform-mvp/`:

- `requirements.md`: requisitos do MVP
- `design.md`: design técnico, incluindo o deploy na Hetzner
- `tasks.md`: plano de implementação com o andamento das tarefas
