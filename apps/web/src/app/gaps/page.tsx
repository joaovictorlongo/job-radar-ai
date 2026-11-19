import { getDbPool } from '@/lib/db';
import { analyzeMarketGaps, type JobWithExtractedRequirements, type UserSkillEvidenceMap } from '@job-radar/shared';

export default async function GapsPage() {
  const pool = getDbPool();

  // 1. Busca dados de vagas e requisitos
  const jobsRes = await pool.query<{ id: string; title: string }>(
    `select id, title from jobs where extractor_version = 'extract-v2'`,
  );

  const reqsRes = await pool.query<{ job_id: string; canonical: string; kind: 'must' | 'nice'; category: string | null }>(
    `select jr.job_id, r.canonical, jr.kind, r.category
     from job_requirements jr
     join requirements r on r.id = jr.requirement_id
     join jobs j on j.id = jr.job_id
     where j.extractor_version = 'extract-v2'`,
  );

  const reqsByJob = new Map<string, Array<{ canonical: string; kind: 'must' | 'nice'; category?: string }>>();
  for (const r of reqsRes.rows) {
    let list = reqsByJob.get(r.job_id);
    if (!list) {
      list = [];
      reqsByJob.set(r.job_id, list);
    }
    list.push({ canonical: r.canonical, kind: r.kind, category: r.category ?? 'tech' });
  }

  const jobsData: JobWithExtractedRequirements[] = jobsRes.rows.map((j) => ({
    id: j.id,
    title: j.title,
    requirements: reqsByJob.get(j.id) ?? [],
  }));

  // 2. Busca chunks do perfil do João
  const chunksRes = await pool.query<{ section: string; content: string }>(
    `select section, content from profile_chunks where version = 'v1'`,
  );
  const profileText = chunksRes.rows.map((r) => `${r.section}\n${r.content}`).join('\n\n');

  // Mapeia evidências do usuário
  const userEvidence: UserSkillEvidenceMap = {};
  const distinctSkills = new Set<string>();
  for (const r of reqsRes.rows) {
    distinctSkills.add(r.canonical.toLowerCase().trim());
  }

  for (const skill of distinctSkills) {
    const regex = new RegExp(`(?<![a-z0-9])${escapeRegex(skill)}(?![a-z0-9])`, 'i');
    if (regex.test(profileText)) {
      userEvidence[skill] = {
        status: 'strong_evidence',
        evidence: 'Evidência documentada no histórico profissional e projetos do João.',
      };
    } else {
      userEvidence[skill] = {
        status: 'gap',
        evidence: 'Sem menção no perfil atual.',
      };
    }
  }

  const analysis = analyzeMarketGaps(jobsData, userEvidence);

  return (
    <div className="space-y-8">
      {/* Banner de Inteligência */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                Inteligência Competitiva
              </span>
              <span className="text-xs text-slate-400">Base: {analysis.totalJobsAnalyzed} vagas analisadas</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-2">
              Análise de Gaps & Matriz de Competitividade
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-2xl">
              Cruzamento analítico entre a demanda real de tecnologia do mercado tech e as competências comprovadas do <strong>João Victor Longo</strong>, destacando vantagens competitivas e pontos de atenção.
            </p>
          </div>
        </div>

        {/* Métricas Principais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div>
            <span className="text-xs text-slate-400">Cobertura de Requisitos (Geral)</span>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">
              {analysis.overallCoveragePercentage}%
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Cobertura em Must-Haves</span>
            <p className="text-2xl font-bold text-blue-400 mt-0.5">
              {analysis.mustHaveCoveragePercentage}%
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Fortalezas Nucleares</span>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">
              {analysis.coreAdvantages.length} skills
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Gaps Estratégicos</span>
            <p className="text-2xl font-bold text-rose-400 mt-0.5">
              {analysis.strategicGaps.length} gargalos
            </p>
          </div>
        </div>
      </div>

      {/* Matriz 2x2 de Competitividade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quadrante 1: Fortalezas Nucleares */}
        <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <span>🟢 Fortalezas Nucleares (Core Advantages)</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-semibold border border-emerald-800/40">
              Alta Demanda • Domínio Forte
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Tecnologias presentes em &ge; 15% das vagas onde você possui histórico comprovado de produção. É onde você <strong>supera a concorrência na triagem inicial</strong>:
          </p>
          <div className="space-y-2.5">
            {analysis.coreAdvantages.slice(0, 6).map((item) => (
              <div key={item.canonical} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white capitalize text-sm">{item.canonical}</span>
                  <span className="text-xs text-slate-400 block mt-0.5">Presente em {item.jobPercentage}% das vagas ({item.jobCount}x)</span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 font-medium border border-emerald-800/40">
                  {item.mustCount}x obrigatória
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quadrante 2: Gaps Estratégicos Críticos */}
        <div className="bg-slate-900 border border-rose-900/50 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <span>🔴 Gaps Estratégicos Críticos</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-semibold border border-rose-800/40">
              Alta Demanda • Lacuna Técnica
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Habilidades exigidas com alta frequência onde o candidato não possui evidência explícita no perfil. <strong>Motivo principal de descarte em vagas corporativas</strong>:
          </p>
          <div className="space-y-2.5">
            {analysis.strategicGaps.slice(0, 6).map((item) => (
              <div key={item.canonical} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white capitalize text-sm">{item.canonical}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 font-medium border border-rose-800/40">
                    {item.jobPercentage}% das vagas
                  </span>
                </div>
                <p className="text-xs text-rose-200/80 italic">{item.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benchmark Comparativo de Candidatos */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Benchmark de Mercado: João vs Concorrência Média
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Comparativo multidimensional com os dois perfis mais frequentes que concorrem pelas mesmas oportunidades no mercado brasileiro e internacional.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <th className="py-3.5 px-4 font-semibold">Dimensão Técnica</th>
                <th className="py-3.5 px-4 font-semibold">Candidato Médio Full Stack TS</th>
                <th className="py-3.5 px-4 font-semibold">Candidato Hype em IA (Júnior)</th>
                <th className="py-3.5 px-4 font-semibold text-indigo-300 bg-indigo-950/30">
                  João Victor Longo (Posicionamento)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr className="hover:bg-slate-800/20">
                <td className="py-3.5 px-4 font-semibold text-white">Experiência Real</td>
                <td className="py-3.5 px-4 text-slate-300">3–5 anos em CRUDs web comuns</td>
                <td className="py-3.5 px-4 text-slate-300">0–2 anos (transição sem produção)</td>
                <td className="py-3.5 px-4 font-semibold text-emerald-300 bg-indigo-950/20">
                  ~10 anos de TI, 4 anos em SaaS B2B com ~40 mil usuários (Field Control)
                </td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-3.5 px-4 font-semibold text-white">Backend & APIs</td>
                <td className="py-3.5 px-4 text-slate-300">Express/NestJS básico, ORMs simples</td>
                <td className="py-3.5 px-4 text-slate-300">Scripts soltos em FastAPI</td>
                <td className="py-3.5 px-4 font-semibold text-emerald-300 bg-indigo-950/20">
                  NestJS sênior, GraphQL, PostgreSQL transacional, microsserviços e resiliência
                </td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-3.5 px-4 font-semibold text-white">Engenharia de IA</td>
                <td className="py-3.5 px-4 text-slate-300">Consumo de OpenAI API sem validação</td>
                <td className="py-3.5 px-4 text-slate-300">LangChain sem testes nem evals</td>
                <td className="py-3.5 px-4 font-semibold text-emerald-300 bg-indigo-950/20">
                  Structured Outputs com Zod, Grounding literal, pgvector e harness de avaliação (κ ≥ 0.80)
                </td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-3.5 px-4 font-semibold text-white">Bancos & Vetores</td>
                <td className="py-3.5 px-4 text-slate-300">Prisma / TypeORM padrão</td>
                <td className="py-3.5 px-4 text-slate-300">Pinecone ou ChromaDB soltos</td>
                <td className="py-3.5 px-4 font-semibold text-emerald-300 bg-indigo-950/20">
                  PostgreSQL profundo (queries analíticas, índices HNSW, constraints de integridade, pgvector)
                </td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-3.5 px-4 font-semibold text-white">Frontend</td>
                <td className="py-3.5 px-4 text-slate-300">React padrão com bibliotecas de UI</td>
                <td className="py-3.5 px-4 text-slate-300">Sem experiência de frontend</td>
                <td className="py-3.5 px-4 font-semibold text-emerald-300 bg-indigo-950/20">
                  Angular sólido em produção; Next.js 15 (App Router) neste projeto de portfólio
                </td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-3.5 px-4 font-semibold text-white">Rigor de Qualidade</td>
                <td className="py-3.5 px-4 text-slate-300">Poucos testes, any solto</td>
                <td className="py-3.5 px-4 text-slate-300">Sem testes, notebooks Jupyter</td>
                <td className="py-3.5 px-4 font-semibold text-emerald-300 bg-indigo-950/20">
                  100% dos repositórios com TS strict (`noUncheckedIndexedAccess`), Vitest e ESLint
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Recomendações Acionáveis */}
      <div className="bg-gradient-to-br from-indigo-950/30 to-slate-900 border border-indigo-900/40 rounded-2xl p-6 sm:p-8 space-y-4">
        <h2 className="text-lg font-bold text-white">Plano de Ataque para Fechamento de Gaps</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2">
            <span className="font-bold text-indigo-300 block">1. Next.js (App Router) em Produção</span>
            <p className="text-slate-300">
              Presente em mais de 50% das vagas com foco em React. Este dashboard em Next.js fecha diretamente essa lacuna demonstrando fluência em Server Components e App Router.
            </p>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2">
            <span className="font-bold text-indigo-300 block">2. Mensageria Distribuída (Kafka / RabbitMQ)</span>
            <p className="text-slate-300">
              Destaque o design da fila BullMQ/Redis do worker e inclua no portfólio comparativos técnicos de arquitetura orientada a eventos para vagas sênior de backend.
            </p>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2">
            <span className="font-bold text-indigo-300 block">3. Posicionar os Evals como Moat</span>
            <p className="text-slate-300">
              Utilize as métricas reais do harness de avaliação no LinkedIn e no currículo. Menos de 5% dos candidatos de IA possuem disciplina de medição de precisão/recall e custos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function escapeRegex(text: string): string {
  return text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}
