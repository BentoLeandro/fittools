# Requirements Document

*Documento de Requisitos - MVP v1.0*

## Introduction

*Introdução*

O MVP FitTools Brasil é uma plataforma web fitness B2C direcionada a praticantes de fitness brasileiros. Este MVP foca em migrar 8 calculadoras existentes em vanilla JavaScript para uma stack moderna Nuxt 3 + Node.js + PostgreSQL com autenticação básica de usuários e gerenciamento de perfis. A plataforma fornece calculadoras fitness otimizadas para SEO e cientificamente precisas, acessíveis a visitantes públicos, com contas de usuário opcionais para salvar perfis de saúde e receber recomendações personalizadas.

## Glossary

*Glossário*

- **Platform**: O sistema completo do FitTools Brasil MVP (frontend + backend + database)
- **Calculator_Engine**: Os composables Vue 3 que fornecem fórmulas científicas de fitness
- **Frontend**: A aplicação Nuxt 3 servindo usuários via Static Site Generation (SSG)
- **Backend_API**: A REST API Node.js Fastify que gerencia autenticação e persistência de dados do usuário
- **Database**: O armazenamento de dados PostgreSQL
- **Auth_Service**: O módulo de autenticação e autorização baseado em JWT
- **User**: Um titular de conta autenticado na plataforma com perfil de saúde salvo
- **Guest**: Um visitante não autenticado usando calculadoras públicas
- **Health_Profile**: Dados biométricos do usuário (peso, altura, idade, sexo, nível de atividade, objetivo fitness)
- **1RM**: Uma repetição máxima (medida de força)
- **BMI**: Índice de Massa Corporal
- **BMR**: Taxa Metabólica Basal
- **TDEE**: Gasto Energético Diário Total
- **WHO**: Organização Mundial da Saúde
- **ISSN**: Sociedade Internacional de Nutrição Esportiva

## Requirements

*Requisitos*

### Requisito 1: Migração e Computação das Calculadoras

**História de Usuário:** Como um visitante ou usuário, eu quero acessar calculadoras fitness cientificamente precisas com resultados instantâneos, para que eu possa tomar decisões baseadas em dados sobre treino e nutrição sem criar uma conta.

#### Critérios de Aceitação

1. QUANDO um visitante submeter entradas válidas para a calculadora de IMC, O Calculator_Engine DEVE computar o IMC usando a fórmula `weight_kg / (height_m^2)` e retornar a classificação de acordo com os padrões WHO
2. QUANDO um visitante submeter entradas válidas para a calculadora de Calorias, O Calculator_Engine DEVE computar o BMR usando a equação Mifflin-St Jeor e multiplicar pelo fator de atividade para retornar o TDEE
3. QUANDO um visitante submeter entradas válidas para a calculadora de Proteína, O Calculator_Engine DEVE retornar a faixa diária de proteína baseada no posicionamento ISSN 2017 (1.2-2.4g por kg dependendo do objetivo)
4. QUANDO um visitante submeter entradas válidas para a calculadora de Gordura Corporal, O Calculator_Engine DEVE computar a porcentagem de gordura corporal usando o método de circunferência US Navy (fórmulas separadas para masculino/feminino)
5. QUANDO um visitante submeter entradas válidas para a calculadora de 1RM, O Calculator_Engine DEVE computar o máximo de uma repetição usando a fórmula Brzycki para 1-10 reps e a fórmula Epley para 11-20 reps
6. QUANDO um visitante submeter entradas válidas para a calculadora de Frequência Cardíaca, O Calculator_Engine DEVE computar a FC máxima usando a equação Tanaka (208 - 0.7*idade) e as zonas usando o método Karvonen
7. QUANDO um visitante submeter entradas válidas para a calculadora de Hidratação, O Calculator_Engine DEVE computar a ingestão diária de água como (weight_kg * 35ml) + (exercise_minutes / 60 * 700ml)
8. QUANDO um visitante submeter entradas válidas para a calculadora de Pace, O Calculator_Engine DEVE computar o ritmo de corrida e projetar tempos de prova usando a fórmula Riegel (t2 = t1 * (d2/d1)^1.06)
9. O Calculator_Engine DEVE validar todas as entradas numéricas para estarem dentro de faixas fisiologicamente plausíveis antes da computação
10. O Calculator_Engine DEVE executar computações client-side em composables Vue sem chamadas à Backend_API para resultados instantâneos
11. O Calculator_Engine DEVE migrar todas as fórmulas de `assets/js/science.js` para composables TypeScript mantendo a precisão numérica
12. PARA TODAS as calculadoras, computar com as mesmas entradas válidas múltiplas vezes DEVE produzir resultados idênticos (propriedade de idempotência)
13. PARA TODAS as calculadoras com operações inversas (ex: conversão peso/IMC), O Calculator_Engine DEVE satisfazer a relação `compute(inverse(compute(x))) ≈ x` dentro da tolerância de arredondamento (propriedade round-trip)

### Requisito 2: Arquitetura Frontend Otimizada para SEO

**História de Usuário:** Como profissional de marketing de conteúdo, eu quero que as páginas das calculadoras ranqueiem organicamente no Google para consultas fitness, para que possamos adquirir usuários sem publicidade paga.

#### Critérios de Aceitação

1. O Frontend DEVE gerar páginas HTML estáticas para todas as 8 rotas de calculadoras em tempo de build usando Nuxt Static Site Generation (SSG)
2. O Frontend DEVE injetar meta títulos, descrições e tags Open Graph únicos para cada página de calculadora
3. O Frontend DEVE incluir dados estruturados JSON-LD com schemas `@type: WebApplication` e `FAQPage` nas páginas de calculadoras
4. O Frontend DEVE renderizar URLs canônicas correspondendo ao domínio de produção em todas as páginas
5. O Frontend DEVE alcançar pontuação Lighthouse SEO ≥ 95 para todas as páginas de calculadoras
6. O Frontend DEVE servir HTML com First Contentful Paint (FCP) < 1.5 segundos em conexões móveis 4G
7. O Frontend DEVE implementar roteamento baseado em arquivos correspondendo à estrutura de URL atual (/calculadora-de-imc, /calculadora-de-calorias, etc.)
8. QUANDO um rastreador de mecanismo de busca requisitar uma página de calculadora, O Frontend DEVE retornar HTML totalmente renderizado sem dependência de hidratação JavaScript client-side
9. O Frontend DEVE incluir declarações de idioma português (`lang="pt-BR"`) nos elementos raiz HTML
10. O Frontend DEVE manter rotas de URL idênticas do site vanilla JS existente para preservar rankings SEO

### Requisito 3: Arquitetura RESTful API

**História de Usuário:** Como desenvolvedor frontend, eu quero uma REST API limpa para gerenciamento de usuários e perfis, para que autenticação e persistência de dados sejam tratadas de forma segura no backend.

#### Critérios de Aceitação

1. O Backend_API DEVE expor endpoints seguindo convenções REST (GET para leituras, POST para criações, PUT/PATCH para atualizações, DELETE para remoções)
2. O Backend_API DEVE aceitar corpos de requisição JSON e retornar corpos de resposta JSON com headers Content-Type apropriados
3. O Backend_API DEVE implementar políticas CORS permitindo requisições do domínio do Frontend Nuxt
4. O Backend_API DEVE retornar códigos de status HTTP apropriados (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error)
5. O Backend_API DEVE versionar endpoints usando prefixo de URL `/api/v1/` para permitir versionamento futuro
6. O Backend_API DEVE documentar todos os endpoints usando especificação OpenAPI 3.0 com Swagger UI automático
7. O Backend_API DEVE validar payloads de requisição contra schemas JSON antes do processamento
8. QUANDO o Backend_API receber JSON malformado, O Backend_API DEVE retornar status 400 com mensagem de erro descritiva
9. O Backend_API DEVE registrar todas as requisições com timestamp, método, caminho, código de status e tempo de resposta usando logging estruturado
10. O Backend_API DEVE usar TypeScript para segurança de tipos em todos os manipuladores de rotas e modelos de dados

### Requisito 4: Sistema de Autenticação JWT

**História de Usuário:** Como usuário, eu quero registrar e fazer login de forma segura, para que eu possa salvar meu perfil de saúde e receber recomendações personalizadas das calculadoras.

#### Critérios de Aceitação

1. QUANDO um usuário submeter email e senha válidos para `/api/v1/auth/login`, O Auth_Service DEVE verificar as credenciais contra senhas hasheadas no Database e retornar um token JWT assinado
2. O Auth_Service DEVE gerar tokens JWT contendo user_id, email e timestamp de expiração usando algoritmo HS256
3. O Auth_Service DEVE definir a expiração JWT para 7 dias a partir da emissão
4. QUANDO um usuário submeter email, senha e nome para `/api/v1/auth/register`, O Auth_Service DEVE hashear a senha usando bcrypt com fator de custo 12 e criar um novo registro de usuário
5. O Auth_Service DEVE rejeitar requisições de registro com endereços de email duplicados com status 409 Conflict
6. QUANDO o Backend_API receber uma requisição com header `Authorization: Bearer <token>`, O Auth_Service DEVE decodificar e verificar a assinatura JWT antes do processamento
7. QUANDO o Auth_Service encontrar um token expirado ou inválido, O Auth_Service DEVE retornar status 401 Unauthorized
8. O Auth_Service DEVE rejeitar senhas com menos de 8 caracteres durante o registro com 400 Bad Request
9. O Auth_Service NUNCA DEVE registrar ou expor senhas em texto plano em respostas ou logs
10. PARA TODOS os endpoints autenticados, O Backend_API DEVE extrair user_id do JWT verificado e usá-lo para autorização de propriedade de recursos
11. O Auth_Service DEVE garantir que usuários possam acessar e modificar apenas seus próprios recursos (usuários não podem acessar perfis de outros usuários)

### Requisito 5: Gerenciamento de Perfil de Usuário e Dados de Saúde

**História de Usuário:** Como usuário, eu quero armazenar meus dados biométricos e objetivos fitness, para que eu possa acessar recomendações personalizadas das calculadoras e acompanhar mudanças ao longo do tempo.

#### Critérios de Aceitação

1. QUANDO um usuário completar o registro, O Backend_API DEVE criar um registro de usuário com email, hashed_password, name, timestamp created_at e timestamp updated_at
2. O Backend_API DEVE fornecer endpoint `POST /api/v1/users/me/profile` aceitando weight_kg, height_cm, age, sex, activity_level e fitness_goal
3. QUANDO um usuário criar ou atualizar dados de perfil de saúde, O Backend_API DEVE validar faixas numéricas (peso: 30-300kg, altura: 120-230cm, idade: 14-100 anos)
4. O Backend_API DEVE armazenar dados de perfil de saúde na tabela `user_health_profiles` com chave estrangeira para a tabela users
5. O Backend_API DEVE fornecer endpoint `GET /api/v1/users/me` retornando dados do usuário autenticado e perfil de saúde associado em uma única resposta
6. O Backend_API DEVE permitir que usuários atualizem campos de perfil via `PUT /api/v1/users/me/profile` com substituição completa do payload
7. O Backend_API DEVE garantir que usuários possam acessar apenas seus próprios dados de perfil (user_id do JWT deve corresponder ao proprietário do recurso solicitado)
8. QUANDO um usuário requisitar dados de perfil sem autenticação, O Backend_API DEVE retornar status 401 Unauthorized
9. O Backend_API DEVE validar valores ENUM de activity_level (sedentary, lightly_active, moderately_active, very_active, extremely_active)
10. O Backend_API DEVE validar valores ENUM de fitness_goal (weight_loss, maintenance, muscle_gain, athletic_performance)
11. O Backend_API DEVE validar valores ENUM de sex (male, female) para fórmulas de calculadoras que requerem computações específicas por sexo

### Requisito 6: Rate Limiting e Segurança Básica

**História de Usuário:** Como operador da plataforma, eu quero prevenir abuso de API e ataques de força bruta, para que recursos do sistema sejam protegidos e contas de usuário permaneçam seguras.

#### Critérios de Aceitação

1. O Backend_API DEVE implementar rate limiting de 60 requisições por 15 minutos por endereço IP para endpoints não autenticados
2. O Backend_API DEVE implementar rate limiting de 300 requisições por 15 minutos por user_id para endpoints autenticados
3. QUANDO limites de taxa forem excedidos, O Backend_API DEVE retornar 429 Too Many Requests com header Retry-After
4. O Backend_API DEVE implementar rate limiting especificamente para o endpoint de login (5 tentativas por 15 minutos por IP) para prevenir ataques de força bruta
5. O Backend_API DEVE validar que todos os campos de timestamp estão dentro de faixas razoáveis (não datas futuras)
6. O Backend_API DEVE registrar padrões de atividade suspeita (ex: 10+ tentativas de login falhadas do mesmo IP)
7. O Backend_API DEVE rejeitar, sem processamento, dados de perfil de saúde com valores fora das faixas fisiologicamente válidas (peso 30-300 kg, altura 120-230 cm, idade 14-100 anos). Caso, após o MVP, o cálculo das calculadoras passe a ser exposto também pelo servidor, a mesma regra de faixas se aplica a esses endpoints
8. O Backend_API DEVE sanitizar todas as entradas de usuário para prevenir ataques de injeção SQL e XSS

### Requisito 7: Schema do Database e Integridade Referencial

**História de Usuário:** Como administrador de banco de dados, eu quero um schema normalizado com restrições e índices apropriados, para que a integridade dos dados seja mantida e as queries executem de forma eficiente.

#### Critérios de Aceitação

1. O Database DEVE definir tabela users com colunas: id (PK UUID), email (UNIQUE NOT NULL), password_hash (NOT NULL), name (NOT NULL), created_at (TIMESTAMP DEFAULT NOW()), updated_at (TIMESTAMP DEFAULT NOW())
2. O Database DEVE definir tabela user_health_profiles com colunas: id (PK UUID), user_id (FK UNIQUE), weight_kg (DECIMAL), height_cm (DECIMAL), age (INTEGER), sex (ENUM), activity_level (ENUM), fitness_goal (ENUM), updated_at (TIMESTAMP)
3. O Database DEVE criar índice em users.email para queries de login rápidas
4. O Database DEVE criar índice em user_health_profiles.user_id para buscas de perfil
5. O Database DEVE impor restrição de chave estrangeira de user_health_profiles.user_id para users.id com delete CASCADE
6. O Database DEVE usar timestamps UTC para todas as colunas temporais
7. O Database DEVE impor restrições NOT NULL em campos obrigatórios (email, password_hash, name na tabela users)
8. O Database DEVE usar tipos ENUM para sex (male, female), activity_level (sedentary, lightly_active, moderately_active, very_active, extremely_active), fitness_goal (weight_loss, maintenance, muscle_gain, athletic_performance)
9. O Database DEVE validar faixas numéricas usando restrições CHECK (weight_kg BETWEEN 30 AND 300, height_cm BETWEEN 120 AND 230, age BETWEEN 14 AND 100)
10. O Database DEVE implementar atualizações automáticas de timestamp updated_at usando triggers ou hooks ORM

### Requisito 8: Gerenciamento de Estado e Reatividade no Frontend

**História de Usuário:** Como desenvolvedor frontend, eu quero um sistema de estado global previsível, para que autenticação de usuário e dados de perfil permaneçam sincronizados entre componentes.

#### Critérios de Aceitação

1. O Frontend DEVE usar store Pinia para gerenciamento de estado global com userStore para autenticação e dados de perfil
2. O userStore DEVE persistir token de autenticação no localStorage com chave `fittools_auth_token`
3. QUANDO o Frontend inicializar, O userStore DEVE verificar token existente e buscar perfil de usuário se o token existir e for válido
4. O Frontend DEVE implementar middleware Nuxt protegendo rotas autenticadas (/perfil), redirecionando para /login se não houver token válido
5. O Frontend DEVE automaticamente anexar header Authorization com Bearer token a todas as requisições do Backend_API quando o token existir no userStore
6. QUANDO o Backend_API retornar 401 Unauthorized, O Frontend DEVE limpar token do localStorage e userStore, então redirecionar para /login
7. O Frontend DEVE usar Composition API Vue 3 com composables para lógica das calculadoras, migrando todas as funções de assets/js/science.js para TypeScript
8. O Frontend DEVE implementar interfaces TypeScript correspondendo aos schemas de resposta da API backend para segurança de tipos
9. O Frontend DEVE aplicar debounce nas mudanças de entrada das calculadoras por 300ms antes de acionar computações para melhorar o desempenho
10. O userStore DEVE expor propriedades computadas para status de autenticação (isAuthenticated, currentUser, hasHealthProfile)

### Requisito 9: Tratamento de Erros e Feedback ao Usuário

**História de Usuário:** Como usuário, eu quero mensagens de erro claras quando algo der errado, para que eu entenda o que aconteceu e como corrigir.

#### Critérios de Aceitação

1. QUANDO o Backend_API encontrar erros de validação, O Backend_API DEVE retornar status 400 com JSON estruturado: `{error: "ValidationError", message: "...", fields: {...}}`
2. QUANDO o Backend_API encontrar erros de autenticação, O Backend_API DEVE retornar status 401 com `{error: "Unauthorized", message: "Token expirado ou inválido"}`
3. QUANDO o Backend_API encontrar erros de não encontrado, O Backend_API DEVE retornar status 404 com `{error: "NotFound", message: "Recurso não encontrado"}`
4. QUANDO o Backend_API encontrar erros de servidor, O Backend_API DEVE retornar status 500 com mensagem genérica, registrando stack trace completo server-side sem expor ao cliente
5. O Frontend DEVE exibir notificações toast para operações de sucesso (ex: "Perfil atualizado com sucesso!")
6. O Frontend DEVE exibir erros de validação inline abaixo dos campos de formulário com estilo vermelho e mensagens claras em português
7. O Frontend DEVE exibir mensagens de erro amigáveis para falhas de rede ("Não foi possível conectar. Verifique sua conexão com a internet.")
8. O Frontend DEVE implementar lógica de retry com backoff exponencial para requisições de API falhadas (máximo 3 retries para operações idempotentes)
9. O Backend_API NUNCA DEVE expor informações sensíveis (senhas, tokens, caminhos internos, stack traces) em respostas de erro aos clientes
10. O Frontend DEVE validar entradas das calculadoras client-side antes da computação e exibir feedback imediato para faixas inválidas

### Requisito 10: Implantação e Configuração de Ambiente

**História de Usuário:** Como engenheiro DevOps, eu quero configuração específica por ambiente e requisitos de implantação claros, para que a plataforma execute de forma confiável em produção.

#### Critérios de Aceitação

1. O Backend_API DEVE ler configuração de variáveis de ambiente: DATABASE_URL, JWT_SECRET, PORT, NODE_ENV, CORS_ORIGIN, JWT_EXPIRATION_DAYS
2. O Backend_API DEVE validar variáveis de ambiente obrigatórias na inicialização, encerrando com erro descritivo se alguma estiver faltando
3. O Frontend DEVE ler configuração do runtime config com variáveis: NUXT_PUBLIC_API_BASE_URL, NUXT_PUBLIC_SITE_URL
4. A Platform DEVE suportar três ambientes de implantação: development (localhost), staging (subdomínio staging), production (fittoolsbrasil.com.br)
5. O Backend_API DEVE habilitar logging detalhado de requisições e stack traces de erro em modo development, desabilitar exposição de stack trace em produção
6. O Frontend DEVE construir artefatos de produção com comando `nuxt generate` para Static Site Generation produzindo HTML/JS/CSS otimizados
7. O Backend_API DEVE usar ferramenta de migração de banco de dados (ex: Prisma Migrate, node-pg-migrate) com arquivos de migração versionados
8. A Platform DEVE usar bancos de dados PostgreSQL separados para ambientes development, staging e production
9. O Backend_API DEVE expor endpoint de health check `GET /health` retornando `{status: "ok", timestamp: <ISO8601>, uptime: <seconds>}` para monitoramento
10. O Backend_API DEVE implementar desligamento gracioso tratando sinais SIGTERM para fechar conexões de banco de dados antes do término do processo

### Requisito 11: Citações Científicas e Conformidade Legal

**História de Usuário:** Como proprietário da plataforma, eu quero citações científicas apropriadas e avisos legais, para que a plataforma mantenha credibilidade e esteja em conformidade com regulamentações de informações de saúde.

#### Critérios de Aceitação

1. O Frontend DEVE exibir referências científicas para cada calculadora citando pesquisa original (WHO para IMC, Mifflin et al. 1990 para BMR, ISSN 2017 para proteína, US Navy para gordura corporal, Tanaka et al. 2001 para frequência cardíaca, ACSM para hidratação, Riegel 1981 para pace)
2. O Frontend DEVE renderizar citações de referências com autores, título, jornal/fonte e ano em uma seção "Referências Científicas"
3. O Frontend DEVE incluir texto de aviso em todas as páginas de calculadoras: "Estas calculadoras fornecem estimativas baseadas em médias populacionais. Consulte profissionais qualificados de saúde para orientação médica personalizada."
4. O Frontend DEVE incluir links de política de privacidade e termos de serviço no rodapé de todas as páginas
5. O Frontend DEVE implementar banner de consentimento de cookies em conformidade com LGPD (lei brasileira de proteção de dados) usando biblioteca de consentimento de cookies
6. O Frontend DEVE exibir aviso "Esta ferramenta não substitui orientação médica ou de nutricionista" em todos os cards de resultado das calculadoras
7. O Frontend DEVE incluir marcação de dados estruturados para avisos de saúde melhorando sinais de confiança dos mecanismos de busca

### Requisito 12: Requisitos de Desempenho e Escalabilidade

**História de Usuário:** Como usuário, eu quero carregamentos de página rápidos e interações responsivas, para que eu tenha uma experiência fluida mesmo em conexões móveis.

#### Critérios de Aceitação

1. O Frontend DEVE alcançar pontuação Lighthouse Performance ≥ 85 em mobile para todas as páginas de calculadoras
2. O Frontend DEVE fazer lazy-load de imagens e JavaScript não crítico para melhorar o carregamento inicial da página
3. O Frontend DEVE implementar headers de cache HTTP para assets estáticos com max-age de 1 ano para bundles imutáveis
4. O Backend_API DEVE responder a queries de perfil de usuário (GET /api/v1/users/me) dentro de 100ms para 95% das requisições
5. O Backend_API DEVE responder ao endpoint de health check dentro de 50ms para 99% das requisições
6. O Database DEVE usar connection pooling com mínimo de 5 e máximo de 20 conexões concorrentes
7. O Backend_API DEVE implementar timeout de query de banco de dados de 5 segundos para prevenir queries de longa duração bloqueando workers
8. A Platform DEVE suportar pelo menos 100 usuários concorrentes com < 1% de taxa de erro para o lançamento do MVP
9. O Frontend DEVE implementar code splitting por rota para reduzir o tamanho inicial do bundle JavaScript abaixo de 200KB gzipped
10. Os composables Calculator_Engine DEVEM executar todas as computações sincronamente sem overhead assíncrono para resultados instantâneos

### Requisito 13: Requisitos de Testes e Garantia de Qualidade

**História de Usuário:** Como desenvolvedor, eu quero cobertura de testes abrangente para lógica de negócio crítica, para que regressões sejam capturadas antes da implantação.

#### Critérios de Aceitação

1. Os composables Calculator_Engine DEVEM ter testes unitários cobrindo todas as 8 fórmulas de calculadoras com pares de entrada/saída conhecidos da literatura científica
2. O Auth_Service DEVE ter testes de integração verificando fluxos de registro, login, geração de token e validação de token
3. O Backend_API DEVE ter testes de integração para todos os endpoints críticos (autenticação, gerenciamento de perfil) usando banco de dados de teste
4. O Frontend DEVE ter testes de componentes para formulários de calculadoras verificando validação de entrada e renderização de resultado usando Vitest + Testing Library
5. A Platform DEVE manter cobertura de código mínima de 70% para lógica de negócio backend (autenticação, validação, camadas de acesso a dados)
6. O Backend_API DEVE incluir testes de contrato de API garantindo que schemas de resposta correspondam à especificação OpenAPI
7. O Calculator_Engine DEVE incluir testes baseados em propriedades verificando idempotência e propriedades round-trip para fórmulas
8. O Auth_Service DEVE ter testes verificando regras de autorização (usuários não podem acessar dados de outros usuários)
9. O Backend_API DEVE ter testes para comportamento de rate limiting (requisições dentro dos limites têm sucesso, exceder limites retorna 429)
10. O Frontend DEVE ter testes E2E para jornadas de usuário críticas: registro → login → atualização de perfil usando Playwright ou Cypress

### Requisito 14: Caminho de Migração do Vanilla JavaScript

**História de Usuário:** Como desenvolvedor, eu quero uma estratégia de migração clara do vanilla JS existente, para que a funcionalidade seja preservada ao modernizar a base de código.

#### Critérios de Aceitação

1. O Calculator_Engine DEVE produzir resultados numericamente idênticos às funções science.js existentes (dentro de tolerância de 0.01% para ponto flutuante)
2. O Frontend DEVE manter rotas de URL idênticas para todas as páginas de calculadoras para preservar rankings SEO e links externos
3. O Frontend DEVE implementar componentes Vue com classes CSS correspondendo aos estilos existentes para consistência visual durante a migração
4. O Frontend DEVE preservar meta tags, títulos, descrições e dados estruturados existentes durante a migração
5. A Platform DEVE implementar redirecionamentos 301 permanentes se alguma estrutura de URL precisar mudar durante a migração
6. O Calculator_Engine DEVE incluir testes de comparação executando tanto implementações antigas science.js quanto novos composables TypeScript com entradas de teste idênticas
7. O Frontend DEVE migrar configuração de links de afiliados do config.js hardcoded para variáveis de ambiente ou CMS para gerenciamento mais fácil
8. O Frontend DEVE preservar a estrutura semântica HTML existente (headings, listas, formulários) para continuidade de acessibilidade e SEO

---

## Notas sobre Oportunidades de Property-Based Testing

Os seguintes requisitos são excelentes candidatos para property-based testing:

### Fórmulas das Calculadoras (Req 1):
- **Propriedade de idempotência**: `calculate(x) === calculate(x)` para todas as entradas válidas
- **Propriedade round-trip**: Para calculadora de IMC, `computeWeight(computeBMI(weight, height), height) ≈ weight` dentro da tolerância de arredondamento
- **Monotonicidade**: Para calculadora de 1RM, aumentar o peso deve aumentar 1RM; diminuir reps deve aumentar 1RM estimado para o mesmo peso
- **Validação de limites**: Todas as calculadoras devem consistentemente rejeitar valores fora de faixas fisiologicamente válidas
- **Estabilidade numérica**: Entradas extremas mas válidas não devem produzir NaN, Infinity ou resultados sem sentido

### Sistema de Autenticação (Req 4):
- **Validação de token**: Tokens válidos concedem acesso, tokens expirados/inválidos/ausentes negam acesso
- **Hashing de senha**: Mesma senha hasheada múltiplas vezes produz hashes diferentes (randomização de salt bcrypt)
- **Verificação de hash**: Para qualquer senha, `verifyHash(password, hashPassword(password)) === true`

### Gerenciamento de Perfil de Usuário (Req 5):
- **Isolamento de dados**: Usuário A não pode ler ou modificar dados de perfil do Usuário B
- **Idempotência de atualização**: Atualizar perfil com mesmos dados duas vezes produz o mesmo resultado
- **Consistência de validação**: Dados inválidos rejeitados independentemente de operação de atualização vs criação

### Rate Limiting (Req 6):
- **Aplicação de limite**: Requisições dentro do limite têm sucesso, requisições excedendo limite retornam 429
- **Janela deslizante**: Após aguardar expiração da janela, novas requisições têm sucesso
- **Isolamento por usuário**: Usuário A atingindo limite de taxa não afeta Usuário B

Essas propriedades devem ser implementadas usando fast-check (biblioteca TypeScript de property-based testing) para cobertura abrangente de casos extremos.
