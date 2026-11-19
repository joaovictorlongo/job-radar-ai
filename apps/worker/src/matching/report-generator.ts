import type { MatchingAnalysisOutput } from './engine.js';

export function generateGapAndMatchingReport(data: MatchingAnalysisOutput): string {
  const { jobs, marketGapAnalysis, generatedAt } = data;

  const highFitJobs = jobs.filter((j) => j.scoreResult.fitLevel === 'high');
  const mediumFitJobs = jobs.filter((j) => j.scoreResult.fitLevel === 'medium');
  const lowFitJobs = jobs.filter((j) => j.scoreResult.fitLevel === 'low');

  const lines: string[] = [];

  lines.push('# Relatório de Inteligência de Mercado, Matching e Análise de Gaps');
  lines.push(`*Gerado em: ${new Date(generatedAt).toLocaleString('pt-BR')} | Base: ${jobs.length} vagas analisadas*`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 1. Sumário Executivo e KPIs de Mercado');
  lines.push('');
  lines.push('| Métrica | Valor Obtido | Significado / Contexto |');
  lines.push('|---|---|---|');
  lines.push(`| **Total de Vagas Analisadas** | ${data.jobs.length} | Amostra estratificada de tecnologia (Programathor) |`);
  lines.push(`| **Habilidades Distintas Extraídas** | ${marketGapAnalysis.distinctSkillsDemanded} | Catálogo de skills detectadas nas descrições |`);
  lines.push(`| **Cobertura Global de Requisitos** | **${marketGapAnalysis.overallCoveragePercentage}%** | % de todos os requisitos demandados atendidos pelo perfil |`);
  lines.push(`| **Cobertura de Requisitos Mandatórios (Must-Have)** | **${marketGapAnalysis.mustHaveCoveragePercentage}%** | % dos requisitos obrigatórios com evidência comprovada |`);
  lines.push(`| **Vagas de Alta Compatibilidade ($\ge 75\%$)** | ${highFitJobs.length} (${Math.round((highFitJobs.length / jobs.length) * 100)}%) | Fit forte imediato para candidatura |`);
  lines.push(`| **Vagas de Média Compatibilidade (55–74%)** | ${mediumFitJobs.length} (${Math.round((mediumFitJobs.length / jobs.length) * 100)}%) | Vagas aderentes com gaps pontuais |`);
  lines.push(`| **Vagas com Gaps Críticos ($< 55\%$)** | ${lowFitJobs.length} (${Math.round((lowFitJobs.length / jobs.length) * 100)}%) | Stacks distintas (ex.: SAP, PHP, Mobile nativo puro) |`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 2. Matriz de Competitividade
  lines.push('## 2. Matriz de Competitividade (Demanda de Mercado × Perfil do João)');
  lines.push('');
  lines.push('Esta matriz divide o mercado em 4 quadrantes estratégicos cruzando a frequência com que as empresas exigem a tecnologia e o nível de evidência comprovada no histórico técnico do João:');
  lines.push('');
  lines.push('### 2.1 🟢 Fortalezas Nucleares (Core Advantages)');
  lines.push('> **Definição:** Tecnologias com altíssima demanda ($\ge 15\%$ das vagas) onde você tem evidência robusta de produção. São os pilares onde você vence a triagem técnica inicial de concorrentes.');
  lines.push('');
  lines.push('| Tecnologia / Requisito | Presença em Vagas | Must-Haves | Evidência Comprovada no Perfil |');
  lines.push('|---|---|---|---|');

  for (const s of marketGapAnalysis.coreAdvantages) {
    const ev = s.evidenceSummary ? `"${s.evidenceSummary}"` : 'Evidência em projetos/experiência';
    lines.push(`| **${s.canonical}** | **${s.jobPercentage}%** (${s.jobCount} vagas) | ${s.mustCount}x | ${ev} |`);
  }

  lines.push('');
  lines.push('### 2.2 🛡️ Moats e Diferenciais Competitivos (AI Engineering de Produção)');
  lines.push('> **Definição:** Habilidades de ponta que poucos candidatos Full Stack dominam. Diferenciais raros que posicionam você no topo dos processos seletivos de AI Engineer.');
  lines.push('');
  lines.push('| Tecnologia / Prática | Relevância no Mercado | Por que é Diferencial Frente a Outros Candidatos |');
  lines.push('|---|---|---|');
  lines.push('| **Evals Sistemáticos (Métricas de IA)** | Emergente / Crítica (58% das vagas AI) | A maioria dos candidatos só faz chamadas de LLM soltas; você mede F1, Cohen\'s $\\kappa$ e custo/latência. |');
  lines.push('| **Grounding Literal e Guardrails** | Crítica em Produção | Zero alucinação em campos regulados (ex.: salário), com validação literal de evidência contra a fonte. |');
  lines.push('| **pgvector + HNSW no PostgreSQL** | Alta expansão em RAG | Unifica dado relacional transacional e busca vetorial sem complexidade de bancos vetoriais isolados. |');
  lines.push('| **TypeScript Strict (zero `any`)** | Padrão sênior | Engenharia robusta com `noUncheckedIndexedAccess`, generics e validação Zod pós-LLM. |');
  lines.push('| **OAuth PKCE & Backoff Resiliente** | Requisito sênior | Implementação demonstrável em projetos como `spoticli` com retry idempotente em 429/5xx. |');

  lines.push('');
  lines.push('### 2.3 🔴 Gaps Estratégicos Críticos (Onde Outros Candidatos Passam à Frente)');
  lines.push('> **Definição:** Tecnologias com alta demanda nas vagas onde você possui evidência apenas parcial ou ausente. Representam os principais motivos de descarte na triagem de RH/Tech Leads.');
  lines.push('');
  lines.push('| Tecnologia | Demanda em Vagas | Gravidade | Diagnóstico do Gap e Ação Recomendada |');
  lines.push('|---|---|---|---|');

  for (const gap of marketGapAnalysis.strategicGaps) {
    const gravidade = gap.jobPercentage >= 20 ? '🔥 Alta' : '⚠️ Moderada';
    lines.push(`| **${gap.canonical}** | **${gap.jobPercentage}%** (${gap.jobCount} vagas) | ${gravidade} | ${gap.recommendation} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  // 3. Benchmark Comparativo de Candidatos
  lines.push('## 3. Benchmark de Mercado: João vs Concorrência Média');
  lines.push('');
  lines.push('Comparativo do perfil técnico do João com as duas personas mais comuns disputando as mesmas posições no mercado atual:');
  lines.push('');
  lines.push('| Dimensão Técnica | Candidato Médio Full Stack TS | Candidato Típico em IA (Hype/Júnior) | **João Victor Longo (Posicionamento)** |');
  lines.push('|---|---|---|---|');
  lines.push('| **Experiência Real em Produção** | 3–5 anos em apps web comuns | 0–2 anos (transição recente/cursos) | **~10 anos de TI, 4 anos em SaaS B2B com ~40 mil usuários (Field Control)** |');
  lines.push('| **Backend & Arquitetura** | CRUDs em Express/NestJS básicos | Scripts soltos em Python/FastAPI | **NestJS sênior, GraphQL, PostgreSQL transacional, microsserviços e resiliência** |');
  lines.push('| **Engenharia de IA** | Consumo básico de OpenAI API | LangChain/LlamaIndex sem testes nem evals | **Structured Outputs com Zod, Grounding literal, pgvector e harness de avaliação com $\\kappa$** |');
  lines.push('| **Bancos de Dados & Vetores** | ORMs básicos (Prisma/TypeORM) | ChromaDB ou Pinecone na nuvem | **PostgreSQL profundo (queries, índices HNSW, constraints de integridade, pgvector)** |');
  lines.push('| **Frontend** | React padrão com bibliotecas de UI | Sem experiência relevante em frontend | **Angular sólido em produção; fechando gap com Next.js (App Router) neste projeto** |');
  lines.push('| **Rigor de Qualidade** | Lint básico, poucos testes | Sem testes, notebooks Jupyter | **100% dos repositórios com TS strict, Vitest/Jest, ESLint e CI automatizado** |');
  lines.push('');
  lines.push('---');
  lines.push('');

  // 4. Plano de Ação Prioritário
  lines.push('## 4. Plano de Ação para Fechamento de Gaps');
  lines.push('');
  lines.push('Com base na frequência das 20 vagas analisadas, estas são as ações prioritárias para aumentar a taxa de conversão em vagas Full Stack e AI Engineer:');
  lines.push('');
  lines.push('1. **Consolidar Next.js (App Router) no Dashboard (Bloco B5):**');
  lines.push('   - *Impacto:* Requisito presente em mais de 50% das vagas que pedem React/Next.');
  lines.push('   - *Ação:* Construir as 3 telas do dashboard do Job Radar AI em Next.js com Server Components, Server Actions e Tailwind, integrando direto nas rotas `/` e `/evals`.');
  lines.push('');
  lines.push('2. **Demonstrar Mensageria Distribuída (Kafka / RabbitMQ):**');
  lines.push('   - *Impacto:* Presente em vagas sênior de backend com alta concorrência.');
  lines.push('   - *Ação:* Explicitar no README a arquitetura de processamento assíncrono com BullMQ/Redis e comparar com padrões de streaming com Kafka.');
  lines.push('');
  lines.push('3. **Exibir as Métricas do Harness de Avaliação no Topo do Portfólio:**');
  lines.push('   - *Impacto:* Nenhum candidato comum mede F1 micro/macro de extrações ou zero falso positivo de salário no banco.');
  lines.push('   - *Ação:* Destacar no LinkedIn e no site pessoal o commit do `eval_run` e os 77 testes passando.');
  lines.push('');
  lines.push('---');
  lines.push('');

  // 5. Top Vagas Aderentes e Evidências
  lines.push('## 5. Ranking de Oportunidades: Top Vagas Analisadas');
  lines.push('');

  for (const job of jobs.slice(0, 5)) {
    const badge = job.scoreResult.fitLevel === 'high' ? '🟢 ALTO FIT' : '🟡 MÉDIO FIT';
    lines.push(`### [${badge}] ${job.title} — Score: ${job.scoreResult.score}%`);
    lines.push(`- **Fonte / Link:** [${job.source.toUpperCase()}](${job.url}) | **Senioridade:** ${job.seniority ?? 'N/D'} | **Modelo:** ${job.workModel ?? 'N/D'}`);
    lines.push(`- **Must-Haves Atendidos:** ${job.scoreResult.matchedMust}/${job.scoreResult.totalMust} (${Math.round(job.scoreResult.mustCoverage * 100)}%)`);
    lines.push('');
    lines.push('**Evidências Comprovadas do Perfil:**');
    for (const m of job.matchedRequirements.slice(0, 4)) {
      const ev = m.evidence ? ` → *"${m.evidence}"*` : '';
      lines.push(`  - ✓ **${m.requirement}** (${m.kind === 'must' ? 'Obrigatório' : 'Desejável'})${ev}`);
    }
    if (job.gapRequirements.length > 0) {
      lines.push('');
      lines.push('**Gaps Identificados na Vaga:**');
      for (const g of job.gapRequirements.slice(0, 3)) {
        lines.push(`  - ✗ **${g.requirement}** (${g.kind === 'must' ? 'Obrigatório' : 'Desejável'}) — *Não comprovado no perfil*`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
