# Projetos em Destaque e Evidências Práticas

## Job Radar AI (github.com/joaovictorlongo/job-radar-ai)
- **Descrição:** Plataforma de engenharia de IA e inteligência de mercado tech para monitoramento de vagas, extração estruturada com LLM, validação com grounding estrito, RAG vetorial no PostgreSQL com pgvector e avaliação contínua.
- **Evidências Técnicas Comprovadas:**
  - Monorepo pnpm com TypeScript em modo ultra-estrito (`noUncheckedIndexedAccess`, zero `any`).
  - Pipeline de ingestão assíncrono com rate limiting, backoff exponencial e deduplicação determinística por hash SHA-256.
  - Extração com LLM agnóstica a provedor utilizando adapter OpenAI-compatible com JSON Schema estrito e validação Zod.
  - Travas de segurança: Grounding com busca literal de `evidence_span` na descrição e gate duro de zero salário inventado verificado no banco por check constraints.
  - Harness de avaliação (B3) com dataset ouro versionado, cálculo automatizado de Precisão, Recall, F1 micro/macro e Cohen's Kappa para concordância inter-anotadores.

## spoticli (github.com/joaovictorlongo/spoticli)
- **Descrição:** CLI interativa no terminal para controle do Spotify desenvolvida com Node.js 22, TypeScript e Ink (React para CLI).
- **Evidências Técnicas Comprovadas:**
  - Fluxo completo de autenticação OAuth 2.0 com PKCE (Proof Key for Code Exchange) sem expor segredos.
  - Tratamento de expiração de token com renovação automática via refresh token em retornos 401.
  - Políticas de retry resilientes com backoff exponencial respeitando cabeçalhos `Retry-After` em erros 429 e 5xx.
  - Rigor de qualidade de código: TypeScript estrito, ESLint, Prettier e git hooks com Husky.

## open-radar (github.com/joaovictorlongo/open-radar)
- **Descrição:** Aplicação completa para monitoramento meteorológico em tempo real no estado de São Paulo integrando dados de radar do IPMet, satélite GOES-19 e estações METAR.
- **Evidências Técnicas Comprovadas:**
  - Desenvolvimento com Angular e NativeScript para suporte desktop e mobile.
  - Renderização geoespacial com mapas interativos e camadas animadas via Leaflet.
  - Consumo e sincronização de dados de múltiplos provedores governamentais e meteorológicos.

## elysia-auth (github.com/joaovictorlongo/elysia-auth)
- **Descrição:** Microserviço de autenticação stateless e stateful com Bun, Elysia e Drizzle ORM sobre PostgreSQL.
- **Evidências Técnicas Comprovadas:**
  - Rotas de login, refresh e revogação de tokens com hashing seguro de senhas via Argon2.
  - Tipagem estrita de schemas e queries com Drizzle ORM.
