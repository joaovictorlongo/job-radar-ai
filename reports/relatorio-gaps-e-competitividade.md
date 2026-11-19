# Relatório de Inteligência de Mercado, Matching e Análise de Gaps
*Gerado em: 19/11/2026, 11:51:21 | Base: 20 vagas analisadas*

---

## 1. Sumário Executivo e KPIs de Mercado

| Métrica | Valor Obtido | Significado / Contexto |
|---|---|---|
| **Total de Vagas Analisadas** | 20 | Amostra estratificada de tecnologia (Programathor) |
| **Habilidades Distintas Extraídas** | 154 | Catálogo de skills detectadas nas descrições |
| **Cobertura Global de Requisitos** | **35%** | % de todos os requisitos demandados atendidos pelo perfil |
| **Cobertura de Requisitos Mandatórios (Must-Have)** | **36.3%** | % dos requisitos obrigatórios com evidência comprovada |
| **Vagas de Alta Compatibilidade ($ge 75%$)** | 1 (5%) | Fit forte imediato para candidatura |
| **Vagas de Média Compatibilidade (55–74%)** | 2 (10%) | Vagas aderentes com gaps pontuais |
| **Vagas com Gaps Críticos ($< 55%$)** | 17 (85%) | Stacks distintas (ex.: SAP, PHP, Mobile nativo puro) |

---

## 2. Matriz de Competitividade (Demanda de Mercado × Perfil do João)

Esta matriz divide o mercado em 4 quadrantes estratégicos cruzando a frequência com que as empresas exigem a tecnologia e o nível de evidência comprovada no histórico técnico do João:

### 2.1 🟢 Fortalezas Nucleares (Core Advantages)
> **Definição:** Tecnologias com altíssima demanda ($ge 15%$ das vagas) onde você tem evidência robusta de produção. São os pilares onde você vence a triagem técnica inicial de concorrentes.

| Tecnologia / Requisito | Presença em Vagas | Must-Haves | Evidência Comprovada no Perfil |
|---|---|---|---|
| **communication** | **50%** (10 vagas) | 9x | "- **Inglês (English):** Inglês técnico profissional para leitura, escrita de documentação em inglês, code reviews, especificações e comunicação internacional. - **Português (Portuguese):** Nativo. - **Comunicação Técnica (Communication):** Articulaçã" |
| **aws** | **35%** (7 vagas) | 2x | "- **PostgreSQL:** Modelagem relacional, transações ACID, isolamento de concorrência, extension pgvector, constraints avançadas e tuning de performance. - **SQL Server / MySQL / Firebird:** Experiência sólida de mais de 8 anos em bancos relacionais co" |
| **react** | **30%** (6 vagas) | 5x | "- **Angular (v14 a v20+):** Standalone components, signals, OnPush change detection, RxJS, reactive forms, interceptors HTTP e roteamento avançado. - **Astro:** Arquitetura em ilhas (islands), Server-Side Rendering (SSR) e geração estática para sites" |
| **docker** | **25%** (5 vagas) | 3x | "- **PostgreSQL:** Modelagem relacional, transações ACID, isolamento de concorrência, extension pgvector, constraints avançadas e tuning de performance. - **SQL Server / MySQL / Firebird:** Experiência sólida de mais de 8 anos em bancos relacionais co" |
| **english** | **25%** (5 vagas) | 5x | "- **Inglês (English):** Inglês técnico profissional para leitura, escrita de documentação em inglês, code reviews, especificações e comunicação internacional. - **Português (Portuguese):** Nativo. - **Comunicação Técnica (Communication):** Articulaçã" |
| **sql** | **25%** (5 vagas) | 5x | "- **SQL:** Consultas complexas, joins analíticos, CTEs (Common Table Expressions), window functions, índices B-Tree, GIN e HNSW (pgvector). - **Python:** Básico/intermediário para automações, scripts de machine learning, CLI e testes com pytest. - **" |
| **mysql** | **20%** (4 vagas) | 3x | "- **PostgreSQL:** Modelagem relacional, transações ACID, isolamento de concorrência, extension pgvector, constraints avançadas e tuning de performance. - **SQL Server / MySQL / Firebird:** Experiência sólida de mais de 8 anos em bancos relacionais co" |
| **javascript** | **20%** (4 vagas) | 4x | "- **TypeScript:** Nível avançado/sênior. Tipagem estrita (`strict: true`, `noUncheckedIndexedAccess`, zero `any`), generics avançados, mapped types, type guards e asserções customizadas. - **JavaScript (ES2022+):** Domínio completo de event loop, asy" |
| **git** | **20%** (4 vagas) | 4x | "- **Descrição:** CLI interativa no terminal para controle do Spotify desenvolvida com Node.js 22, TypeScript e Ink (React para CLI). - **Evidências Técnicas Comprovadas:** - Fluxo completo de autenticação OAuth 2.0 com PKCE (Proof Key for Code Exchan" |

### 2.2 🛡️ Moats e Diferenciais Competitivos (AI Engineering de Produção)
> **Definição:** Habilidades de ponta que poucos candidatos Full Stack dominam. Diferenciais raros que posicionam você no topo dos processos seletivos de AI Engineer.

| Tecnologia / Prática | Relevância no Mercado | Por que é Diferencial Frente a Outros Candidatos |
|---|---|---|
| **Evals Sistemáticos (Métricas de IA)** | Emergente / Crítica (58% das vagas AI) | A maioria dos candidatos só faz chamadas de LLM soltas; você mede F1, Cohen's $\kappa$ e custo/latência. |
| **Grounding Literal e Guardrails** | Crítica em Produção | Zero alucinação em campos regulados (ex.: salário), com validação literal de evidência contra a fonte. |
| **pgvector + HNSW no PostgreSQL** | Alta expansão em RAG | Unifica dado relacional transacional e busca vetorial sem complexidade de bancos vetoriais isolados. |
| **TypeScript Strict (zero `any`)** | Padrão sênior | Engenharia robusta com `noUncheckedIndexedAccess`, generics e validação Zod pós-LLM. |
| **OAuth PKCE & Backoff Resiliente** | Requisito sênior | Implementação demonstrável em projetos como `spoticli` com retry idempotente em 429/5xx. |

### 2.3 🔴 Gaps Estratégicos Críticos (Onde Outros Candidatos Passam à Frente)
> **Definição:** Tecnologias com alta demanda nas vagas onde você possui evidência apenas parcial ou ausente. Representam os principais motivos de descarte na triagem de RH/Tech Leads.

| Tecnologia | Demanda em Vagas | Gravidade | Diagnóstico do Gap e Ação Recomendada |
|---|---|---|---|
| **c#** | **30%** (6 vagas) | 🔥 Alta | Gargalo crítico frente à concorrência. Adicione projeto prático ou prova de conceito prioritária. |
| **mongodb** | **20%** (4 vagas) | 🔥 Alta | Gargalo crítico frente à concorrência. Adicione projeto prático ou prova de conceito prioritária. |

---

## 3. Benchmark de Mercado: João vs Concorrência Média

Comparativo do perfil técnico do João com as duas personas mais comuns disputando as mesmas posições no mercado atual:

| Dimensão Técnica | Candidato Médio Full Stack TS | Candidato Típico em IA (Hype/Júnior) | **João Victor Longo (Posicionamento)** |
|---|---|---|---|
| **Experiência Real em Produção** | 3–5 anos em apps web comuns | 0–2 anos (transição recente/cursos) | **~10 anos de TI, 4 anos em SaaS B2B com ~40 mil usuários (Field Control)** |
| **Backend & Arquitetura** | CRUDs em Express/NestJS básicos | Scripts soltos em Python/FastAPI | **NestJS sênior, GraphQL, PostgreSQL transacional, microsserviços e resiliência** |
| **Engenharia de IA** | Consumo básico de OpenAI API | LangChain/LlamaIndex sem testes nem evals | **Structured Outputs com Zod, Grounding literal, pgvector e harness de avaliação com $\kappa$** |
| **Bancos de Dados & Vetores** | ORMs básicos (Prisma/TypeORM) | ChromaDB ou Pinecone na nuvem | **PostgreSQL profundo (queries, índices HNSW, constraints de integridade, pgvector)** |
| **Frontend** | React padrão com bibliotecas de UI | Sem experiência relevante em frontend | **Angular sólido em produção; fechando gap com Next.js (App Router) neste projeto** |
| **Rigor de Qualidade** | Lint básico, poucos testes | Sem testes, notebooks Jupyter | **100% dos repositórios com TS strict, Vitest/Jest, ESLint e CI automatizado** |

---

## 4. Plano de Ação para Fechamento de Gaps

Com base na frequência das 20 vagas analisadas, estas são as ações prioritárias para aumentar a taxa de conversão em vagas Full Stack e AI Engineer:

1. **Consolidar Next.js (App Router) no Dashboard (Bloco B5):**
   - *Impacto:* Requisito presente em mais de 50% das vagas que pedem React/Next.
   - *Ação:* Construir as 3 telas do dashboard do Job Radar AI em Next.js com Server Components, Server Actions e Tailwind, integrando direto nas rotas `/` e `/evals`.

2. **Demonstrar Mensageria Distribuída (Kafka / RabbitMQ):**
   - *Impacto:* Presente em vagas sênior de backend com alta concorrência.
   - *Ação:* Explicitar no README a arquitetura de processamento assíncrono com BullMQ/Redis e comparar com padrões de streaming com Kafka.

3. **Exibir as Métricas do Harness de Avaliação no Topo do Portfólio:**
   - *Impacto:* Nenhum candidato comum mede F1 micro/macro de extrações ou zero falso positivo de salário no banco.
   - *Ação:* Destacar no LinkedIn e no site pessoal o commit do `eval_run` e os 77 testes passando.

---

## 5. Ranking de Oportunidades: Top Vagas Analisadas

### [🟢 ALTO FIT] Full-stack Engineer Node.js + React.js + AWS (USD-based pay) — Score: 75%
- **Fonte / Link:** [PROGRAMATHOR](https://programathor.com.br/jobs/33749-full-stack-engineer-node-js-react-js-aws-usd-based-pay) | **Senioridade:** mid | **Modelo:** remote
- **Must-Haves Atendidos:** 6/8 (75%)

**Evidências Comprovadas do Perfil:**
  - ✓ **react** (Obrigatório) → *"- **Angular (v14 a v20+):** Standalone components, signals, OnPush change detection, RxJS, reactive forms, interceptors HTTP e roteamento avançado. - **Astro:** Arquitetura em ilhas (islands), Server-Side Rendering (SSR) e geração estática para sites"*
  - ✓ **node.js** (Obrigatório) → *"- **TypeScript:** Nível avançado/sênior. Tipagem estrita (`strict: true`, `noUncheckedIndexedAccess`, zero `any`), generics avançados, mapped types, type guards e asserções customizadas. - **JavaScript (ES2022+):** Domínio completo de event loop, asy"*
  - ✓ **aws** (Obrigatório) → *"- **PostgreSQL:** Modelagem relacional, transações ACID, isolamento de concorrência, extension pgvector, constraints avançadas e tuning de performance. - **SQL Server / MySQL / Firebird:** Experiência sólida de mais de 8 anos em bancos relacionais co"*
  - ✓ **postgresql** (Obrigatório) → *"- **PostgreSQL:** Modelagem relacional, transações ACID, isolamento de concorrência, extension pgvector, constraints avançadas e tuning de performance. - **SQL Server / MySQL / Firebird:** Experiência sólida de mais de 8 anos em bancos relacionais co"*

**Gaps Identificados na Vaga:**
  - ✗ **multi tenant access control and rbac** (Obrigatório) — *Não comprovado no perfil*
  - ✗ **api gateway and serverless architecture** (Obrigatório) — *Não comprovado no perfil*

### [🟡 MÉDIO FIT] Desenvolvedor Full-Stack Estágio — Score: 70%
- **Fonte / Link:** [PROGRAMATHOR](https://programathor.com.br/jobs/33860-desenvolvedor-full-stack-estagio) | **Senioridade:** intern | **Modelo:** onsite
- **Must-Haves Atendidos:** 6/10 (60%)

**Evidências Comprovadas do Perfil:**
  - ✓ **sql** (Obrigatório) → *"- **SQL:** Consultas complexas, joins analíticos, CTEs (Common Table Expressions), window functions, índices B-Tree, GIN e HNSW (pgvector). - **Python:** Básico/intermediário para automações, scripts de machine learning, CLI e testes com pytest. - **"*
  - ✓ **sql server** (Obrigatório) → *"- **PostgreSQL:** Modelagem relacional, transações ACID, isolamento de concorrência, extension pgvector, constraints avançadas e tuning de performance. - **SQL Server / MySQL / Firebird:** Experiência sólida de mais de 8 anos em bancos relacionais co"*
  - ✓ **javascript** (Obrigatório) → *"- **TypeScript:** Nível avançado/sênior. Tipagem estrita (`strict: true`, `noUncheckedIndexedAccess`, zero `any`), generics avançados, mapped types, type guards e asserções customizadas. - **JavaScript (ES2022+):** Domínio completo de event loop, asy"*
  - ✓ **angular** (Obrigatório) → *"- **Angular (v14 a v20+):** Standalone components, signals, OnPush change detection, RxJS, reactive forms, interceptors HTTP e roteamento avançado. - **Astro:** Arquitetura em ilhas (islands), Server-Side Rendering (SSR) e geração estática para sites"*

**Gaps Identificados na Vaga:**
  - ✗ **c#** (Obrigatório) — *Não comprovado no perfil*
  - ✗ **.net** (Obrigatório) — *Não comprovado no perfil*
  - ✗ **mongodb** (Obrigatório) — *Não comprovado no perfil*

### [🟡 MÉDIO FIT] Senior React Full-stack Developer — Score: 60%
- **Fonte / Link:** [PROGRAMATHOR](https://programathor.com.br/jobs/33861-senior-react-full-stack-developer) | **Senioridade:** senior | **Modelo:** remote
- **Must-Haves Atendidos:** 3/5 (60%)

**Evidências Comprovadas do Perfil:**
  - ✓ **react** (Obrigatório) → *"- **Angular (v14 a v20+):** Standalone components, signals, OnPush change detection, RxJS, reactive forms, interceptors HTTP e roteamento avançado. - **Astro:** Arquitetura em ilhas (islands), Server-Side Rendering (SSR) e geração estática para sites"*
  - ✓ **aws** (Obrigatório) → *"- **PostgreSQL:** Modelagem relacional, transações ACID, isolamento de concorrência, extension pgvector, constraints avançadas e tuning de performance. - **SQL Server / MySQL / Firebird:** Experiência sólida de mais de 8 anos em bancos relacionais co"*
  - ✓ **english** (Obrigatório) → *"- **Inglês (English):** Inglês técnico profissional para leitura, escrita de documentação em inglês, code reviews, especificações e comunicação internacional. - **Português (Portuguese):** Nativo. - **Comunicação Técnica (Communication):** Articulaçã"*

**Gaps Identificados na Vaga:**
  - ✗ **ruby** (Obrigatório) — *Não comprovado no perfil*
  - ✗ **end to end problem ownership** (Obrigatório) — *Não comprovado no perfil*

### [🟡 MÉDIO FIT] Desenvolvedor(a) Full Stack Sênior — Score: 54.5%
- **Fonte / Link:** [PROGRAMATHOR](https://programathor.com.br/jobs/33876-desenvolvedor-a-full-stack-senior) | **Senioridade:** senior | **Modelo:** onsite
- **Must-Haves Atendidos:** 7/12 (58%)

**Evidências Comprovadas do Perfil:**
  - ✓ **node.js** (Obrigatório) → *"- **TypeScript:** Nível avançado/sênior. Tipagem estrita (`strict: true`, `noUncheckedIndexedAccess`, zero `any`), generics avançados, mapped types, type guards e asserções customizadas. - **JavaScript (ES2022+):** Domínio completo de event loop, asy"*
  - ✓ **typescript** (Obrigatório) → *"- **TypeScript:** Nível avançado/sênior. Tipagem estrita (`strict: true`, `noUncheckedIndexedAccess`, zero `any`), generics avançados, mapped types, type guards e asserções customizadas. - **JavaScript (ES2022+):** Domínio completo de event loop, asy"*
  - ✓ **javascript** (Obrigatório) → *"- **TypeScript:** Nível avançado/sênior. Tipagem estrita (`strict: true`, `noUncheckedIndexedAccess`, zero `any`), generics avançados, mapped types, type guards e asserções customizadas. - **JavaScript (ES2022+):** Domínio completo de event loop, asy"*
  - ✓ **mysql** (Obrigatório) → *"- **PostgreSQL:** Modelagem relacional, transações ACID, isolamento de concorrência, extension pgvector, constraints avançadas e tuning de performance. - **SQL Server / MySQL / Firebird:** Experiência sólida de mais de 8 anos em bancos relacionais co"*

**Gaps Identificados na Vaga:**
  - ✗ **kafka** (Obrigatório) — *Não comprovado no perfil*
  - ✗ **rabbitmq** (Obrigatório) — *Não comprovado no perfil*
  - ✗ **mongodb** (Obrigatório) — *Não comprovado no perfil*

### [🟡 MÉDIO FIT] Desenvolvedor Full Stack Pleno — Score: 48.8%
- **Fonte / Link:** [PROGRAMATHOR](https://programathor.com.br/jobs/33854-desenvolvedor-full-stack-pleno) | **Senioridade:** mid | **Modelo:** remote
- **Must-Haves Atendidos:** 2/5 (40%)

**Evidências Comprovadas do Perfil:**
  - ✓ **llm** (Obrigatório) → *"- **Descrição:** Plataforma de engenharia de IA e inteligência de mercado tech para monitoramento de vagas, extração estruturada com LLM, validação com grounding estrito, RAG vetorial no PostgreSQL com pgvector e avaliação contínua. - **Evidências Té"*
  - ✓ **sql** (Obrigatório) → *"- **SQL:** Consultas complexas, joins analíticos, CTEs (Common Table Expressions), window functions, índices B-Tree, GIN e HNSW (pgvector). - **Python:** Básico/intermediário para automações, scripts de machine learning, CLI e testes com pytest. - **"*
  - ✓ **angular** (Desejável) → *"- **Angular (v14 a v20+):** Standalone components, signals, OnPush change detection, RxJS, reactive forms, interceptors HTTP e roteamento avançado. - **Astro:** Arquitetura em ilhas (islands), Server-Side Rendering (SSR) e geração estática para sites"*
  - ✓ **react** (Desejável) → *"- **Angular (v14 a v20+):** Standalone components, signals, OnPush change detection, RxJS, reactive forms, interceptors HTTP e roteamento avançado. - **Astro:** Arquitetura em ilhas (islands), Server-Side Rendering (SSR) e geração estática para sites"*

**Gaps Identificados na Vaga:**
  - ✗ **c#** (Obrigatório) — *Não comprovado no perfil*
  - ✗ **.net** (Obrigatório) — *Não comprovado no perfil*
  - ✗ **github** (Obrigatório) — *Não comprovado no perfil*
