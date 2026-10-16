# Design Técnico — FitTools Brasil MVP v1.0

## Overview

*Visão Geral*

O FitTools Brasil MVP é uma plataforma web fitness B2C que migra 8 calculadoras fitness existentes (vanilla JavaScript) para uma arquitetura moderna e escalável baseada em Nuxt 3 (frontend SSG) + Fastify (backend API REST) + PostgreSQL (database). A plataforma fornece calculadoras públicas otimizadas para SEO com autenticação de usuário opcional para salvar perfis de saúde e receber recomendações personalizadas.

### Objetivos de Negócio

- Adquirir usuários organicamente via SEO (palavras-chave: "calculadora de IMC", "calculadora de calorias", etc.)
- Converter visitantes anônimos em usuários registrados
- Fornecer calculadoras cientificamente precisas com citações acadêmicas
- Criar base de usuários para futura monetização (e-books, planos premium)

### Princípios Arquiteturais

1. **SEO-First**: Páginas estáticas geradas em build-time (SSG) para máxima indexabilidade
2. **Progressive Enhancement**: Calculadoras funcionam client-side sem backend; perfis requerem autenticação
3. **Security by Design**: JWT stateless, bcrypt hashing, rate limiting, input validation
4. **Type Safety**: TypeScript end-to-end para prevenir erros em runtime
5. **Scientific Accuracy**: Preservar precisão numérica das fórmulas durante migração

---

## Architecture

*Arquitetura do Sistema*

### Diagrama de Componentes

```mermaid
graph TB
    subgraph "Frontend - Nuxt 3 SSG"
        A[Static HTML Pages] --> B[Vue 3 Components]
        B --> C[Composables TypeScript]
        C --> D[Pinia Store]
        D --> E[API Client]
    end
    
    subgraph "Backend - Fastify API"
        F[Fastify Server] --> G[JWT Middleware]
        G --> H[Route Handlers]
        H --> I[Service Layer]
        I --> J[Prisma ORM]
    end
    
    subgraph "Database"
        K[(PostgreSQL 15+)]
    end
    
    subgraph "External"
        L[Visitante/Usuário]
        M[Google Bot]
    end
    
    L -->|HTTPS| A
    M -->|Crawl| A
    E -->|REST JSON| F
    J -->|SQL| K
    
    style A fill:#34d399
    style F fill:#3b82f6
    style K fill:#8b5cf6
```

### Fluxo de Dados — Calculadora Pública (Guest)

```
1. Usuário acessa /calculadora-de-imc
2. Nuxt SSG serve HTML estático (< 1s FCP)
3. Vue hidrata componente Calculator
4. Usuário insere peso e altura
5. Composable useScience() executa cálculo client-side
6. Resultado renderizado instantaneamente (sem API call)
```

### Fluxo de Dados — Usuário Autenticado

```
1. Usuário faz login via POST /api/v1/auth/login
2. Backend valida credenciais, retorna JWT
3. Frontend armazena token no localStorage
4. Pinia userStore busca perfil via GET /api/v1/users/me
5. Calculadoras pré-preenchem campos com dados do perfil
6. Usuário atualiza perfil via PUT /api/v1/users/me/profile
7. Backend persiste no PostgreSQL
```

### Decisões Arquiteturais

| Decisão | Escolha | Alternativa | Justificativa |
|---------|---------|-------------|---------------|
| **Frontend Rendering** | SSG (Static Site Generation) | SSR (Server-Side Rendering) | SEO máximo, zero latência de servidor, custos mínimos de hosting. Páginas de calculadoras são estáticas. |
| **Backend Style** | REST API stateless | GraphQL | Operações CRUD simples, sem necessidade de queries complexas. JWT stateless simplifica escalabilidade horizontal. |
| **Authentication** | JWT (JSON Web Tokens) | Sessions com Redis | Stateless permite múltiplas instâncias do backend sem shared state. Para MVP, 7 dias de expiração é suficiente. |
| **Database** | PostgreSQL | MongoDB | Dados estruturados com relações (users ↔ health_profiles). CHECK constraints garantem integridade. |
| **Frontend State** | Pinia | Vuex | Composition API nativa, TypeScript first-class, menos boilerplate. |
| **API Framework** | Fastify | Express | Performance 2-3x superior ([benchmark oficial](https://www.fastify.io/benchmarks/)), validação de schemas embutida, plugins robustos. |
| **ORM** | Prisma | node-pg (raw SQL) | Type-safe client gerado automaticamente, migrações versionadas, developer experience superior. Trade-off: overhead ~10% vs raw SQL, aceitável para MVP. |

---

## Stack Tecnológica Detalhada

### Frontend

| Tecnologia | Versão | Finalidade |
|------------|--------|-----------|
| **Nuxt 3** | 3.21.x (versão fixa) | Meta-framework Vue 3, SSG (`nuxt generate`), routing, SEO |
| **Vue 3** | 3.4+ | UI framework com Composition API |
| **TypeScript** | 5.3+ | Type safety end-to-end |
| **Pinia** | 2.1+ | State management global (userStore) |
| **Tailwind CSS** | 3.4+ | Utility-first styling (migrar de styles.css) |
| **VueUse** | 10.7+ | Composable utilities (useLocalStorage, useDebounceFn) |
| **Vitest** | 1.0+ | Unit tests para composables |
| **Testing Library** | - | Component tests para formulários |
| **Playwright** | 1.40+ | E2E tests para user journeys |

**Justificativa Tailwind CSS**: Migração incremental de `styles.css` existente. Permite manter classes semânticas (`.btn-primary`) via `@apply` enquanto moderniza codebase.

### Backend

| Tecnologia | Versão | Finalidade |
|------------|--------|-----------|
| **Node.js** | 20.x LTS | Runtime JavaScript server-side |
| **Fastify** | 4.x (^4.29) | HTTP server framework |
| **TypeScript** | 5.3+ | Type safety end-to-end |
| **Prisma** | 5.22 (versão fixa) | ORM, migrations, type-safe client |
| **bcrypt** | 5.1+ | Password hashing (cost factor 12) |
| **jsonwebtoken** | 9.0+ | JWT signing e verification (HS256) |
| **Zod** | 3.22+ | Runtime schema validation |
| **@fastify/cors** | 9.0+ | CORS configuration |
| **@fastify/rate-limit** | 9.0+ | Rate limiting por IP e user_id |
| **@fastify/swagger** | 8.14+ | OpenAPI 3.0 documentation |
| **Vitest** | 1.0+ | Integration tests para endpoints |

**Justificativa Prisma**: Type-safe queries (`prisma.user.findUnique()`), migrações automáticas (`prisma migrate dev`), Prisma Studio para debugging. [Comparação com node-pg](https://www.prisma.io/dataguide/database-tools/top-nodejs-orms-query-builders-and-database-libraries): Prisma oferece DX superior com ~10% overhead de performance, aceitável para MVP com <1000 usuários.

### Database

| Tecnologia | Versão | Finalidade |
|------------|--------|-----------|
| **PostgreSQL** | 15+ | Relational database com CHECK constraints |

**Configuração de Produção**:
- Connection pooling: 5-20 conexões concorrentes
- Query timeout: 5 segundos
- Timezone: UTC para todas as colunas TIMESTAMP

### DevOps & Hosting

O projeto roda em **uma única VPS da Hetzner**, administrada pelo próprio time, com todos os serviços orquestrados por Docker Compose.

| Serviço | Finalidade | Custo Estimado |
|---------|-----------|----------------|
| **Hetzner Cloud VPS** | Hospedagem de todo o stack em produção (frontend estático, API e PostgreSQL) | Confirmar valores no site da Hetzner |
| **Docker / Docker Compose** | Empacotamento e orquestração dos containers (Caddy, API, PostgreSQL) | Gratuito (open source) |
| **Caddy** | Proxy reverso com HTTPS automático (Let's Encrypt) e servidor dos arquivos estáticos do frontend | Gratuito (open source) |
| **GitHub Actions** | CI/CD: testes, `nuxt generate` e deploy via SSH | Confirmar limites do plano no site do GitHub |
| **GitHub Container Registry (ghcr.io)** | Registro da imagem Docker da API (opcional; a imagem também pode ser construída no servidor) | Confirmar limites no site do GitHub |
| **Hetzner Storage Box ou Object Storage** | Armazenamento de backups do PostgreSQL fora da VPS | Confirmar valores no site da Hetzner |
| **Cloudflare (plano gratuito)** | CDN/cache dos arquivos estáticos na frente do Caddy (**opcional**, recomendado) | Plano gratuito disponível; confirmar no site da Cloudflare |

**Pré-requisito**: o domínio `fittoolsbrasil.com.br` ainda precisa ser confirmado como registrado (e com acesso ao painel de DNS) antes do primeiro deploy. Sem ele, o Caddy não consegue emitir certificados HTTPS.

**Plataformas gerenciadas avaliadas e descartadas** (Vercel, Render, Supabase, Railway e Neon): oferecem mais conforto operacional (deploy por `git push`, banco gerenciado, backups embutidos), porém com custo que cresce por serviço e menos controle sobre onde e como os dados de saúde são armazenados. A escolha por uma VPS troca esse conforto por **custo previsível, controle total do ambiente e um único ponto de administração**, ao preço de assumir patches de segurança, backups e monitoramento (ver seções de Implantação e Trade-offs).

**Localização do datacenter**: a Hetzner não possui datacenter no Brasil. Recomenda-se avaliar a região dos EUA (Ashburn) pela menor latência para o público brasileiro em comparação à Europa. Regiões disponíveis e preços devem ser confirmados no site da Hetzner antes da contratação.

---

## Estrutura de Pastas

### Frontend (Nuxt 3)

```
fittools-frontend/
├── .nuxt/                     # Build artifacts (gitignored)
├── .output/                   # SSG output (gitignored)
├── pages/
│   ├── index.vue              # Homepage
│   ├── login.vue              # Login page
│   ├── registro.vue           # Registration page
│   ├── perfil.vue             # User profile (auth required)
│   ├── calculadora-de-imc.vue
│   ├── calculadora-de-calorias.vue
│   ├── calculadora-de-proteina.vue
│   ├── calculadora-de-gordura-corporal.vue
│   ├── calculadora-de-1rm.vue
│   ├── calculadora-de-frequencia-cardiaca.vue
│   ├── calculadora-de-hidratacao.vue
│   └── calculadora-de-pace.vue
├── components/
│   ├── Calculator/
│   │   ├── Form.vue           # Generic calculator form
│   │   ├── Result.vue         # Result display (headline, cards, note)
│   │   ├── ScientificRef.vue  # Citations box
│   │   └── Field.vue          # Input field com validação
│   ├── Auth/
│   │   ├── LoginForm.vue
│   │   └── RegisterForm.vue
│   └── Common/
│       ├── Header.vue
│       ├── Footer.vue
│       └── Toast.vue          # Notification component
├── composables/
│   ├── useScience.ts          # Fórmulas científicas (migrado de science.js)
│   ├── useAuth.ts             # Auth helpers (login, logout, register)
│   ├── useApi.ts              # Axios wrapper com auth header
│   └── useValidation.ts       # Input validation rules
├── stores/
│   └── user.ts                # Pinia store (auth token, user data, profile)
├── middleware/
│   └── auth.ts                # Route guard (redirect to /login se não autenticado)
├── layouts/
│   ├── default.vue            # Header + <slot> + Footer
│   └── calculator.vue         # Layout específico para calculadoras
├── types/
│   └── api.ts                 # TypeScript interfaces para API responses
├── public/
│   ├── favicon.ico
│   └── robots.txt
├── package.json
├── nuxt.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### Backend (Fastify + Prisma)

```
fittools-backend/
├── src/
│   ├── routes/
│   │   ├── auth.routes.ts     # POST /api/v1/auth/register, /login
│   │   ├── user.routes.ts     # GET /api/v1/users/me, PUT /users/me/profile
│   │   └── health.routes.ts   # GET /health
│   ├── services/
│   │   ├── auth.service.ts    # hashPassword, verifyPassword, generateJWT, verifyJWT
│   │   └── user.service.ts    # createUser, getUserById, updateHealthProfile
│   ├── middlewares/
│   │   ├── jwt.middleware.ts  # Verify JWT, attach user_id to request
│   │   └── rateLimit.ts       # Rate limiting configuration
│   ├── schemas/
│   │   ├── auth.schema.ts     # Zod schemas para login/register
│   │   └── user.schema.ts     # Zod schemas para health profile
│   ├── database/
│   │   └── client.ts          # Prisma client singleton
│   ├── types/
│   │   └── index.ts           # TypeScript types (JWTPayload, etc)
│   ├── utils/
│   │   ├── jwt.util.ts        # JWT sign/verify wrappers
│   │   ├── validation.util.ts # Zod validation helpers
│   │   └── errors.util.ts     # Custom error classes
│   ├── config/
│   │   └── env.ts             # Environment variable validation
│   └── server.ts              # Fastify app entry point
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Versioned SQL migrations
├── tests/
│   ├── integration/
│   │   ├── auth.test.ts
│   │   └── user.test.ts
│   └── unit/
│       └── auth.service.test.ts
├── package.json
├── tsconfig.json
└── .env.example
```

**Convenções de Naming**:
- Routes: `*.routes.ts`
- Services: `*.service.ts`
- Middlewares: `*.middleware.ts`
- Schemas: `*.schema.ts`
- Tests: `*.test.ts`

---

## Components and Interfaces

*Schemas de API REST: contratos dos endpoints e interfaces entre frontend e backend.*

### Base URL

- **Development**: `http://localhost:3001`
- **Production**: `https://api.fittoolsbrasil.com.br`

### Headers Globais

```
Content-Type: application/json
Accept: application/json
Authorization: Bearer <JWT_TOKEN>  (apenas para endpoints autenticados)
```

### Endpoints Detalhados

#### 1. POST /api/v1/auth/register

**Descrição**: Cria nova conta de usuário.

**Request Body**:
```json
{
  "email": "joao@exemplo.com.br",
  "password": "SenhaSegura123!",
  "name": "João Silva"
}
```

**Validação**:
- `email`: formato válido, único no banco
- `password`: >= 8 caracteres
- `name`: 2-100 caracteres

**Success Response** (201 Created):
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "joao@exemplo.com.br",
    "name": "João Silva",
    "created_at": "2025-06-15T14:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:
- **400 Bad Request** (validação falhou):
```json
{
  "error": "ValidationError",
  "message": "Dados inválidos",
  "fields": {
    "email": "Formato de email inválido",
    "password": "Senha deve ter pelo menos 8 caracteres"
  }
}
```

- **409 Conflict** (email duplicado):
```json
{
  "error": "ConflictError",
  "message": "Email já cadastrado"
}
```

---

#### 2. POST /api/v1/auth/login

**Descrição**: Autentica usuário existente.

**Request Body**:
```json
{
  "email": "joao@exemplo.com.br",
  "password": "SenhaSegura123!"
}
```

**Success Response** (200 OK):
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "joao@exemplo.com.br",
    "name": "João Silva"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**JWT Payload**:
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "joao@exemplo.com.br",
  "iat": 1718460600,
  "exp": 1719065400
}
```

**Error Responses**:
- **401 Unauthorized** (credenciais inválidas):
```json
{
  "error": "UnauthorizedError",
  "message": "Email ou senha incorretos"
}
```

- **429 Too Many Requests** (rate limit excedido):
```json
{
  "error": "TooManyRequestsError",
  "message": "Muitas tentativas de login. Tente novamente em 15 minutos.",
  "retryAfter": 900
}
```

---

#### 3. GET /api/v1/users/me

**Descrição**: Retorna dados do usuário autenticado + perfil de saúde.

**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response** (200 OK):
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "joao@exemplo.com.br",
    "name": "João Silva",
    "created_at": "2025-06-15T14:30:00.000Z",
    "updated_at": "2025-06-15T14:30:00.000Z"
  },
  "health_profile": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "weight_kg": 82.5,
    "height_cm": 178,
    "age": 28,
    "sex": "male",
    "activity_level": "moderately_active",
    "fitness_goal": "muscle_gain",
    "updated_at": "2025-06-16T10:20:00.000Z"
  }
}
```

**Caso sem health_profile** (200 OK):
```json
{
  "user": { /* ... */ },
  "health_profile": null
}
```

**Error Responses**:
- **401 Unauthorized** (token inválido/expirado):
```json
{
  "error": "UnauthorizedError",
  "message": "Token expirado ou inválido"
}
```

---

#### 4. PUT /api/v1/users/me/profile

**Descrição**: Cria ou atualiza perfil de saúde do usuário autenticado.

**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body**:
```json
{
  "weight_kg": 82.5,
  "height_cm": 178,
  "age": 28,
  "sex": "male",
  "activity_level": "moderately_active",
  "fitness_goal": "muscle_gain"
}
```

**Validação**:
- `weight_kg`: 30.0 - 300.0
- `height_cm`: 120.0 - 230.0
- `age`: 14 - 100
- `sex`: "male" | "female"
- `activity_level`: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extremely_active"
- `fitness_goal`: "weight_loss" | "maintenance" | "muscle_gain" | "athletic_performance"

**Success Response** (200 OK):
```json
{
  "health_profile": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "weight_kg": 82.5,
    "height_cm": 178,
    "age": 28,
    "sex": "male",
    "activity_level": "moderately_active",
    "fitness_goal": "muscle_gain",
    "updated_at": "2025-06-16T12:45:00.000Z"
  }
}
```

**Error Responses**:
- **400 Bad Request** (validação falhou):
```json
{
  "error": "ValidationError",
  "message": "Dados inválidos",
  "fields": {
    "weight_kg": "Peso deve estar entre 30 e 300 kg",
    "sex": "Sexo deve ser 'male' ou 'female'"
  }
}
```

---

#### 5. GET /health

**Descrição**: Health check endpoint para monitoring.

**Success Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2025-06-16T15:30:45.123Z",
  "uptime": 3600.5,
  "database": "connected"
}
```

**Error Response** (503 Service Unavailable):
```json
{
  "status": "error",
  "timestamp": "2025-06-16T15:30:45.123Z",
  "uptime": 3600.5,
  "database": "disconnected"
}
```

---

## Data Models

*Modelos de Dados (Database Schema)*

### Schema Prisma

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(uuid()) @db.Uuid
  email         String   @unique @db.VarChar(255)
  password_hash String   @db.VarChar(255)
  name          String   @db.VarChar(100)
  created_at    DateTime @default(now()) @db.Timestamptz(3)
  updated_at    DateTime @updatedAt @db.Timestamptz(3)

  health_profile UserHealthProfile?

  @@map("users")
  @@index([email])
}

model UserHealthProfile {
  id             String   @id @default(uuid()) @db.Uuid
  user_id        String   @unique @db.Uuid
  weight_kg      Decimal? @db.Decimal(5, 2)
  height_cm      Decimal? @db.Decimal(5, 2)
  age            Int?
  sex            Sex?
  activity_level ActivityLevel?
  fitness_goal   FitnessGoal?
  updated_at     DateTime @updatedAt @db.Timestamptz(3)

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@map("user_health_profiles")
  @@index([user_id])
}

enum Sex {
  male
  female
}

enum ActivityLevel {
  sedentary
  lightly_active
  moderately_active
  very_active
  extremely_active
}

enum FitnessGoal {
  weight_loss
  maintenance
  muscle_gain
  athletic_performance
}
```

### SQL DDL (gerado pelo Prisma Migrate)

```sql
-- Migration: 001_initial_schema

CREATE TYPE "Sex" AS ENUM ('male', 'female');

CREATE TYPE "ActivityLevel" AS ENUM (
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
  'extremely_active'
);

CREATE TYPE "FitnessGoal" AS ENUM (
  'weight_loss',
  'maintenance',
  'muscle_gain',
  'athletic_performance'
);

CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMPTZ(3) DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMPTZ(3) NOT NULL
);

CREATE TABLE "user_health_profiles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "weight_kg" DECIMAL(5, 2) CHECK ("weight_kg" BETWEEN 30 AND 300),
  "height_cm" DECIMAL(5, 2) CHECK ("height_cm" BETWEEN 120 AND 230),
  "age" INTEGER CHECK ("age" BETWEEN 14 AND 100),
  "sex" "Sex",
  "activity_level" "ActivityLevel",
  "fitness_goal" "FitnessGoal",
  "updated_at" TIMESTAMPTZ(3) NOT NULL
);

CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "user_health_profiles_user_id_idx" ON "user_health_profiles"("user_id");
```

### Constraints e Validações

| Constraint | Finalidade |
|------------|-----------|
| `users.email UNIQUE` | Previne duplicatas de email |
| `users.password_hash NOT NULL` | Garante que senha foi hasheada |
| `user_health_profiles.user_id UNIQUE` | Um perfil por usuário |
| `ON DELETE CASCADE` | Ao deletar user, deleta profile automaticamente |
| `CHECK weight_kg BETWEEN 30 AND 300` | Validação de faixa fisiológica |
| `CHECK height_cm BETWEEN 120 AND 230` | Validação de faixa fisiológica |
| `CHECK age BETWEEN 14 AND 100` | Validação de faixa de idade |

---

## Migração das Fórmulas Científicas

### Abordagem de Migração

**Objetivo**: Migrar `assets/js/science.js` (vanilla JS) para `composables/useScience.ts` (TypeScript) mantendo precisão numérica idêntica e adicionando type safety.

### Exemplo de Migração — IMC

**Antes (science.js)**:
```javascript
const S = {};
const r = (n, d = 0) => { 
  const f = Math.pow(10, d); 
  return Math.round(n * f) / f; 
};
S.round = r;

S.bmi = (kg, cm) => kg / Math.pow(cm / 100, 2);

S.bmiClass = (b) => {
  if (b < 18.5) return { label: 'Abaixo do peso', tone: 'warn' };
  if (b < 25)   return { label: 'Peso normal', tone: 'good' };
  if (b < 30)   return { label: 'Sobrepeso', tone: 'warn' };
  if (b < 35)   return { label: 'Obesidade grau I', tone: 'bad' };
  if (b < 40)   return { label: 'Obesidade grau II', tone: 'bad' };
  return { label: 'Obesidade grau III', tone: 'bad' };
};
```

**Depois (useScience.ts)**:
```typescript
// composables/useScience.ts

interface BMIClassification {
  label: string
  tone: 'good' | 'warn' | 'bad' | 'info'
}

export function useScience() {
  /**
   * Arredonda número para N casas decimais
   * @param n - Número a arredondar
   * @param decimals - Casas decimais (padrão: 0)
   */
  const round = (n: number, decimals: number = 0): number => {
    const factor = Math.pow(10, decimals)
    return Math.round(n * factor) / factor
  }

  /**
   * Calcula IMC (Índice de Massa Corporal)
   * Fórmula: peso_kg / (altura_m)^2
   * Referência: WHO Obesity Report (2000)
   * @param weight_kg - Peso em quilogramas
   * @param height_cm - Altura em centímetros
   * @returns IMC calculado
   */
  const computeBMI = (weight_kg: number, height_cm: number): number => {
    const height_m = height_cm / 100
    return weight_kg / Math.pow(height_m, 2)
  }

  /**
   * Classifica IMC segundo padrões WHO
   * @param bmi - IMC calculado
   * @returns Objeto com label e tone
   */
  const classifyBMI = (bmi: number): BMIClassification => {
    if (bmi < 18.5) return { label: 'Abaixo do peso', tone: 'warn' }
    if (bmi < 25)   return { label: 'Peso normal', tone: 'good' }
    if (bmi < 30)   return { label: 'Sobrepeso', tone: 'warn' }
    if (bmi < 35)   return { label: 'Obesidade grau I', tone: 'bad' }
    if (bmi < 40)   return { label: 'Obesidade grau II', tone: 'bad' }
    return { label: 'Obesidade grau III', tone: 'bad' }
  }

  return {
    round,
    computeBMI,
    classifyBMI,
    // ... outras funções
  }
}
```

### Exemplo de Migração — Calorias (TMB/TDEE)

**Antes (science.js)**:
```javascript
S.bmr = (sex, kg, cm, age) =>
  sex === 'male'
    ? 10 * kg + 6.25 * cm - 5 * age + 5
    : 10 * kg + 6.25 * cm - 5 * age - 161;

S.tdee = (bmr, factor) => bmr * factor;
```

**Depois (useScience.ts)**:
```typescript
type Sex = 'male' | 'female'

/**
 * Calcula TMB (Taxa Metabólica Basal) usando equação Mifflin-St Jeor (1990)
 * Homens: TMB = 10*peso + 6.25*altura - 5*idade + 5
 * Mulheres: TMB = 10*peso + 6.25*altura - 5*idade - 161
 * @param sex - Sexo biológico
 * @param weight_kg - Peso em kg
 * @param height_cm - Altura em cm
 * @param age - Idade em anos
 * @returns TMB em kcal/dia
 */
const computeBMR = (
  sex: Sex,
  weight_kg: number,
  height_cm: number,
  age: number
): number => {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

/**
 * Calcula TDEE (Total Daily Energy Expenditure)
 * TDEE = TMB × Fator de Atividade
 * @param bmr - Taxa Metabólica Basal
 * @param activityFactor - Fator de atividade (1.2 - 1.9)
 * @returns TDEE em kcal/dia
 */
const computeTDEE = (bmr: number, activityFactor: number): number => {
  return bmr * activityFactor
}
```

### Exemplo de Migração — 1RM

**Antes (science.js)**:
```javascript
S.oneRM = (weight, reps) => {
  if (reps <= 1) return weight;
  if (reps <= 10) return weight * (36 / (37 - reps)); // Brzycki
  return weight * (1 + reps / 30); // Epley
};
```

**Depois (useScience.ts)**:
```typescript
/**
 * Estima 1RM (Uma Repetição Máxima) a partir de carga submáxima
 * - 1-10 reps: Fórmula de Brzycki (1993)
 * - 11-20 reps: Fórmula de Epley (1985)
 * @param weight_kg - Carga levantada
 * @param reps - Repetições até falha
 * @returns 1RM estimado em kg
 */
const compute1RM = (weight_kg: number, reps: number): number => {
  if (reps <= 1) return weight_kg
  if (reps <= 10) {
    // Brzycki: 1RM = peso × (36 / (37 - reps))
    return weight_kg * (36 / (37 - reps))
  }
  // Epley: 1RM = peso × (1 + reps/30)
  return weight_kg * (1 + reps / 30)
}

/**
 * Gera tabela de percentuais de 1RM
 * @param oneRM - 1RM calculado
 * @returns Array de objetos {pct, load, reps}
 */
const generateRMTable = (oneRM: number): Array<{pct: number, load: number, reps: string}> => {
  const percentages = [100, 95, 90, 85, 80, 75, 70, 65, 60]
  const repsMap: Record<number, string> = {
    100: '1', 95: '2', 90: '4', 85: '6', 80: '8',
    75: '10', 70: '12', 65: '15', 60: '18'
  }
  
  return percentages.map(pct => ({
    pct,
    load: oneRM * pct / 100,
    reps: repsMap[pct]
  }))
}
```

### Garantia de Precisão Numérica

**Teste de Comparação**:
```typescript
// tests/unit/useScience.test.ts
import { describe, it, expect } from 'vitest'
import { useScience } from '~/composables/useScience'

describe('useScience - Verificação de Precisão', () => {
  const { computeBMI, round } = useScience()

  it('deve calcular IMC com precisão idêntica ao science.js', () => {
    // Casos de teste extraídos do science.js original
    const testCases = [
      { weight: 75, height: 175, expected: 24.5 },
      { weight: 90, height: 180, expected: 27.8 },
      { weight: 60, height: 160, expected: 23.4 }
    ]

    testCases.forEach(({ weight, height, expected }) => {
      const result = round(computeBMI(weight, height), 1)
      expect(result).toBe(expected)
    })
  })
})
```

---

## Fluxos de Autenticação

### Diagrama de Sequência — Registro de Usuário

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend (Nuxt)
    participant B as Backend (Fastify)
    participant DB as PostgreSQL

    U->>F: Preenche formulário de registro
    F->>F: Valida inputs client-side
    F->>B: POST /api/v1/auth/register
    B->>B: Valida schema (Zod)
    B->>DB: SELECT users WHERE email = ?
    DB-->>B: null (email disponível)
    B->>B: Hash password (bcrypt, cost 12)
    B->>DB: INSERT INTO users
    DB-->>B: Retorna user.id
    B->>DB: INSERT INTO user_health_profiles (opcional)
    B->>B: Gera JWT (HS256, exp 7 dias)
    B-->>F: 201 Created + {user, token}
    F->>F: Armazena token em localStorage
    F->>F: Atualiza userStore
    F->>U: Redireciona para /perfil
```

### Diagrama de Sequência — Login de Usuário

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend (Nuxt)
    participant B as Backend (Fastify)
    participant DB as PostgreSQL

    U->>F: Submete email + senha
    F->>B: POST /api/v1/auth/login
    B->>B: Valida schema (Zod)
    B->>DB: SELECT * FROM users WHERE email = ?
    DB-->>B: user (com password_hash)
    B->>B: bcrypt.compare(senha, password_hash)
    alt Senha correta
        B->>B: Gera JWT
        B-->>F: 200 OK + {user, token}
        F->>F: Armazena token em localStorage
        F->>F: Atualiza userStore
        F->>B: GET /api/v1/users/me (com token)
        B->>DB: SELECT health_profile WHERE user_id = ?
        DB-->>B: health_profile | null
        B-->>F: 200 OK + {user, health_profile}
        F->>U: Redireciona para /perfil ou página anterior
    else Senha incorreta
        B-->>F: 401 Unauthorized
        F->>U: Exibe erro "Credenciais inválidas"
    end
```

### Diagrama de Sequência — Requisição Autenticada

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend (Nuxt)
    participant B as Backend (Fastify)
    participant DB as PostgreSQL

    U->>F: Acessa /perfil
    F->>F: Middleware auth verifica token
    F->>B: GET /api/v1/users/me<br/>Header: Authorization Bearer <token>
    B->>B: JWT Middleware verifica token
    alt Token válido
        B->>B: Extrai user_id do payload
        B->>DB: SELECT * FROM users WHERE id = ?
        DB-->>B: user
        B->>DB: SELECT * FROM health_profiles WHERE user_id = ?
        DB-->>B: health_profile
        B-->>F: 200 OK + {user, health_profile}
        F->>U: Renderiza página com dados
    else Token expirado/inválido
        B-->>F: 401 Unauthorized
        F->>F: Limpa localStorage
        F->>F: Reseta userStore
        F->>U: Redireciona para /login
    end
```

---

## Estratégia de SEO

### Configuração Nuxt 3 SSG

**nuxt.config.ts**:
```typescript
export default defineNuxtConfig({
  // Static Site Generation
  ssr: true,
  
  // Gera páginas estáticas em build-time
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: [
        '/',
        '/calculadora-de-imc',
        '/calculadora-de-calorias',
        '/calculadora-de-proteina',
        '/calculadora-de-gordura-corporal',
        '/calculadora-de-1rm',
        '/calculadora-de-frequencia-cardiaca',
        '/calculadora-de-hidratacao',
        '/calculadora-de-pace'
      ]
    }
  },

  // Meta tags globais
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'FitTools Brasil — Calculadoras Fitness Gratuitas',
      meta: [
        { name: 'description', content: 'Calculadoras fitness cientificamente precisas para IMC, calorias, proteína, gordura corporal e mais.' },
        { name: 'theme-color', content: '#0B0F19' }
      ],
      link: [
        { rel: 'canonical', href: 'https://fittoolsbrasil.com.br' }
      ]
    }
  },

  // Módulos para SEO
  modules: [
    '@nuxtjs/sitemap',
    '@nuxtjs/robots'
  ],

  // Configuração sitemap
  sitemap: {
    hostname: 'https://fittoolsbrasil.com.br',
    gzip: true,
    routes: async () => {
      return [
        { url: '/', changefreq: 'weekly', priority: 1.0 },
        { url: '/calculadora-de-imc', changefreq: 'monthly', priority: 0.9 },
        { url: '/calculadora-de-calorias', changefreq: 'monthly', priority: 0.9 },
        // ... outras calculadoras
      ]
    }
  },

  // robots.txt
  robots: {
    UserAgent: '*',
    Allow: '/',
    Disallow: ['/perfil', '/login', '/registro'],
    Sitemap: 'https://fittoolsbrasil.com.br/sitemap.xml'
  }
})
```

### Meta Tags Dinâmicas por Página

**pages/calculadora-de-imc.vue**:
```vue
<script setup lang="ts">
useHead({
  title: 'Calculadora de IMC Online Grátis — Tabela OMS | FitTools',
  meta: [
    {
      name: 'description',
      content: 'Calcule seu Índice de Massa Corporal (IMC), descubra sua faixa de peso saudável segundo a OMS e entenda as limitações do índice para praticantes de musculação.'
    },
    // Open Graph
    { property: 'og:title', content: 'Calculadora de IMC e Peso Ideal — FitTools' },
    { property: 'og:description', content: 'Calcule seu IMC em segundos e descubra sua faixa de peso ideal conforme a Organização Mundial da Saúde.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://fittoolsbrasil.com.br/calculadora-de-imc' },
    { property: 'og:image', content: 'https://fittoolsbrasil.com.br/og-imc.png' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Calculadora de IMC — FitTools' },
    { name: 'twitter:description', content: 'Calcule seu IMC com a fórmula oficial da OMS.' }
  ],
  link: [
    { rel: 'canonical', href: 'https://fittoolsbrasil.com.br/calculadora-de-imc' }
  ],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Calculadora de IMC FitTools',
        applicationCategory: 'HealthApplication',
        operatingSystem: 'Web',
        inLanguage: 'pt-BR',
        url: 'https://fittoolsbrasil.com.br/calculadora-de-imc',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'BRL'
        }
      })
    },
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'O que é o Índice de Massa Corporal (IMC)?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'O IMC é uma medida internacional adotada pela OMS que relaciona o peso e a altura do indivíduo para classificar o estado nutricional em faixas como desnutrição, peso normal, sobrepeso e obesidade.'
            }
          }
          // ... outras FAQs
        ]
      })
    }
  ]
})
</script>

<template>
  <!-- Calculator component -->
</template>
```

### Structured Data (JSON-LD)

**Schema para Calculadoras**:
- `@type: WebApplication` — identifica como ferramenta web
- `applicationCategory: HealthApplication` — categoria saúde
- `inLanguage: pt-BR` — idioma português brasileiro
- `offers.price: 0` — grátis

**Schema para FAQ**:
- `@type: FAQPage` — rich results no Google
- `mainEntity` — array de perguntas/respostas

### Performance e Core Web Vitals

**Estratégias**:
1. **SSG**: HTML pré-renderizado → FCP < 1.5s
2. **Code Splitting**: Lazy load por rota → Smaller initial bundle
3. **Image Optimization**: `<NuxtImg>` com lazy loading
4. **Font Optimization**: `font-display: swap` para evitar FOIT
5. **CSS Critical**: Inline CSS crítico, defer resto

**Targets Lighthouse**:
- Performance: ≥ 85 (mobile)
- SEO: ≥ 95
- Accessibility: ≥ 90
- Best Practices: ≥ 90

---

## Decisões Técnicas e Trade-offs

### 1. Fastify vs Express

**Escolha**: Fastify

**Justificativa**:
- **Performance**: 2-3x mais rápido que Express em benchmarks oficiais ([fonte](https://www.fastify.io/benchmarks/))
- **Schema Validation**: Validação JSON Schema embutida (vs biblioteca externa no Express)
- **TypeScript**: Melhor suporte nativo para tipos
- **Plugins**: Sistema de encapsulamento via `.register()`
- **Logging**: Pino (logger estruturado) integrado por padrão

**Trade-off**: Ecossistema menor que Express, menos middlewares de terceiros. Mitigação: Fastify oferece `@fastify/express` para compatibilidade.

### 2. Prisma vs node-pg (raw SQL)

**Escolha**: Prisma

**Justificativa**:
- **Type Safety**: Client gerado automaticamente com types para todas as queries
- **Migrations**: `prisma migrate dev` gera e versiona migrations automaticamente
- **Developer Experience**: Prisma Studio para debugging, autocomplete no VSCode
- **Introspection**: `prisma db pull` gera schema a partir de DB existente

**Trade-off**: Overhead de ~10% comparado a raw SQL ([benchmark](https://www.prisma.io/docs/concepts/more/comparisons/prisma-and-typeorm#performance)). Para MVP com <1000 usuários, DX > Performance.

**Alternativa considerada**: Drizzle ORM (TypeScript-first, SQL-like, zero runtime overhead). Descartado por comunidade menor e documentação menos madura.

### 3. Pinia vs Vuex

**Escolha**: Pinia

**Justificativa**:
- **Composition API**: Integração nativa, menos boilerplate
- **TypeScript**: Inferência automática de tipos
- **DevTools**: Melhor suporte no Vue DevTools
- **Tree-shakeable**: Stores não usados não vão para o bundle final
- **Oficialmente recomendado**: Equipe Vue.js recomenda Pinia para Vue 3

**Trade-off**: Nenhum significativo. Pinia é sucessor oficial do Vuex.

### 4. SSG vs SSR para Calculadoras

**Escolha**: SSG (Static Site Generation)

**Justificativa**:
- **SEO**: HTML completo disponível para crawlers (Google Bot)
- **Performance**: Sem renderização no servidor; arquivos estáticos servidos pelo Caddy (e cacheáveis em CDN, se Cloudflare for adotado)
- **Custo**: Hospedagem estática simples: os arquivos de `.output/public` são servidos diretamente pelo Caddy na própria VPS, sem container Node para o frontend (Cloudflare gratuito pode ser colocado na frente como CDN, opcionalmente)
- **UX**: First Contentful Paint < 1.5s

**Trade-off**: Conteúdo estático, não personalizado por usuário. Mitigação: Após login, dados dinâmicos vêm da API e são hidratados client-side.

**Alternativa considerada**: SSR (Server-Side Rendering). Descartado pois calculadoras são estáticas; personalização acontece apenas após autenticação.

### 5. JWT vs Sessions (Redis)

**Escolha**: JWT (stateless)

**Justificativa**:
- **Escalabilidade**: Backend stateless, múltiplas instâncias sem shared state
- **Simplicidade**: Não requer Redis/Memcached para MVP
- **Mobile-ready**: Token pode ser armazenado em app mobile no futuro

**Trade-off**: Impossível revogar tokens antes da expiração. Mitigação: Expiração curta (7 dias) e implementar blocklist no futuro se necessário.

### 6. Tailwind CSS vs CSS Modules

**Escolha**: Tailwind CSS

**Justificativa**:
- **Produtividade**: Classes utilitárias reduzem context switching
- **Bundle size**: PurgeCSS remove classes não usadas (< 10KB gzipped)
- **Consistência**: Design tokens (cores, spacing) forçam consistência
- **Migração**: `@apply` permite manter classes semânticas do CSS existente

**Trade-off**: HTML verboso com muitas classes. Mitigação: Extrair componentes Vue reutilizáveis.

### 7. VPS Hetzner com Docker vs Plataformas Gerenciadas

**Escolha**: Uma única VPS Hetzner com Docker Compose (Caddy + API Fastify + PostgreSQL), administrada pelo próprio time.

**Justificativa**:
- **Custo previsível**: Um único valor mensal fixo pela VPS, em vez de uma cobrança por serviço (frontend, API, banco). Valores devem ser confirmados no site da Hetzner.
- **Controle**: Total sobre a configuração do servidor, do banco e dos backups, relevante porque o banco guarda dados de saúde (LGPD).
- **Simplicidade de stack**: Um `docker-compose.yml` descreve todo o ambiente; o mesmo PostgreSQL roda em desenvolvimento e produção.
- **HTTPS automático**: Caddy emite e renova certificados sem configuração adicional.

**Trade-offs**:
- **Ponto único de falha**: Se a VPS cair, frontend, API e banco ficam indisponíveis juntos. Aceitável para o MVP (< 1000 usuários); a mitigação é backup externo testado e procedimento de restauração documentado. Alta disponibilidade (segunda VPS, banco gerenciado) fica para pós-MVP.
- **Responsabilidade operacional**: Patches de segurança, firewall, monitoramento e backups passam a ser do time (ver checklist de hardening na seção Implantação).
- **Latência**: A Hetzner não tem datacenter no Brasil. Avaliar a região dos EUA (Ashburn) pela latência para o público brasileiro; usar Cloudflare gratuito como CDN dos estáticos é uma recomendação opcional que reduz o impacto.
- **Dados fora do Brasil**: Os dados ficarão armazenados em datacenter no exterior. A política de privacidade deve mencionar esse armazenamento (a redação final deve ser validada por profissional jurídico).

**Alternativa considerada**: Plataformas gerenciadas (PaaS e banco gerenciado). Descartadas pelo trade-off conforto operacional vs. controle e custo previsível.

---

## Error Handling

*Tratamento de Erros: resumo consolidado do que já está documentado nas demais seções (API, autenticação, segurança e implantação). Nenhum comportamento novo é definido aqui.*

### Formato de Erros da API

Todas as respostas de erro da API são JSON com o campo `error` (nome do tipo de erro) e `message` (texto em português). Erros de validação incluem também `fields`, mapeando cada campo inválido à sua mensagem. Detalhes e exemplos estão em "Components and Interfaces".

| Status | `error` | Quando ocorre |
|--------|---------|---------------|
| 400 | `ValidationError` | Falha na validação Zod de `register`, `login` ou do perfil de saúde (inclui `fields`) |
| 401 | `UnauthorizedError` | Credenciais incorretas no login; token ausente, em formato inválido, expirado ou inválido |
| 409 | `ConflictError` | Email já cadastrado no registro |
| 429 | `TooManyRequestsError` | Limite de requisições excedido (inclui `retryAfter` em segundos) |
| 503 | `status: "error"` | `GET /health` quando o banco está desconectado (`database: "disconnected"`) |

### Tratamento no Frontend

- **Validação client-side**: os formulários validam as entradas antes do envio e exibem a mensagem de erro no campo.
- **401 em requisição autenticada**: o frontend limpa o `localStorage`, reseta o `userStore` e redireciona para `/login` (ver "Fluxos de Autenticação").
- **Login com senha incorreta**: exibe a mensagem "Credenciais inválidas" ao usuário.
- **Rota inexistente**: o Caddy serve `404.html` com status HTTP 404 (e não 200), evitando "soft 404" no Google (ver "Implantação").

### Tratamento no Backend

- **Autenticação**: o middleware JWT responde 401 com mensagens distintas para token ausente, formato inválido, expirado e inválido (ver "Segurança").
- **Rate limiting**: o `errorResponseBuilder` devolve 429 com mensagem em português e `retryAfter`; o login permite 5 tentativas por 15 minutos por IP.
- **CORS**: origens fora da lista permitida são rejeitadas (`Not allowed by CORS`).
- **Configuração inválida**: as variáveis de ambiente são validadas com Zod na inicialização (`src/config/env.ts`); valores inválidos impedem o início do servidor.
- **Logs**: atividade suspeita é registrada como `warn`; senhas, tokens JWT, headers `Authorization` e hashes de senha nunca são logados.
- **Desligamento**: o Node é o PID 1 do container e recebe o SIGTERM diretamente, permitindo desligamento gracioso.

### Tratamento de Falhas Operacionais

- **Migration com falha**: `docker compose run --rm migrate` retorna erro, o pipeline para e a API antiga continua em execução; o estado é verificado com `prisma migrate status` e resolvido com `prisma migrate resolve`.
- **Falha na API**: o Caddy mantém o frontend estático no ar mesmo se a API estiver indisponível; o `healthcheck` do container e o monitor externo em `/health` sinalizam o problema.
- **Deploy com problema**: rollback ajustando `API_TAG` e o link `releases/current` para a versão anterior (ver "CI/CD — GitHub Actions").
- **Perda de dados ou da VPS**: restauração a partir do backup criptografado externo (ver "Backup e Restauração do PostgreSQL").

---

## Segurança

### 1. CORS (Cross-Origin Resource Sharing)

**Configuração Backend**:
```typescript
// src/server.ts
import cors from '@fastify/cors'

await fastify.register(cors, {
  origin: (origin, callback) => {
    const whitelist = [
      'http://localhost:3000',           // Dev frontend
      'https://fittoolsbrasil.com.br',   // Prod frontend
      'https://www.fittoolsbrasil.com.br'
    ]
    
    if (!origin || whitelist.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'), false)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})
```

**Headers de Resposta**:
```
Access-Control-Allow-Origin: https://fittoolsbrasil.com.br
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### 2. Rate Limiting

**Estratégia por Endpoint**:

| Endpoint | Limite | Janela | Identificador |
|----------|--------|--------|---------------|
| `/api/v1/auth/login` | 5 requests | 15 min | IP address |
| `/api/v1/auth/register` | 3 requests | 60 min | IP address |
| Endpoints públicos | 60 requests | 15 min | IP address |
| Endpoints autenticados | 300 requests | 15 min | user_id (JWT) |

**Implementação**:
```typescript
// src/middlewares/rateLimit.ts
import rateLimit from '@fastify/rate-limit'

export const rateLimitConfig = {
  global: true,
  max: 60,
  timeWindow: '15 minutes',
  cache: 10000,
  allowList: ['127.0.0.1'], // Whitelist para health checks
  redis: undefined, // Para MVP, em memória; prod usa Redis
  keyGenerator: (req) => {
    // Se autenticado, limita por user_id; senão por IP
    return req.user?.id || req.ip
  },
  errorResponseBuilder: (req, context) => {
    return {
      error: 'TooManyRequestsError',
      message: 'Muitas requisições. Tente novamente em alguns minutos.',
      retryAfter: context.ttl
    }
  }
}

// Rate limit específico para login
export const loginRateLimit = {
  max: 5,
  timeWindow: '15 minutes',
  keyGenerator: (req) => req.ip,
  errorResponseBuilder: (req, context) => {
    return {
      error: 'TooManyRequestsError',
      message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      retryAfter: context.ttl
    }
  }
}
```

**Uso nas Rotas**:
```typescript
// src/routes/auth.routes.ts
fastify.post('/login', {
  config: { rateLimit: loginRateLimit }
}, loginHandler)
```

### 3. Password Hashing com bcrypt

**Configuração**:
```typescript
// src/services/auth.service.ts
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12 // Cost factor (2^12 = 4096 iterações)

export class AuthService {
  /**
   * Hash password com bcrypt
   * Tempo de execução: ~300ms no cost factor 12
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
  }

  /**
   * Verifica password contra hash
   * Tempo de execução: ~300ms (tempo constante previne timing attacks)
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }
}
```

**Justificativa Cost Factor 12**:
- **Segurança**: Resistente a ataques de força bruta (cada tentativa leva ~300ms)
- **UX**: Latência aceitável para login (<500ms incluindo DB query)
- **Futureproof**: Aumentar para 13-14 em 3-5 anos conforme hardware evolui

### 4. JWT (JSON Web Tokens)

**Configuração**:
```typescript
// src/utils/jwt.util.ts
import jwt from 'jsonwebtoken'
import { env } from '../config/env'

interface JWTPayload {
  user_id: string
  email: string
  iat: number
  exp: number
}

/**
 * Gera JWT assinado com HS256
 * @param userId - UUID do usuário
 * @param email - Email do usuário
 * @returns Token JWT
 */
export function signJWT(userId: string, email: string): string {
  const payload = {
    user_id: userId,
    email
  }
  
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${env.JWT_EXPIRATION_DAYS}d`
  })
}

/**
 * Verifica e decodifica JWT
 * @param token - Token JWT
 * @returns Payload decodificado
 * @throws Error se token inválido/expirado
 */
export function verifyJWT(token: string): JWTPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256']
    }) as JWTPayload
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expirado')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Token inválido')
    }
    throw error
  }
}
```

**JWT Middleware**:
```typescript
// src/middlewares/jwt.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyJWT } from '../utils/jwt.util'

export async function jwtMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization
  
  if (!authHeader) {
    return reply.status(401).send({
      error: 'UnauthorizedError',
      message: 'Token de autenticação não fornecido'
    })
  }
  
  const [bearer, token] = authHeader.split(' ')
  
  if (bearer !== 'Bearer' || !token) {
    return reply.status(401).send({
      error: 'UnauthorizedError',
      message: 'Formato de token inválido'
    })
  }
  
  try {
    const payload = verifyJWT(token)
    request.user = { id: payload.user_id, email: payload.email }
  } catch (error) {
    return reply.status(401).send({
      error: 'UnauthorizedError',
      message: error.message
    })
  }
}
```

**Gerenciamento do Secret**:
```bash
# Gerar secret seguro (256 bits)
openssl rand -base64 32

# Exemplo de output:
# k7xJ9mP2nQ8vL4wR6tY1uE3oI5aS0dF2gH8jK4lM9nP=
```

**Armazenamento**:
- **Development**: `.env` file (gitignored)
- **Production**: Arquivo `.env` no servidor (ex: `/opt/fittools/.env`), com permissão restrita (`chmod 600`), pertencente ao usuário de deploy, **fora do repositório** e referenciado pelo `docker compose` via `env_file`. O segredo nunca passa pelo GitHub Actions; apenas a chave SSH e o host ficam em GitHub Secrets.

**Rotação de Secrets**: Implementar endpoint `/api/v1/auth/refresh` no futuro para rotação sem logout.

### 5. Input Sanitization e Validation

**Validação com Zod**:
```typescript
// src/schemas/auth.schema.ts
import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim()
    .max(255, 'Email muito longo'),
  
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(128, 'Senha muito longa')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Senha deve conter letras maiúsculas, minúsculas e números'
    ),
  
  name: z.string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Nome contém caracteres inválidos')
})

export const healthProfileSchema = z.object({
  weight_kg: z.number()
    .min(30, 'Peso mínimo: 30 kg')
    .max(300, 'Peso máximo: 300 kg')
    .multipleOf(0.01),
  
  height_cm: z.number()
    .min(120, 'Altura mínima: 120 cm')
    .max(230, 'Altura máxima: 230 cm')
    .multipleOf(0.01),
  
  age: z.number()
    .int('Idade deve ser número inteiro')
    .min(14, 'Idade mínima: 14 anos')
    .max(100, 'Idade máxima: 100 anos'),
  
  sex: z.enum(['male', 'female'], {
    errorMap: () => ({ message: "Sexo deve ser 'male' ou 'female'" })
  }),
  
  activity_level: z.enum([
    'sedentary',
    'lightly_active',
    'moderately_active',
    'very_active',
    'extremely_active'
  ]),
  
  fitness_goal: z.enum([
    'weight_loss',
    'maintenance',
    'muscle_gain',
    'athletic_performance'
  ])
})
```

**Uso nas Rotas**:
```typescript
// src/routes/auth.routes.ts
import { registerSchema } from '../schemas/auth.schema'

fastify.post('/register', async (request, reply) => {
  // Validação com Zod
  const validationResult = registerSchema.safeParse(request.body)
  
  if (!validationResult.success) {
    return reply.status(400).send({
      error: 'ValidationError',
      message: 'Dados inválidos',
      fields: validationResult.error.flatten().fieldErrors
    })
  }
  
  const { email, password, name } = validationResult.data
  // ... lógica de registro
})
```

### 6. SQL Injection Prevention

**Prisma Previne Automaticamente**:
```typescript
// ✅ SEGURO - Prisma usa parameterized queries
const user = await prisma.user.findUnique({
  where: { email: userInput } // Prisma sanitiza automaticamente
})

// ❌ NUNCA FAZER - raw SQL com interpolação
const user = await prisma.$queryRawUnsafe(
  `SELECT * FROM users WHERE email = '${userInput}'`
)

// ✅ Raw SQL com parameters (se necessário)
const user = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`
```

### 7. XSS (Cross-Site Scripting) Prevention

**Frontend (Vue 3)**:
- Vue escapa automaticamente conteúdo interpolado: `{{ userName }}`
- Usar `v-text` em vez de `v-html` quando possível
- Se `v-html` necessário, sanitizar com DOMPurify:

```typescript
// composables/useSanitize.ts
import DOMPurify from 'dompurify'

export function useSanitize() {
  const sanitizeHTML = (dirty: string): string => {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: []
    })
  }
  
  return { sanitizeHTML }
}
```

**Backend**:
- Validação Zod remove tags HTML automaticamente (`.trim()`)
- Headers de segurança via `@fastify/helmet`:

```typescript
// src/server.ts
import helmet from '@fastify/helmet'

await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  }
})
```

### 8. Logging e Monitoring

**Structured Logging com Pino**:
```typescript
// src/server.ts
import Fastify from 'fastify'

const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          remoteAddress: request.ip,
          // NUNCA logar: Authorization header, password, tokens
        }
      },
      res(reply) {
        return {
          statusCode: reply.statusCode
        }
      }
    }
  }
})

// Log de atividade suspeita
fastify.addHook('onRequest', async (request, reply) => {
  if (request.url.includes('..') || request.url.includes('<script>')) {
    request.log.warn({
      event: 'suspicious_activity',
      ip: request.ip,
      url: request.url
    }, 'Tentativa de ataque detectada')
  }
})
```

**Dados que NUNCA devem ser logados**:
- ❌ Senhas (plaintext)
- ❌ Tokens JWT
- ❌ Authorization headers completos
- ❌ Password hashes
- ❌ Informações de cartão de crédito (futuro)

---

## Testing Strategy

*Estratégia de Testes*

### Pirâmide de Testes

```
         /\
        /  \  E2E Tests (5%)
       /____\  - Playwright
      /      \  Component Tests (20%)
     /________\  - Testing Library
    /          \  Integration Tests (35%)
   /____________\  - API endpoints com DB de teste
  /              \  Unit Tests (40%)
 /________________\  - Composables, services, utils
```

### 1. Unit Tests — Fórmulas Científicas (Composables)

**Objetivo**: Garantir precisão numérica idêntica ao `science.js` original.

**Framework**: Vitest

**Exemplo**:
```typescript
// tests/unit/useScience.test.ts
import { describe, it, expect } from 'vitest'
import { useScience } from '~/composables/useScience'

describe('useScience - IMC', () => {
  const { computeBMI, classifyBMI, round } = useScience()

  it('deve calcular IMC corretamente', () => {
    expect(round(computeBMI(75, 175), 1)).toBe(24.5)
    expect(round(computeBMI(90, 180), 1)).toBe(27.8)
    expect(round(computeBMI(60, 160), 1)).toBe(23.4)
  })

  it('deve classificar IMC segundo WHO', () => {
    expect(classifyBMI(17).label).toBe('Abaixo do peso')
    expect(classifyBMI(22).label).toBe('Peso normal')
    expect(classifyBMI(27).label).toBe('Sobrepeso')
    expect(classifyBMI(32).label).toBe('Obesidade grau I')
  })

  it('deve lidar com valores extremos', () => {
    const bmi = computeBMI(300, 230)
    expect(bmi).toBeGreaterThan(0)
    expect(bmi).toBeLessThan(200)
  })
})

describe('useScience - TMB/TDEE', () => {
  const { computeBMR, computeTDEE, round } = useScience()

  it('deve calcular TMB para homens (Mifflin-St Jeor)', () => {
    const bmr = computeBMR('male', 80, 180, 30)
    expect(round(bmr)).toBe(1850)
  })

  it('deve calcular TMB para mulheres', () => {
    const bmr = computeBMR('female', 60, 165, 25)
    expect(round(bmr)).toBe(1347)
  })

  it('deve calcular TDEE com fator de atividade', () => {
    const bmr = 1800
    expect(round(computeTDEE(bmr, 1.2))).toBe(2160) // Sedentário
    expect(round(computeTDEE(bmr, 1.55))).toBe(2790) // Moderado
  })
})
```

**Property-Based Tests com fast-check**:
```typescript
// tests/unit/properties/science.property.test.ts
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { useScience } from '~/composables/useScience'

describe('Propriedades Matemáticas - Calculadoras', () => {
  const { computeBMI, compute1RM } = useScience()

  it('Propriedade: IMC é sempre positivo para entradas válidas', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 30, max: 300, noNaN: true }), // weight_kg
        fc.float({ min: 120, max: 230, noNaN: true }), // height_cm
        (weight, height) => {
          const bmi = computeBMI(weight, height)
          expect(bmi).toBeGreaterThan(0)
          expect(Number.isFinite(bmi)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Propriedade: 1RM aumenta com peso para reps fixo', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 10, max: 200 }), // weight1
        fc.float({ min: 10, max: 200 }), // weight2
        fc.integer({ min: 1, max: 20 }),  // reps
        (w1, w2, reps) => {
          if (w1 < w2) {
            const rm1 = compute1RM(w1, reps)
            const rm2 = compute1RM(w2, reps)
            expect(rm2).toBeGreaterThanOrEqual(rm1)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Propriedade: 1RM diminui com aumento de reps para peso fixo', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 50, max: 150 }),    // weight
        fc.integer({ min: 1, max: 10 }),    // reps1
        fc.integer({ min: 11, max: 20 }),   // reps2
        (weight, reps1, reps2) => {
          const rm1 = compute1RM(weight, reps1)
          const rm2 = compute1RM(weight, reps2)
          expect(rm1).toBeGreaterThan(rm2)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

**Comando**:
```bash
npm run test:unit
```

### 2. Integration Tests — API Endpoints

**Objetivo**: Testar endpoints com database de teste real.

**Setup**:
```typescript
// tests/integration/setup.ts
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const prisma = new PrismaClient()

export async function setupTestDB() {
  // Aplica migrations no DB de teste
  execSync('npx prisma migrate deploy', {
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL }
  })
}

export async function cleanupTestDB() {
  // Limpa todas as tabelas
  await prisma.userHealthProfile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.$disconnect()
}
```

**Exemplo**:
```typescript
// tests/integration/auth.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { build } from '../helpers/app'
import { setupTestDB, cleanupTestDB } from './setup'

describe('POST /api/v1/auth/register', () => {
  let app: any

  beforeAll(async () => {
    await setupTestDB()
    app = await build()
  })

  afterAll(async () => {
    await app.close()
    await cleanupTestDB()
  })

  beforeEach(async () => {
    await cleanupTestDB()
  })

  it('deve criar usuário com credenciais válidas', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'teste@exemplo.com',
        password: 'SenhaForte123',
        name: 'Teste Silva'
      }
    })

    expect(response.statusCode).toBe(201)
    const body = JSON.parse(response.body)
    expect(body.user.email).toBe('teste@exemplo.com')
    expect(body.token).toBeDefined()
    expect(body.user.password_hash).toBeUndefined() // Não expor hash
  })

  it('deve rejeitar email duplicado', async () => {
    const payload = {
      email: 'duplicado@exemplo.com',
      password: 'Senha123',
      name: 'Teste'
    }

    // Primeira criação
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload
    })

    // Segunda tentativa (duplicada)
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload
    })

    expect(response.statusCode).toBe(409)
    const body = JSON.parse(response.body)
    expect(body.error).toBe('ConflictError')
  })

  it('deve rejeitar senha fraca', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'teste@exemplo.com',
        password: '123',
        name: 'Teste'
      }
    })

    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.body)
    expect(body.error).toBe('ValidationError')
    expect(body.fields.password).toBeDefined()
  })
})

describe('POST /api/v1/auth/login', () => {
  let app: any
  const testUser = {
    email: 'login@exemplo.com',
    password: 'SenhaForte123',
    name: 'Login Teste'
  }

  beforeAll(async () => {
    await setupTestDB()
    app = await build()
  })

  afterAll(async () => {
    await app.close()
    await cleanupTestDB()
  })

  beforeEach(async () => {
    await cleanupTestDB()
    // Cria usuário para testes de login
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: testUser
    })
  })

  it('deve autenticar com credenciais corretas', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testUser.email,
        password: testUser.password
      }
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.token).toBeDefined()
    expect(body.user.email).toBe(testUser.email)
  })

  it('deve rejeitar senha incorreta', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testUser.email,
        password: 'SenhaErrada123'
      }
    })

    expect(response.statusCode).toBe(401)
  })

  it('deve respeitar rate limiting', async () => {
    const payload = {
      email: testUser.email,
      password: 'SenhaErrada'
    }

    // 5 tentativas (limite)
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload
      })
    }

    // 6ª tentativa deve ser bloqueada
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload
    })

    expect(response.statusCode).toBe(429)
    const body = JSON.parse(response.body)
    expect(body.error).toBe('TooManyRequestsError')
  })
})
```

**Comando**:
```bash
npm run test:integration
```

### 3. Component Tests — Formulários Vue

**Framework**: Testing Library + Vitest

**Exemplo**:
```typescript
// tests/component/CalculatorForm.test.ts
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
import CalculatorForm from '~/components/Calculator/Form.vue'

describe('CalculatorForm - IMC', () => {
  it('deve renderizar campos de entrada', () => {
    render(CalculatorForm, {
      props: {
        fields: [
          { n: 'kg', l: 'Peso', t: 'number', unit: 'kg' },
          { n: 'cm', l: 'Altura', t: 'number', unit: 'cm' }
        ]
      }
    })

    expect(screen.getByLabelText('Peso')).toBeInTheDocument()
    expect(screen.getByLabelText('Altura')).toBeInTheDocument()
  })

  it('deve validar entrada e exibir erro', async () => {
    const { container } = render(CalculatorForm, {
      props: {
        fields: [
          { n: 'kg', l: 'Peso', t: 'number', unit: 'kg', min: 30, max: 300 }
        ]
      }
    })

    const input = screen.getByLabelText('Peso') as HTMLInputElement
    
    // Entrada inválida (abaixo do mínimo)
    await fireEvent.update(input, '20')
    await fireEvent.blur(input)

    expect(screen.getByText(/Peso mínimo/i)).toBeInTheDocument()
  })

  it('deve emitir evento submit com dados válidos', async () => {
    const { emitted } = render(CalculatorForm, {
      props: {
        fields: [
          { n: 'kg', l: 'Peso', t: 'number', unit: 'kg', ph: '75' },
          { n: 'cm', l: 'Altura', t: 'number', unit: 'cm', ph: '175' }
        ]
      }
    })

    await fireEvent.update(screen.getByLabelText('Peso'), '80')
    await fireEvent.update(screen.getByLabelText('Altura'), '180')
    await fireEvent.click(screen.getByRole('button', { name: /calcular/i }))

    expect(emitted().submit).toBeTruthy()
    expect(emitted().submit[0]).toEqual([{ kg: 80, cm: 180 }])
  })
})
```

### 4. E2E Tests — User Journeys

**Framework**: Playwright

**Exemplo**:
```typescript
// tests/e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Jornada de Usuário Completa', () => {
  test('registro → login → atualizar perfil → usar calculadora', async ({ page }) => {
    const email = `teste-${Date.now()}@exemplo.com`
    const password = 'SenhaSegura123'

    // 1. Registro
    await page.goto('/registro')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.fill('input[name="name"]', 'Teste E2E')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('/perfil')

    // 2. Atualizar perfil de saúde
    await page.fill('input[name="weight_kg"]', '75')
    await page.fill('input[name="height_cm"]', '175')
    await page.fill('input[name="age"]', '28')
    await page.selectOption('select[name="sex"]', 'male')
    await page.selectOption('select[name="activity_level"]', 'moderately_active')
    await page.click('button:has-text("Salvar Perfil")')
    
    await expect(page.locator('.toast')).toContainText('Perfil atualizado')

    // 3. Usar calculadora de IMC com dados do perfil
    await page.goto('/calculadora-de-imc')
    
    // Campos devem estar pré-preenchidos
    const weightInput = page.locator('input[name="kg"]')
    await expect(weightInput).toHaveValue('75')
    
    await page.click('button:has-text("Calcular")')
    
    // Resultado deve aparecer
    await expect(page.locator('.result-headline')).toContainText('24.5')
    await expect(page.locator('.result-status')).toContainText('Peso normal')
  })

  test('visitante anônimo pode usar calculadoras', async ({ page }) => {
    await page.goto('/calculadora-de-imc')
    
    await page.fill('input[name="kg"]', '80')
    await page.fill('input[name="cm"]', '180')
    await page.click('button:has-text("Calcular")')
    
    await expect(page.locator('.result-headline')).toContainText('24.7')
  })

  test('middleware auth redireciona para login', async ({ page }) => {
    await page.goto('/perfil')
    
    // Deve redirecionar para /login
    await expect(page).toHaveURL('/login')
  })
})
```

**Comando**:
```bash
npx playwright test
```

### Cobertura de Código

**Target**: Mínimo 70% para lógica de negócio

**Configuração Vitest**:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.ts',
        '.nuxt/',
        '.output/'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    }
  }
})
```

**Comando**:
```bash
npm run test:coverage
```

---

## Variáveis de Ambiente

### Backend (.env)

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/fittools_dev"
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/fittools_test"

# JWT
JWT_SECRET="k7xJ9mP2nQ8vL4wR6tY1uE3oI5aS0dF2gH8jK4lM9nP="  # openssl rand -base64 32
JWT_EXPIRATION_DAYS=7

# Server
PORT=3001
NODE_ENV=development  # development | test | production (staging usa production)
HOST=0.0.0.0

# CORS
CORS_ORIGIN="http://localhost:3000"  # Prod: https://fittoolsbrasil.com.br

# Rate Limiting (opcional - para Redis em prod)
REDIS_URL=""  # Prod: redis://...

# Logging
LOG_LEVEL=debug  # debug | info | warn | error
```

### Frontend (.env)

```bash
# API Base URL
NUXT_PUBLIC_API_BASE_URL="http://localhost:3001"  # Prod: https://api.fittoolsbrasil.com.br

# Site URL (para canonical URLs e Open Graph)
NUXT_PUBLIC_SITE_URL="http://localhost:3000"  # Prod: https://fittoolsbrasil.com.br

# Analytics (futuro)
NUXT_PUBLIC_GA_ID=""  # Google Analytics ID
```

### Validação de ENV no Backend

```typescript
// src/config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  JWT_EXPIRATION_DAYS: z.string().transform(Number).pipe(z.number().min(1).max(30)),
  PORT: z.string().transform(Number).pipe(z.number().min(1024).max(65535)),
  NODE_ENV: z.enum(['development', 'test', 'production']),
  // Aceita uma ou mais origens separadas por vírgula (ex: domínio principal e www)
  CORS_ORIGIN: z.string().min(1)
})

export const env = envSchema.parse(process.env)
```

### .env.example (versionado no Git)

**Backend**:
```bash
# Copie para .env e preencha os valores

DATABASE_URL="postgresql://user:password@localhost:5432/fittools_dev"
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/fittools_test"
JWT_SECRET=""  # Gere com: openssl rand -base64 32
JWT_EXPIRATION_DAYS=7
PORT=3001
NODE_ENV=development
HOST=0.0.0.0
CORS_ORIGIN="http://localhost:3000"
LOG_LEVEL=debug
```

**Frontend**:
```bash
# Copie para .env e preencha os valores

NUXT_PUBLIC_API_BASE_URL="http://localhost:3001"
NUXT_PUBLIC_SITE_URL="http://localhost:3000"
```

---

## Implantação (Deployment)

### Visão Geral da Arquitetura de Produção

Toda a produção roda em **uma única VPS Hetzner** com `docker compose`. O frontend não tem container: o Caddy serve diretamente os arquivos gerados por `nuxt generate`.

```mermaid
graph TB
    subgraph "Internet"
        U[Visitante / Googlebot]
        CF[Cloudflare Free - CDN opcional]
    end

    subgraph "VPS Hetzner - Docker Compose"
        subgraph "Rede edge"
            C[Caddy<br/>HTTPS automático<br/>portas 80 e 443]
        end
        subgraph "Rede backend - internal"
            A[API Fastify<br/>porta 3001 - não publicada]
            D[(PostgreSQL 15<br/>sem porta publicada)]
        end
        W[releases/current<br/>conteúdo de .output/public]
        V[(Volume pgdata)]
    end

    subgraph "Fora da VPS"
        B[(Backups criptografados<br/>Storage Box ou Object Storage)]
    end

    U -->|fittoolsbrasil.com.br| CF
    CF -->|opcional| C
    U -->|api.fittoolsbrasil.com.br| C
    C -->|arquivos estáticos| W
    C -->|reverse_proxy| A
    A -->|SQL| D
    D --- V
    D -.->|pg_dump + cron| B

    style C fill:#34d399
    style A fill:#3b82f6
    style D fill:#8b5cf6
```

**Pré-requisitos antes do primeiro deploy**:
1. Confirmar que o domínio `fittoolsbrasil.com.br` está registrado e que há acesso ao painel de DNS.
2. Criar registros DNS `A` (e `AAAA`, se houver IPv6) para `fittoolsbrasil.com.br`, `www` e `api` apontando para o IP da VPS.
3. Contratar a VPS (confirmar tipos, preços e regiões no site da Hetzner; avaliar Ashburn/EUA pela latência para o público brasileiro).
4. Ter um repositório no GitHub com GitHub Actions habilitado.
5. Gerar e versionar as migrations do Prisma (`prisma migrate dev --name init` em desenvolvimento). O repositório precisa conter `prisma/migrations/` antes do primeiro `prisma migrate deploy`.

**Ajustes necessários no projeto para este modelo de deploy**:
- Mover o pacote `prisma` (versão fixa 5.22.0) de `devDependencies` para `dependencies` no `fittools-backend/package.json`, pois a CLI é necessária em produção para executar `prisma migrate deploy`.
- Configurar `trustProxy: true` na instância Fastify (`Fastify({ trustProxy: true, ... })`). Como o Caddy é o proxy reverso, sem isso `request.ip` seria sempre o IP interno do Caddy e o rate limiting por IP (Requisito 6) agruparia todos os usuários no mesmo contador. É seguro habilitar porque a porta 3001 não é publicada: a API só é alcançável pelo Caddy, via rede Docker.

### Ambientes

| Ambiente | Frontend | Backend | Database |
|----------|----------|---------|----------|
| **Development** | localhost:3000 (`nuxt dev`) | localhost:3001 (`npm run dev`) | PostgreSQL em Docker via `docker-compose.dev.yml` (localhost:5432) |
| **Staging** (opcional) | staging.fittoolsbrasil.com.br | api-staging.fittoolsbrasil.com.br | Segundo PostgreSQL em outro projeto Docker Compose na mesma VPS, com banco e volume separados. Pode ser adiado para depois do MVP. |
| **Production** | fittoolsbrasil.com.br | api.fittoolsbrasil.com.br | PostgreSQL em container com volume persistente, acessível apenas pela rede interna do Docker |

Cada ambiente usa um banco PostgreSQL próprio (Requisito 10.8). O backend aceita `NODE_ENV` igual a `development`, `test` ou `production`; staging, se existir, roda com `NODE_ENV=production` e variáveis próprias.

### Estrutura de Arquivos de Deploy

**No repositório**:
```
.
├── docker-compose.dev.yml          # Apenas PostgreSQL para desenvolvimento local
├── deploy/
│   ├── docker-compose.yml          # Stack de produção (Caddy + API + PostgreSQL)
│   ├── Caddyfile
│   └── scripts/
│       ├── backup.sh
│       └── restore.sh
├── fittools-backend/
│   ├── Dockerfile
│   └── .dockerignore
└── .github/workflows/ci.yml
```

**No servidor** (`/opt/fittools`, pertencente ao usuário `deploy`):
```
/opt/fittools/
├── .env                  # Segredos de produção (chmod 600, fora do Git)
├── docker-compose.yml    # Copiado pelo pipeline
├── Caddyfile             # Copiado pelo pipeline
├── releases/
│   ├── <git-sha-1>/      # Conteúdo de .output/public de cada deploy
│   ├── <git-sha-2>/
│   └── current -> <git-sha-2>   # Link simbólico relativo, trocado de forma atômica
├── scripts/
│   ├── backup.sh
│   └── restore.sh
└── backups/              # Cópias locais temporárias (7 dias)
```

### Dockerfile da API

Build multi-stage: o primeiro estágio compila o TypeScript com `tsc` (saída CommonJS em `dist/`); o segundo contém apenas dependências de produção, o cliente Prisma gerado e o código compilado. O container roda como usuário `node` (sem root).

```dockerfile
# fittools-backend/Dockerfile
# syntax=docker/dockerfile:1

# ---------- Estágio 1: build ----------
FROM node:20-alpine AS builder
WORKDIR /app

# OpenSSL é necessário para os engines do Prisma no Alpine
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build            # tsc -> dist/ (CommonJS)

# ---------- Estágio 2: runtime ----------
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache openssl

# Dependências de produção (inclui a CLI do Prisma para `migrate deploy`)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Formato exec: o Node é o PID 1 e recebe o SIGTERM diretamente (desligamento gracioso, Req. 10.10)
CMD ["node", "dist/server.js"]
```

**fittools-backend/.dockerignore** (impede que `.env` e artefatos locais entrem na imagem):
```
node_modules
dist
.env
.env.*
!.env.example
tests
*.log
.git
```

**Observação**: as migrations **não** rodam no `CMD` do container. Elas são executadas como etapa explícita do deploy (ver "Migrations em Produção"), evitando que múltiplas réplicas ou reinícios tentem migrar o banco ao mesmo tempo.

### docker-compose.yml de Produção

```yaml
# deploy/docker-compose.yml  (copiado para /opt/fittools/docker-compose.yml)
name: fittools

services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./releases:/srv/releases:ro
      - caddy_data:/data        # Certificados TLS: NÃO apagar este volume
      - caddy_config:/config
    # Sem depends_on da API: o frontend estático continua no ar mesmo se a API estiver indisponível
    networks:
      - edge
    logging: &default-logging
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  api:
    image: ghcr.io/SEU_USUARIO_EM_MINUSCULAS/fittools-api:${API_TAG:-latest}
    restart: unless-stopped
    env_file: .env              # DATABASE_URL, JWT_SECRET, JWT_EXPIRATION_DAYS, PORT, HOST, NODE_ENV, CORS_ORIGIN
    # Sem "ports": a porta 3001 só é acessível pelo Caddy via rede Docker
    depends_on:
      db:
        condition: service_healthy
    networks:
      - edge
      - backend
    logging: *default-logging

  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      TZ: UTC
      PGTZ: UTC
    volumes:
      - pgdata:/var/lib/postgresql/data
    # Sem "ports": o PostgreSQL nunca é exposto fora da rede interna do Docker
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend
    logging: *default-logging

  # Executado sob demanda: docker compose run --rm migrate
  migrate:
    image: ghcr.io/SEU_USUARIO_EM_MINUSCULAS/fittools-api:${API_TAG:-latest}
    command: ["npx", "prisma", "migrate", "deploy"]
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    networks:
      - backend
    profiles: ["tools"]
    restart: "no"

networks:
  edge:
  backend:
    internal: true              # Sem acesso à internet nem a partir dela

volumes:
  pgdata:
  caddy_data:
  caddy_config:
```

**Decisões de rede**: a rede `backend` é `internal`, ou seja, o PostgreSQL só conversa com a API e não tem saída para a internet. A API participa de `edge` (para o Caddy alcançá-la) e de `backend` (para alcançar o banco). Somente o Caddy publica portas no host (80 e 443).

**Arquivo `.env` de produção** (`/opt/fittools/.env`, `chmod 600`, nunca versionado). O Compose usa este mesmo arquivo para interpolar `${...}` e o passa à API via `env_file`:

```bash
# Banco (usado pelo container PostgreSQL)
POSTGRES_USER=fittools
POSTGRES_PASSWORD=<gerar com: openssl rand -hex 24>
POSTGRES_DB=fittools

# API (lidos por src/config/env.ts)
# O host do banco é "db" (nome do serviço no Compose). Use senha hexadecimal para não precisar de URL-encoding.
DATABASE_URL=postgresql://fittools:<mesma senha de POSTGRES_PASSWORD>@db:5432/fittools
JWT_SECRET=<gerar com: openssl rand -base64 48>
JWT_EXPIRATION_DAYS=7
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
CORS_ORIGIN=https://fittoolsbrasil.com.br,https://www.fittoolsbrasil.com.br

# Tag da imagem da API (atualizada pelo pipeline a cada deploy)
API_TAG=latest
```

### Caddyfile

```caddyfile
# deploy/Caddyfile  (copiado para /opt/fittools/Caddyfile)
{
	# E-mail usado pelo Let's Encrypt para avisos de expiração
	email SEU_EMAIL_DE_CONTATO
}

# Redireciona www para o domínio principal
www.fittoolsbrasil.com.br {
	redir https://fittoolsbrasil.com.br{uri} permanent
}

# Frontend: arquivos estáticos gerados por `nuxt generate`
fittoolsbrasil.com.br {
	root * /srv/releases/current
	encode zstd gzip

	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
		-Server
	}

	# Assets com hash no nome: cache de 1 ano (Req. 12.3)
	@assets path /_nuxt/*
	header @assets Cache-Control "public, max-age=31536000, immutable"

	# HTML sempre revalidado, para que novos deploys apareçam imediatamente
	@pages not path /_nuxt/*
	header @pages Cache-Control "public, max-age=0, must-revalidate"

	try_files {path} {path}/index.html
	file_server

	handle_errors {
		rewrite * /404.html
		file_server
	}
}

# API: reverse proxy para o container Fastify
api.fittoolsbrasil.com.br {
	encode zstd gzip

	reverse_proxy api:3001 {
		health_uri /health
		health_interval 30s
	}
}
```

**Notas**:
- O Caddy obtém e renova os certificados Let's Encrypt automaticamente, desde que as portas 80 e 443 estejam liberadas e o DNS aponte para a VPS.
- Após o primeiro deploy, validar que uma URL inexistente retorna **status 404** (e não 200) com a página `404.html`, para não gerar "soft 404" no Google.
- Se o Cloudflare for adotado, manter a API (`api.`) **sem proxy** (apenas DNS) para que o rate limiting por IP continue simples; o proxy do Cloudflare deve ficar apenas no domínio do frontend, em modo SSL "Full (strict)". Ativar o proxy somente depois que o Caddy já tiver emitido os certificados.

### docker-compose.dev.yml (PostgreSQL local)

Em desenvolvimento, apenas o PostgreSQL roda em Docker. Frontend (`nuxt dev`) e API (`npm run dev`) rodam direto na máquina do desenvolvedor.

```yaml
# docker-compose.dev.yml (raiz do repositório)
name: fittools-dev

services:
  db:
    image: postgres:15-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:5432:5432"   # Exposto apenas em localhost
    environment:
      POSTGRES_USER: fittools
      POSTGRES_PASSWORD: fittools_dev   # Somente para uso local
      POSTGRES_DB: fittools
      TZ: UTC
    volumes:
      - pgdata_dev:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fittools -d fittools"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  pgdata_dev:
```

**Uso**:
```bash
docker compose -f docker-compose.dev.yml up -d
# Banco para os testes de integração (TEST_DATABASE_URL)
docker compose -f docker-compose.dev.yml exec db createdb -U fittools fittools_test

# No fittools-backend/.env:
# DATABASE_URL=postgresql://fittools:fittools_dev@localhost:5432/fittools
# TEST_DATABASE_URL=postgresql://fittools:fittools_dev@localhost:5432/fittools_test

cd fittools-backend && npx prisma migrate dev
```

### Migrations em Produção

As migrations são versionadas em `prisma/migrations/` (geradas com `prisma migrate dev` em desenvolvimento e commitadas). Em produção, **apenas** `prisma migrate deploy` é usado (nunca `migrate dev` ou `db push`), pois ele aplica as migrations pendentes sem gerar novas nem resetar o banco.

```bash
# Executado pelo pipeline (e manualmente, se necessário), em /opt/fittools
docker compose run --rm migrate
```

**Procedimento**:
1. O pipeline baixa a nova imagem da API (`docker compose pull api migrate`).
2. Executa `docker compose run --rm migrate` com a nova imagem, enquanto a API antiga ainda atende.
3. Se a migration falhar, o comando retorna erro, o pipeline para e a API antiga continua rodando.
4. Se tiver sucesso, `docker compose up -d` recria a API com a nova imagem.

**Boas práticas**:
- Como a migration roda antes da troca da API, ela deve ser **retrocompatível** com a versão anterior do código (adicionar colunas/tabelas opcionais primeiro; remover ou renomear apenas em um deploy posterior).
- Antes de qualquer migration destrutiva (remoção de coluna/tabela, alteração de tipo), executar `scripts/backup.sh` manualmente e confirmar que o arquivo chegou ao armazenamento externo.
- Em caso de falha no meio de uma migration, consultar `prisma migrate status` e resolver com `prisma migrate resolve` antes de tentar novamente.

### Backup e Restauração do PostgreSQL

O banco armazena **dados de saúde** (peso, altura, idade, objetivo), considerados dados pessoais sensíveis pela LGPD. Por isso o backup é tratado como requisito de produção, e os arquivos são **criptografados antes de sair da VPS**.

**Política**:

| Item | Definição |
|------|-----------|
| Frequência | Diária, via cron (03:15 UTC) |
| Formato | `pg_dump --format=custom`, criptografado com `age` (chave pública na VPS; chave privada guardada **fora** da VPS, em gerenciador de senhas ou cofre offline) |
| Destino | Hetzner Storage Box ou Object Storage, acessado com `rclone` (confirmar protocolo, porta e credenciais na documentação da Hetzner) |
| Retenção remota | 14 diários, 8 semanais (domingos) e 12 mensais (dia 1) |
| Retenção local | 7 dias em `/opt/fittools/backups` |
| Teste de restauração | Mensal, em um banco temporário; registrar a data do último teste bem-sucedido |

**backup.sh**:
```bash
#!/usr/bin/env bash
# /opt/fittools/scripts/backup.sh
# Dump diário do PostgreSQL, criptografado com age e enviado para fora da VPS.
set -euo pipefail

APP_DIR=/opt/fittools
BACKUP_DIR="$APP_DIR/backups"
RECIPIENT_FILE="$APP_DIR/backup-recipient.txt"   # Chave PÚBLICA age (uma linha: age1...)
REMOTE="hetzner-backup:fittools"                 # Remote configurado com `rclone config`

STAMP=$(date -u +%Y%m%d-%H%M%S)
FILE="fittools-$STAMP.dump.age"

umask 077
mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"

# Remove arquivo parcial se o dump falhar
trap 'rm -f "$BACKUP_DIR/$FILE"' ERR

docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  | age -R "$RECIPIENT_FILE" -o "$BACKUP_DIR/$FILE"

# Garante que o arquivo não está vazio
[ -s "$BACKUP_DIR/$FILE" ]
trap - ERR

# Envio para fora da VPS
rclone copy "$BACKUP_DIR/$FILE" "$REMOTE/daily/"
[ "$(date -u +%u)" = "7" ]  && rclone copy "$BACKUP_DIR/$FILE" "$REMOTE/weekly/"  || true
[ "$(date -u +%d)" = "01" ] && rclone copy "$BACKUP_DIR/$FILE" "$REMOTE/monthly/" || true

# Retenção remota (mkdir garante que as pastas existam antes do delete)
for dir in daily weekly monthly; do rclone mkdir "$REMOTE/$dir"; done
rclone delete "$REMOTE/daily"   --min-age 14d
rclone delete "$REMOTE/weekly"  --min-age 56d
rclone delete "$REMOTE/monthly" --min-age 365d

# Retenção local
find "$BACKUP_DIR" -name 'fittools-*.dump.age' -mtime +7 -delete

echo "$(date -u +%FT%TZ) backup concluído: $FILE"
```

**Agendamento** (`crontab -e` do usuário `deploy`, que precisa pertencer ao grupo `docker`):
```cron
15 3 * * * /opt/fittools/scripts/backup.sh >> /opt/fittools/backups/backup.log 2>&1
```
Configurar também um monitor externo (ex: *dead man's switch* que alerta se o backup não executar) ou, no mínimo, revisar o log semanalmente.

**restore.sh** (restaura em um banco **temporário** para validar o backup sem tocar na produção):
```bash
#!/usr/bin/env bash
# Uso: ./restore.sh <arquivo.dump.age> <arquivo-chave-privada-age> [banco_destino]
# O banco de destino precisa começar com "restore_" para evitar sobrescrever a produção.
set -euo pipefail

FILE="${1:?Informe o arquivo .dump.age}"
KEY="${2:?Informe a chave privada age}"
TARGET_DB="${3:-restore_test}"

[[ "$TARGET_DB" =~ ^restore_[a-z0-9_]+$ ]] || { echo "Banco de destino deve casar com ^restore_[a-z0-9_]+$"; exit 1; }

cd /opt/fittools

docker compose exec -T db sh -c "dropdb -U \"\$POSTGRES_USER\" --if-exists $TARGET_DB && createdb -U \"\$POSTGRES_USER\" $TARGET_DB"

age -d -i "$KEY" "$FILE" \
  | docker compose exec -T db sh -c "pg_restore -U \"\$POSTGRES_USER\" -d $TARGET_DB --no-owner --exit-on-error"

# Verificação básica de sanidade
docker compose exec -T db sh -c "psql -U \"\$POSTGRES_USER\" -d $TARGET_DB -c 'SELECT count(*) AS users FROM users' -c 'SELECT count(*) AS profiles FROM user_health_profiles'"

echo "Restauração de teste concluída em $TARGET_DB. Remova com: docker compose exec db dropdb -U <usuario> $TARGET_DB"
```

**Teste de restauração (mensal)**:
1. Baixar o backup mais recente do armazenamento externo (`rclone copy hetzner-backup:fittools/daily/<arquivo> .`).
2. Executar `./restore.sh <arquivo> <chave-privada>` e conferir as contagens de `users` e `user_health_profiles`.
3. Remover o banco temporário e **apagar a cópia da chave privada** da VPS, se ela tiver sido copiada para o teste.
4. Registrar data e resultado.

**Restauração real (desastre)**:
1. `docker compose stop api` para impedir novas escritas.
2. Recriar o banco de produção vazio (`dropdb` / `createdb`) e executar `pg_restore` com o backup escolhido.
3. `docker compose up -d api` e validar `GET /health`.
4. Se a VPS tiver sido perdida: provisionar nova VPS, seguir o checklist de hardening, restaurar o `.env` (guardado também no gerenciador de senhas), subir o stack via pipeline e então restaurar o banco.

**Observação**: snapshots da Hetzner podem complementar, mas **não substituem** o `pg_dump` externo e criptografado.

### Checklist de Hardening da VPS

Como o próprio time administra o servidor, estes itens são parte do escopo do MVP:

**Acesso e usuários**
- [ ] Criar usuário `deploy` sem privilégios de root (acesso `sudo` apenas se necessário); não operar como `root`
- [ ] SSH somente por chave: `PasswordAuthentication no`, `PermitRootLogin no`, `PubkeyAuthentication yes` e `AllowUsers deploy` em `/etc/ssh/sshd_config`
- [ ] Usar uma chave SSH **dedicada ao CI** (ed25519), separada da chave pessoal, e fácil de revogar
- [ ] Lembrar que pertencer ao grupo `docker` equivale, na prática, a ter root no host; limitar quem tem esse acesso

**Rede**
- [ ] Hetzner Cloud Firewall liberando entrada apenas para TCP 22 (idealmente restrito ao IP do administrador), 80 e 443
- [ ] Não publicar portas de banco nem da API no `docker-compose.yml` (já atendido). Atenção: portas publicadas pelo Docker contornam o `ufw`, então o Cloud Firewall é o controle efetivo
- [ ] Após o primeiro deploy, verificar de fora da VPS (ex: `nmap`) que 5432 e 3001 estão fechadas
- [ ] `fail2ban` ativo para o `sshd`

**Sistema**
- [ ] `unattended-upgrades` habilitado para atualizações automáticas de segurança (avaliar reboot automático em janela de baixo tráfego para patches de kernel)
- [ ] Sincronização de horário ativa (`systemd-timesyncd` ou `chrony`)
- [ ] Rotação de logs do Docker (já configurada via `max-size`/`max-file` no Compose)

**Segredos e dados**
- [ ] `/opt/fittools/.env` com `chmod 600` e dono `deploy`; nunca no repositório, em imagens Docker ou em logs
- [ ] Chave privada de restauração do backup **fora** da VPS
- [ ] Segredos do GitHub limitados ao necessário (chave SSH, host, known_hosts)
- [ ] Rotacionar `JWT_SECRET` e a senha do banco em caso de suspeita de vazamento (rotacionar o `JWT_SECRET` invalida todos os tokens ativos)

**Operação**
- [ ] Monitor externo de disponibilidade em `https://api.fittoolsbrasil.com.br/health` e na home
- [ ] Alerta (ou revisão periódica) de uso de disco, pois logs, volume do banco e backups locais crescem com o tempo
- [ ] Política de privacidade mencionando que os dados são armazenados em servidor fora do Brasil (a redação final deve ser validada por profissional jurídico)

### Provisionamento Inicial (ordem sugerida)

1. Criar a VPS, o Cloud Firewall e os registros DNS.
2. Aplicar o checklist de hardening e instalar Docker Engine com o plugin Compose v2, `age`, `rclone` e `rsync`.
3. Criar `/opt/fittools` e `/opt/fittools/releases`, e gravar o `.env` com `chmod 600`.
4. Se a imagem da API for privada no GHCR, executar `docker login ghcr.io` no servidor com um token de leitura de pacotes (`read:packages`). Alternativa: tornar o pacote público, pois a imagem não contém segredos.
5. Configurar os secrets e variáveis do GitHub (ver CI/CD) e disparar o primeiro deploy por push na `main`.
6. Configurar `rclone`, a chave pública `age` e o cron de backup; executar `backup.sh` manualmente e fazer o primeiro teste de restauração.

**Alternativa sem registry**: em vez de publicar no GHCR, o pipeline pode enviar o código por `rsync` e executar `docker compose build api` no servidor. É mais simples (sem token de registry), porém usa CPU/RAM da própria VPS durante o build e perde a rastreabilidade de imagens por SHA.

### CI/CD — GitHub Actions

O fluxo executa os testes em todo push/PR e, **somente em push na `main`**, faz o deploy: gera o frontend (`nuxt generate`), publica a imagem da API, envia os estáticos para a VPS via `rsync`/SSH e atualiza a stack com `docker compose`.

**Secrets e variáveis no GitHub** (Settings → Secrets and variables → Actions):

| Nome | Tipo | Conteúdo |
|------|------|----------|
| `DEPLOY_SSH_KEY` | Secret | Chave privada ed25519 dedicada ao CI (usuário `deploy`) |
| `DEPLOY_HOST` | Secret | IP ou hostname da VPS |
| `DEPLOY_USER` | Secret | Usuário SSH (ex: `deploy`) |
| `DEPLOY_KNOWN_HOSTS` | Secret | Saída de `ssh-keyscan` do host (impede ataque *man-in-the-middle* no primeiro acesso) |
| `NUXT_PUBLIC_API_BASE_URL` | Variable | `https://api.fittoolsbrasil.com.br` |
| `NUXT_PUBLIC_SITE_URL` | Variable | `https://fittoolsbrasil.com.br` |

O `GITHUB_TOKEN` automático é usado para publicar a imagem no GHCR. Os segredos da aplicação (`JWT_SECRET`, senha do banco) **não** passam pelo GitHub: ficam apenas no `.env` do servidor.

**.github/workflows/ci.yml**:
```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  test-backend:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: fittools_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: fittools-backend/package-lock.json

      - name: Install dependencies
        working-directory: ./fittools-backend
        run: npm ci

      - name: Generate Prisma Client
        working-directory: ./fittools-backend
        run: npx prisma generate

      - name: Run migrations
        working-directory: ./fittools-backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/fittools_test
        run: npx prisma migrate deploy

      - name: Run unit tests
        working-directory: ./fittools-backend
        run: npm run test:unit

      - name: Run integration tests
        working-directory: ./fittools-backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/fittools_test
          JWT_SECRET: test-secret-key-for-ci-only-0123456789
          CORS_ORIGIN: http://localhost:3000
        run: npm run test:integration

  test-frontend:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: fittools-frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./fittools-frontend
        run: npm ci

      - name: Run unit tests
        working-directory: ./fittools-frontend
        run: npm run test:unit

      - name: Build (nuxt generate)
        working-directory: ./fittools-frontend
        run: npm run generate

      - name: Install Playwright
        working-directory: ./fittools-frontend
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        working-directory: ./fittools-frontend
        run: npm run test:e2e

  deploy:
    needs: [test-backend, test-frontend]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    permissions:
      contents: read
      packages: write
    concurrency:
      group: deploy-production
      cancel-in-progress: false

    env:
      APP_DIR: /opt/fittools
      SSH_TARGET: ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}

    steps:
      - uses: actions/checkout@v4

      # ---------- Frontend: nuxt generate com as URLs de produção ----------
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: fittools-frontend/package-lock.json

      - name: Install frontend dependencies
        working-directory: ./fittools-frontend
        run: npm ci

      - name: Generate static site
        working-directory: ./fittools-frontend
        env:
          NUXT_PUBLIC_API_BASE_URL: ${{ vars.NUXT_PUBLIC_API_BASE_URL }}
          NUXT_PUBLIC_SITE_URL: ${{ vars.NUXT_PUBLIC_SITE_URL }}
        run: npm run generate        # saída em .output/public

      # ---------- API: build e publicação da imagem no GHCR ----------
      - name: Compute lowercase image name
        run: echo "IMAGE=ghcr.io/${GITHUB_REPOSITORY_OWNER,,}/fittools-api" >> "$GITHUB_ENV"

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push API image
        uses: docker/build-push-action@v6
        with:
          context: ./fittools-backend
          push: true
          tags: |
            ${{ env.IMAGE }}:${{ github.sha }}
            ${{ env.IMAGE }}:latest

      # ---------- Acesso SSH ao servidor ----------
      - name: Configure SSH
        env:
          SSH_KEY: ${{ secrets.DEPLOY_SSH_KEY }}
          KNOWN_HOSTS: ${{ secrets.DEPLOY_KNOWN_HOSTS }}
        run: |
          install -m 700 -d ~/.ssh
          printf '%s\n' "$SSH_KEY" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          printf '%s\n' "$KNOWN_HOSTS" > ~/.ssh/known_hosts

      # ---------- Frontend: envia para uma release nova e troca o link "current" ----------
      - name: Upload static files
        run: |
          rsync -az --delete fittools-frontend/.output/public/ \
            "$SSH_TARGET:$APP_DIR/releases/${{ github.sha }}/"

      # ---------- Arquivos de configuração (compose, Caddyfile, scripts) ----------
      - name: Upload deploy files
        run: |
          scp deploy/docker-compose.yml deploy/Caddyfile "$SSH_TARGET:$APP_DIR/"
          scp deploy/scripts/backup.sh deploy/scripts/restore.sh "$SSH_TARGET:$APP_DIR/scripts/"

      # ---------- API: pull, migrations, restart e troca do frontend ----------
      - name: Deploy on server
        run: |
          ssh "$SSH_TARGET" bash -s <<'REMOTE'
            set -euo pipefail
            cd /opt/fittools
            SHA="${{ github.sha }}"

            chmod +x scripts/*.sh

            # Persiste a tag da imagem no .env (permite rollback e `docker compose up` futuro)
            if grep -q '^API_TAG=' .env; then
              sed -i "s/^API_TAG=.*/API_TAG=$SHA/" .env
            else
              echo "API_TAG=$SHA" >> .env
            fi

            docker compose pull api migrate
            docker compose run --rm migrate          # prisma migrate deploy
            docker compose up -d --remove-orphans
            docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile

            # Troca atômica do frontend (link relativo, resolvido dentro do container do Caddy)
            cd releases
            ln -sfn "$SHA" current.tmp
            mv -T current.tmp current

            # Mantém as 5 releases mais recentes para rollback
            find . -mindepth 1 -maxdepth 1 -type d -printf '%T@ %f\n' \
              | sort -rn | tail -n +6 | cut -d' ' -f2- | xargs -r rm -rf
          REMOTE

      # ---------- Verificação pós-deploy ----------
      - name: Smoke test
        run: |
          curl -fsS --retry 5 --retry-delay 5 --retry-connrefused https://api.fittoolsbrasil.com.br/health
          curl -fsSI --retry 5 --retry-delay 5 https://fittoolsbrasil.com.br/calculadora-de-imc
```

**Pontos de atenção**:
- A imagem é identificada pelo SHA do commit. **Rollback**: ajustar `API_TAG` no `.env` para o SHA anterior, executar `docker compose up -d` e apontar o link `releases/current` para a release anterior (`ln -sfn <sha-anterior> current.tmp && mv -T current.tmp current`). Migrations já aplicadas não são revertidas automaticamente; por isso devem ser retrocompatíveis.
- O `Caddyfile` é copiado com `scp` (que reescreve o conteúdo no mesmo arquivo) para que o bind mount do container enxergue a alteração; em seguida, `caddy reload` aplica a nova configuração sem derrubar conexões.
- `NUXT_PUBLIC_*` são embutidas no HTML no momento do `nuxt generate`; alterar essas variáveis exige um novo deploy do frontend.
- Para proteger a produção, configurar o *environment* `production` do GitHub com revisores obrigatórios, se desejado.
- Os jobs de teste referenciam scripts (`test:unit`, `test:integration`, `test:e2e`) que serão criados nas tarefas de testes; até lá, o job de deploy deve ser mantido desabilitado.

---

## Referências Científicas

Todas as fórmulas implementadas nas calculadoras são baseadas em pesquisas científicas peer-reviewed:

1. **IMC (Body Mass Index)**: World Health Organization. *Obesity: preventing and managing the global epidemic.* WHO Technical Report Series 894, 2000.

2. **TMB (Mifflin-St Jeor)**: Mifflin MD, St Jeor ST, Hill LA, et al. *A new predictive equation for resting energy expenditure in healthy individuals.* The American Journal of Clinical Nutrition, 1990;51(2):241-247.

3. **Proteína (ISSN)**: Jäger R, Kerksick CM, Campbell BI, et al. *International Society of Sports Nutrition Position Stand: protein and exercise.* Journal of the International Society of Sports Nutrition, 2017;14:20.

4. **Gordura Corporal (US Navy)**: Hodgdon JA, Beckett MB. *Prediction of percent body fat for U.S. Navy men and women from body circumferences and height.* Naval Health Research Center, Report No. 84-29, 1984.

5. **1RM (Brzycki)**: Brzycki M. *Strength testing: predicting a one-rep max from reps-to-fatigue.* Journal of Physical Education, Recreation & Dance, 1993;64(1):88-90.

6. **1RM (Epley)**: Epley B. *Poundage chart.* Boyd Epley Workout. Lincoln, NE: Body Enterprises, 1985.

7. **Frequência Cardíaca (Tanaka)**: Tanaka H, Monahan KD, Seals DR. *Age-predicted maximal heart rate revisited.* Journal of the American College of Cardiology, 2001;37(1):153-156.

8. **Zonas Cardíacas (Karvonen)**: Karvonen MJ, Kentala E, Mustala O. *The effects of training on heart rate: a longitudinal study.* Annales Medicinae Experimentalis et Biologiae Fenniae, 1957;35(3):307-315.

9. **Hidratação (ACSM)**: Sawka MN, Burke LM, Eichner ER, et al. *American College of Sports Medicine position stand: exercise and fluid replacement.* Medicine & Science in Sports & Exercise, 2007;39(2):377-390.

10. **Pace de Corrida (Riegel)**: Riegel PS. *Athletic records and human endurance.* American Scientist, 1981;69(3):285-290.

---

## Próximos Passos (Pós-MVP)

Funcionalidades planejadas para versões futuras:

### v1.1 — Gamificação Básica
- Sistema de pontos e badges
- Streak de uso diário
- Histórico de medições com gráficos
- Comparação com população brasileira

### v1.2 — Social Features
- Compartilhar resultados (Twitter, Instagram)
- Desafios entre amigos
- Fórum de discussão

### v1.3 — Premium Features
- Planos de treino personalizados
- Consultoria de nutricionista (marketplace)
- Export de dados (CSV, PDF)
- Integrações (Google Fit, Apple Health)

### v2.0 — Mobile App
- React Native com compartilhamento de código
- Notificações push para lembretes
- Modo offline com sync

---

## Correctness Properties

*Propriedades de Correção*

*Uma propriedade é uma característica ou comportamento que deve ser verdadeiro em todas as execuções válidas de um sistema — essencialmente, uma afirmação formal sobre o que o sistema deve fazer. Propriedades servem como ponte entre especificações legíveis por humanos e garantias de correção verificáveis por máquina.*

As propriedades abaixo serão implementadas como property-based tests usando **fast-check** (biblioteca TypeScript). Cada propriedade deve ser testada com mínimo de 100 iterações para garantir cobertura abrangente de casos extremos.

### Property 1: Computação de IMC Sempre Retorna Valores Válidos

*Para quaisquer* peso válido (30-300 kg) e altura válida (120-230 cm), o cálculo de IMC DEVE retornar um valor positivo e finito, e a classificação WHO DEVE corresponder aos ranges estabelecidos.

**Validates: Requirements 1.1, 14.1**

**Implementação**:
```typescript
// tests/properties/imc.property.test.ts
fc.assert(
  fc.property(
    fc.float({ min: 30, max: 300, noNaN: true }), // weight_kg
    fc.float({ min: 120, max: 230, noNaN: true }), // height_cm
    (weight, height) => {
      const { computeBMI, classifyBMI } = useScience()
      const bmi = computeBMI(weight, height)
      
      // Deve ser positivo e finito
      expect(bmi).toBeGreaterThan(0)
      expect(Number.isFinite(bmi)).toBe(true)
      
      // Classificação deve corresponder aos ranges WHO
      const classification = classifyBMI(bmi)
      if (bmi < 18.5) expect(classification.label).toBe('Abaixo do peso')
      else if (bmi < 25) expect(classification.label).toBe('Peso normal')
      else if (bmi < 30) expect(classification.label).toBe('Sobrepeso')
      // ... outros ranges
    }
  ),
  { numRuns: 100 }
)
```

### Property 2: Round-Trip IMC Preserva Valor Original

*Para qualquer* altura válida e IMC alvo, se calcularmos o peso correspondente e então recalcularmos o IMC, devemos obter o IMC original dentro da tolerância de arredondamento.

**Validates: Requirements 1.13**

**Implementação**:
```typescript
fc.assert(
  fc.property(
    fc.float({ min: 120, max: 230 }), // height_cm
    fc.float({ min: 15, max: 50 }),   // target_bmi
    (height, targetBMI) => {
      const { computeBMI } = useScience()
      
      // Calcular peso para atingir targetBMI
      const height_m = height / 100
      const calculatedWeight = targetBMI * Math.pow(height_m, 2)
      
      // Recalcular IMC com o peso calculado
      const resultBMI = computeBMI(calculatedWeight, height)
      
      // Deve estar dentro de 0.01 de tolerância
      expect(Math.abs(resultBMI - targetBMI)).toBeLessThan(0.01)
    }
  ),
  { numRuns: 100 }
)
```

### Property 3: TMB/TDEE Seguem Relações Matemáticas Corretas

*Para quaisquer* parâmetros válidos (sexo, peso, altura, idade, fator de atividade), o cálculo de BMR DEVE retornar valor positivo e TDEE DEVE ser exatamente BMR multiplicado pelo fator de atividade.

**Validates: Requirements 1.2**

**Implementação**:
```typescript
fc.assert(
  fc.property(
    fc.constantFrom('male', 'female'),
    fc.float({ min: 30, max: 300 }),    // weight_kg
    fc.float({ min: 120, max: 230 }),   // height_cm
    fc.integer({ min: 14, max: 100 }),  // age
    fc.float({ min: 1.2, max: 1.9 }),   // activity_factor
    (sex, weight, height, age, activityFactor) => {
      const { computeBMR, computeTDEE } = useScience()
      
      const bmr = computeBMR(sex, weight, height, age)
      const tdee = computeTDEE(bmr, activityFactor)
      
      // BMR deve ser positivo
      expect(bmr).toBeGreaterThan(0)
      
      // TDEE = BMR * fator
      expect(Math.abs(tdee - bmr * activityFactor)).toBeLessThan(0.01)
      
      // TDEE deve ser maior que BMR (fator >= 1.2)
      expect(tdee).toBeGreaterThan(bmr)
    }
  ),
  { numRuns: 100 }
)
```

### Property 4: Faixa de Proteína é Sempre Consistente

*Para qualquer* peso válido e objetivo fitness, a faixa de proteína DEVE ter min < max, e ambos devem estar dentro do range ISSN (1.2-2.4 g/kg).

**Validates: Requirements 1.3**

**Implementação**:
```typescript
fc.assert(
  fc.property(
    fc.float({ min: 30, max: 300 }), // weight_kg
    fc.constantFrom('maintenance', 'hypertrophy', 'fatloss', 'endurance'),
    (weight, goal) => {
      const { proteinRange } = useScience()
      const range = proteinRange(weight, goal)
      
      // Min deve ser menor que max
      expect(range.min).toBeLessThan(range.max)
      
      // Ambos devem estar no range ISSN (1.2-2.4 g/kg)
      expect(range.min / weight).toBeGreaterThanOrEqual(1.2)
      expect(range.max / weight).toBeLessThanOrEqual(2.4)
      
      // perKg deve corresponder aos valores calculados
      expect(Math.abs(range.perKgMin - range.min / weight)).toBeLessThan(0.01)
      expect(Math.abs(range.perKgMax - range.max / weight)).toBeLessThan(0.01)
    }
  ),
  { numRuns: 100 }
)
```

### Property 5: Gordura Corporal Retorna Valores Fisiologicamente Plausíveis

*Para quaisquer* medidas válidas (altura, pescoço, cintura, quadril) respeitando as restrições anatômicas, o cálculo de gordura corporal DEVE retornar porcentagem entre 0% e 100%, sem NaN ou Infinity.

**Validates: Requirements 1.4**

**Implementação**:
```typescript
fc.assert(
  fc.property(
    fc.constantFrom('male', 'female'),
    fc.float({ min: 120, max: 230 }),  // height_cm
    fc.float({ min: 20, max: 70 }),    // neck_cm
    fc.float({ min: 50, max: 200 }),   // waist_cm
    fc.float({ min: 50, max: 200 }),   // hip_cm
    (sex, height, neck, waist, hip) => {
      // Garantir restrições anatômicas
      if (sex === 'male' && waist <= neck) return
      if (sex === 'female' && waist + hip <= neck) return
      
      const { bodyFatNavy } = useScience()
      const bf = bodyFatNavy(sex, height, neck, waist, hip)
      
      // Deve estar entre 0 e 100
      expect(bf).toBeGreaterThanOrEqual(0)
      expect(bf).toBeLessThanOrEqual(100)
      
      // Não deve ser NaN ou Infinity
      expect(Number.isFinite(bf)).toBe(true)
    }
  ),
  { numRuns: 100 }
)
```

### Property 6: 1RM Exibe Monotonicidade Correta

*Para qualquer* peso e número de repetições válidos:
- Aumentar o peso com reps constante DEVE aumentar o 1RM
- Aumentar as reps com peso constante DEVE diminuir o 1RM

**Validates: Requirements 1.5**

**Implementação**:
```typescript
fc.assert(
  fc.property(
    fc.float({ min: 10, max: 200 }),   // weight1
    fc.float({ min: 10, max: 200 }),   // weight2
    fc.integer({ min: 1, max: 20 }),   // reps
    (w1, w2, reps) => {
      const { compute1RM } = useScience()
      
      if (w1 < w2) {
        const rm1 = compute1RM(w1, reps)
        const rm2 = compute1RM(w2, reps)
        
        // Mais peso → maior 1RM
        expect(rm2).toBeGreaterThanOrEqual(rm1)
      }
    }
  ),
  { numRuns: 100 }
)

fc.assert(
  fc.property(
    fc.float({ min: 50, max: 150 }),    // weight
    fc.integer({ min: 1, max: 10 }),    // reps1
    fc.integer({ min: 11, max: 20 }),   // reps2
    (weight, reps1, reps2) => {
      const { compute1RM } = useScience()
      
      const rm1 = compute1RM(weight, reps1)
      const rm2 = compute1RM(weight, reps2)
      
      // Menos reps → maior 1RM
      expect(rm1).toBeGreaterThan(rm2)
    }
  ),
  { numRuns: 100 }
)
```

### Property 7: Zonas de Frequência Cardíaca São Ordenadas e Consistentes

*Para qualquer* idade e FC de repouso válidos, as zonas de frequência cardíaca DEVEM estar ordenadas crescentemente (Z1_min < Z1_max < Z2_min < Z2_max < ...) e todas DEVEM estar entre FC_repouso e FC_max.

**Validates: Requirements 1.6**

**Implementação**:
```typescript
fc.assert(
  fc.property(
    fc.integer({ min: 14, max: 100 }),  // age
    fc.integer({ min: 30, max: 110 }),  // resting_hr
    (age, restingHR) => {
      const { hrZones } = useScience()
      const zones = hrZones(age, restingHR)
      
      // FC_max deve diminuir com idade (Tanaka: 208 - 0.7*age)
      const expectedMax = 208 - 0.7 * age
      expect(Math.abs(zones.max - expectedMax)).toBeLessThan(0.1)
      
      // Zonas devem estar ordenadas
      for (let i = 0; i < zones.zones.length - 1; i++) {
        const current = zones.zones[i]
        const next = zones.zones[i + 1]
        
        expect(current.min).toBeLessThan(current.max)
        expect(current.max).toBeLessThanOrEqual(next.min)
      }
      
      // Todas as zonas devem estar entre repouso e max
      zones.zones.forEach(zone => {
        expect(zone.min).toBeGreaterThanOrEqual(restingHR)
        expect(zone.max).toBeLessThanOrEqual(zones.max)
      })
    }
  ),
  { numRuns: 100 }
)
```

### Property 8: Hidratação Exibe Monotonicidade Linear

*Para qualquer* peso e tempo de exercício válidos, aumentar o peso OU aumentar os minutos de exercício DEVE aumentar a ingestão de água recomendada.

**Validates: Requirements 1.7**

**Implementação**:
```typescript
fc.assert(
  fc.property(
    fc.float({ min: 30, max: 300 }),    // weight1
    fc.float({ min: 30, max: 300 }),    // weight2
    fc.integer({ min: 0, max: 300 }),   // minutes
    (w1, w2, minutes) => {
      const { water } = useScience()
      
      if (w1 < w2) {
        const water1 = water(w1, minutes)
        const water2 = water(w2, minutes)
        
        // Mais peso → mais água
        expect(water2.total).toBeGreaterThan(water1.total)
      }
    }
  ),
  { numRuns: 100 }
)

fc.assert(
  fc.property(
    fc.float({ min: 50, max: 100 }),    // weight
    fc.integer({ min: 0, max: 150 }),   // minutes1
    fc.integer({ min: 151, max: 300 }), // minutes2
    (weight, min1, min2) => {
      const { water } = useScience()
      
      const water1 = water(weight, min1)
      const water2 = water(weight, min2)
      
      // Mais exercício → mais água
      expect(water2.total).toBeGreaterThan(water1.total)
      
      // Fórmula correta: base + exercício
      expect(water1.total).toEqual(water1.base + water1.exercise)
      expect(water2.total).toEqual(water2.base + water2.exercise)
    }
  ),
  { numRuns: 100 }
)
```

### Property 9: Pace e Projeções Seguem Fórmula Riegel

*Para qualquer* distância e tempo válidos, o pace DEVE ser tempo/distância, e projeções para distâncias maiores DEVEM resultar em tempos maiores conforme fórmula Riegel.

**Validates: Requirements 1.8**

**Implementação**:
```typescript
fc.assert(
  fc.property(
    fc.float({ min: 0.4, max: 50 }),    // distance_km
    fc.float({ min: 1, max: 600 }),     // time_minutes
    fc.float({ min: 0.4, max: 50 }),    // projection_distance
    (d1, t1, d2) => {
      const { pace, riegel } = useScience()
      
      // Pace = tempo / distância
      const calculatedPace = pace(d1, t1)
      expect(Math.abs(calculatedPace - t1 / d1)).toBeLessThan(0.01)
      
      if (d2 > d1) {
        // Projeção para distância maior deve ter tempo maior
        const t2 = riegel(t1, d1, d2)
        expect(t2).toBeGreaterThan(t1)
        
        // Fórmula Riegel: t2 = t1 * (d2/d1)^1.06
        const expectedT2 = t1 * Math.pow(d2 / d1, 1.06)
        expect(Math.abs(t2 - expectedT2)).toBeLessThan(0.01)
      }
    }
  ),
  { numRuns: 100 }
)
```

### Property 10: Idempotência de Todas as Calculadoras

*Para todas* as calculadoras e quaisquer entradas válidas, computar o resultado duas vezes DEVE produzir valores idênticos (propriedade de idempotência pura).

**Validates: Requirements 1.12**

**Implementação**:
```typescript
fc.assert(
  fc.property(
    fc.float({ min: 30, max: 300 }),    // weight
    fc.float({ min: 120, max: 230 }),   // height
    (weight, height) => {
      const { computeBMI } = useScience()
      
      const result1 = computeBMI(weight, height)
      const result2 = computeBMI(weight, height)
      
      // Idempotência: f(x) = f(x)
      expect(result1).toBe(result2)
    }
  ),
  { numRuns: 100 }
)

// Repetir para todas as outras calculadoras
// (TMB, proteína, gordura, 1RM, FC, hidratação, pace)
```

### Property 11: Compatibilidade com Implementação Original

*Para todas* as calculadoras e quaisquer entradas válidas, a diferença relativa entre a implementação TypeScript nova e a implementação JavaScript original DEVE ser menor que 0.01%.

**Validates: Requirements 14.1**

**Implementação**:
```typescript
fc.assert(
  fc.property(
    fc.float({ min: 30, max: 300 }),    // weight
    fc.float({ min: 120, max: 230 }),   // height
    (weight, height) => {
      // Importar ambas as implementações
      const { computeBMI: newBMI } = useScience()
      const oldBMI = window.FitScience.bmi // science.js original
      
      const resultNew = newBMI(weight, height)
      const resultOld = oldBMI(weight, height)
      
      // Diferença relativa < 0.01%
      const relativeDiff = Math.abs(resultNew - resultOld) / resultOld
      expect(relativeDiff).toBeLessThan(0.0001)
    }
  ),
  { numRuns: 100 }
)
```

### Property 12: Isolamento de Dados de Usuário (Autorização)

*Para quaisquer* dois usuários distintos A e B, o usuário A com token válido NÃO DEVE conseguir acessar ou modificar o perfil de saúde do usuário B.

**Validates: Requirements 4.11**

**Implementação**:
```typescript
fc.assert(
  fc.property(
    fc.string({ minLength: 5, maxLength: 20 }), // nameA
    fc.string({ minLength: 5, maxLength: 20 }), // nameB
    async (nameA, nameB) => {
      if (nameA === nameB) return // Devem ser distintos
      
      // Criar usuário A
      const userA = await createTestUser(`${nameA}@test.com`, 'Pass123')
      
      // Criar usuário B
      const userB = await createTestUser(`${nameB}@test.com`, 'Pass123')
      
      // Tentar acessar perfil de B com token de A
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/users/${userB.id}`,
        headers: {
          Authorization: `Bearer ${userA.token}`
        }
      })
      
      // Deve retornar 403 Forbidden
      expect(response.statusCode).toBe(403)
    }
  ),
  { numRuns: 50 } // Menos iterações por envolver DB
)
```

### Property 13: Rate Limiting Aplica Limites Corretamente

*Para qualquer* endpoint com rate limiting configurado, as primeiras N requisições dentro da janela DEVEM ter sucesso, e a (N+1)ª requisição DEVE retornar 429 Too Many Requests.

**Validates: Requirements 6.1, 6.2**

**Implementação**:
```typescript
fc.assert(
  fc.property(
    fc.integer({ min: 1, max: 10 }), // numRequests dentro do limite
    async (n) => {
      const limit = 60 // Limite global
      
      // Fazer N requisições (dentro do limite)
      for (let i = 0; i < n && i < limit; i++) {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/health'
        })
        expect(response.statusCode).toBe(200)
      }
      
      // Fazer requisições além do limite
      const responses = []
      for (let i = 0; i < limit - n + 5; i++) {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/health'
        })
        responses.push(response.statusCode)
      }
      
      // Deve haver pelo menos um 429
      expect(responses).toContain(429)
    }
  ),
  { numRuns: 10 } // Menos iterações por ser custoso
)
```

---

### Resumo das Propriedades

| # | Propriedade | Padrão | Requisitos Validados |
|---|-------------|--------|---------------------|
| 1 | IMC sempre válido | Invariante (saída válida) | 1.1, 14.1 |
| 2 | Round-trip IMC | Round-trip | 1.13 |
| 3 | TMB/TDEE consistentes | Invariante + Relação matemática | 1.2 |
| 4 | Faixa de proteína ordenada | Invariante (min < max) | 1.3 |
| 5 | Gordura corporal plausível | Invariante (0-100%) | 1.4 |
| 6 | 1RM monotônico | Monotonicidade | 1.5 |
| 7 | Zonas FC ordenadas | Invariante + Ordenação | 1.6 |
| 8 | Hidratação monotônica | Monotonicidade linear | 1.7 |
| 9 | Pace segue Riegel | Relação matemática | 1.8 |
| 10 | Idempotência universal | Idempotência | 1.12 |
| 11 | Compatibilidade science.js | Equivalência | 14.1 |
| 12 | Isolamento de dados | Autorização | 4.11 |
| 13 | Rate limiting efetivo | Aplicação de limites | 6.1, 6.2 |

**Total**: 13 propriedades cobrindo os aspectos críticos de correção do sistema.

---

**Documento de Design Técnico — FitTools Brasil MVP v1.0**  
*Última atualização: 2025-06-16*  
*Versão: 1.0.0*
