import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchJobById } from '@/lib/db';
import { evaluateJobFit } from '@/lib/matching';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const job = await fetchJobById(id);

  if (!job) {
    notFound();
  }

  const reqsForFit = job.requirements.map((r) => ({ canonical: r.canonical, kind: r.kind }));
  const fit = await evaluateJobFit(job.id, reqsForFit);

  const mustReqs = job.requirements.filter((r) => r.kind === 'must');
  const niceReqs = job.requirements.filter((r) => r.kind === 'nice');

  return (
    <div className="space-y-8">
      {/* Voltar */}
      <div>
        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
        >
          ← Voltar para lista de vagas
        </Link>
      </div>

      {/* Header da Vaga */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {job.title}
              </h1>
              <span className="text-xs px-2.5 py-1 rounded uppercase font-semibold tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                {job.source}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400">
              {job.company && (
                <span>
                  Empresa: <strong className="text-slate-200">{job.company}</strong>
                </span>
              )}
              <span>
                Senioridade: <strong className="text-slate-200">{job.seniority ?? 'N/D'}</strong>
              </span>
              <span>
                Modelo: <strong className="text-slate-200">{job.workModel ?? 'N/D'}</strong>
              </span>
              <span>
                Idioma: <strong className="text-slate-200">{job.lang.toUpperCase()}</strong>
              </span>
              {job.yearsRequired !== null && (
                <span>
                  Experiência Mínima: <strong className="text-slate-200">{job.yearsRequired} anos</strong>
                </span>
              )}
            </div>

            {/* Salário verificado */}
            {job.salaryPublished ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs">
                <span>✓ Salário com Grounding Verificado:</span>
                <strong>
                  {job.salaryCurrency} {job.salaryMin?.toLocaleString()} - {job.salaryMax?.toLocaleString()} /{' '}
                  {job.salaryPeriod}
                </strong>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                Remuneração não publicada na descrição (gate duro de zero alucinação ativo).
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="p-4 rounded-xl border border-slate-700/80 bg-slate-800/40 text-center min-w-[140px]">
              <span className="text-xs text-slate-400 font-medium">Fit com o João</span>
              <div className="text-3xl font-bold text-emerald-400 mt-1">
                {fit.scoreResult.score}%
              </div>
              <span className="text-[11px] text-slate-400">
                {fit.scoreResult.matchedMust}/{fit.scoreResult.totalMust} must-haves
              </span>
            </div>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              Ver Vaga Original ↗
            </a>
          </div>
        </div>
      </div>

      {/* Grid de Requisitos e Evidências */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Requisitos Obrigatórios */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Requisitos Obrigatórios (Must-Have)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {mustReqs.length}
              </span>
            </h2>
          </div>

          <div className="space-y-3">
            {mustReqs.map((req) => {
              const match = fit.matchedRequirements.find((m) => m.requirement === req.canonical);
              const isMatched = Boolean(match);

              return (
                <div
                  key={req.id}
                  className={`border rounded-xl p-4 transition-all ${
                    isMatched
                      ? 'bg-slate-900/90 border-emerald-900/40'
                      : 'bg-slate-900/90 border-rose-900/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${isMatched ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isMatched ? '✓' : '✗'}
                      </span>
                      <strong className="text-white text-sm capitalize">{req.canonical}</strong>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {req.category}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        isMatched
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                          : 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                      }`}
                    >
                      {isMatched ? 'Comprovado' : 'Gap'}
                    </span>
                  </div>

                  {/* Evidência no Perfil do João */}
                  {match?.evidence && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-xs text-slate-300">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Evidência no Perfil do João:
                      </span>
                      <p className="italic text-emerald-200/90 mt-0.5">{match.evidence}</p>
                    </div>
                  )}

                  {/* Trecho Literal na Vaga (Grounding) */}
                  <div className="mt-2 pt-2 border-t border-slate-800/40 text-xs text-slate-400">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Trecho Extraído da Vaga (Grounding Literal):
                    </span>
                    <p className="font-mono text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded mt-1 border border-slate-800/60">
                      &quot;{req.evidenceSpan}&quot;
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Requisitos Desejáveis & Análise de Gaps */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Requisitos Desejáveis (Nice-to-Have)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {niceReqs.length}
              </span>
            </h2>

            {niceReqs.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Nenhum diferencial listado nesta vaga.</p>
            ) : (
              <div className="space-y-3">
                {niceReqs.map((req) => {
                  const match = fit.matchedRequirements.find((m) => m.requirement === req.canonical);
                  const isMatched = Boolean(match);

                  return (
                    <div
                      key={req.id}
                      className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-200 font-medium capitalize">
                          {isMatched ? '✓' : '•'} {req.canonical}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            isMatched
                              ? 'bg-blue-950/60 text-blue-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isMatched ? 'Diferencial Atendido' : 'Opcional'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">&quot;{req.evidenceSpan}&quot;</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Plano de Abordagem para esta vaga */}
          <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-900/40 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-indigo-300">
              Estratégia Recomendada para Entrevista Técnica
            </h3>
            <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
              <li>
                <strong>Destaque inicial:</strong> Valorize a experiência sólida de 4 anos em SaaS B2B com ~40 mil usuários na Field Control.
              </li>
              <li>
                <strong>Diferencial técnico:</strong> Demonstre o uso de TypeScript estrito sem <code className="text-indigo-300">any</code>, autenticação OAuth PKCE e resiliência de rede.
              </li>
              {fit.gapRequirements.length > 0 && (
                <li>
                  <strong>Para contornar os gaps:</strong> Mostre facilidade de curva de aprendizado nas lacunas ({fit.gapRequirements.slice(0, 3).map((g) => g.requirement).join(', ')}), apoiando-se na sólida base de engenharia de software e banco relacional.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Descrição Completa */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <h2 className="text-lg font-bold text-white">Descrição Completa da Vaga</h2>
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800/80 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
          {job.description}
        </div>
      </div>
    </div>
  );
}
