import Link from 'next/link';
import { fetchJobsList } from '@/lib/db';
import { evaluateJobFit } from '@/lib/matching';

interface PageProps {
  searchParams: Promise<{
    seniority?: string;
    workModel?: string;
    search?: string;
  }>;
}

export default async function JobsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const jobs = await fetchJobsList(resolvedParams);

  // Calcula fit para cada vaga
  const jobsWithFit = await Promise.all(
    jobs.map(async (job) => {
      const reqsForFit = job.skills.map((s) => ({ canonical: s, kind: 'must' as const }));
      const fit = await evaluateJobFit(job.id, reqsForFit);
      return {
        ...job,
        fit,
      };
    }),
  );

  // Ordena por Fit Score decrescente
  jobsWithFit.sort((a, b) => b.fit.scoreResult.score - a.fit.scoreResult.score);

  const highFitCount = jobsWithFit.filter((j) => j.fit.scoreResult.fitLevel === 'high').length;
  const avgScore =
    jobsWithFit.length > 0
      ? Math.round(jobsWithFit.reduce((acc, j) => acc + j.fit.scoreResult.score, 0) / jobsWithFit.length)
      : 0;

  return (
    <div className="space-y-8">
      {/* Hero / Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Radar de Vagas & Compatibilidade de Carreira
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl">
              Análise comparativa em tempo real entre os requisitos extraídos das vagas e as evidências técnicas do perfil do <strong>João Victor Longo</strong>, com RAG no pgvector e identificação de lacunas.
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/gaps"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors text-center"
            >
              Ver Análise de Gaps
            </Link>
            <Link
              href="/evals"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg border border-slate-700 transition-colors text-center"
            >
              Métricas do Modelo
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div>
            <span className="text-xs text-slate-400">Vagas Analisadas</span>
            <p className="text-2xl font-bold text-white mt-0.5">{jobs.length}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Alto Fit (&ge; 75%)</span>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">{highFitCount}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Score Médio de Fit</span>
            <p className="text-2xl font-bold text-blue-400 mt-0.5">{avgScore}%</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Extrator Ativo</span>
            <p className="text-sm font-mono text-slate-300 mt-1">extract-v2 (Qwen)</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-slate-400 self-center mr-1">Senioridade:</span>
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-lg border ${
              !resolvedParams?.seniority || resolvedParams.seniority === 'all'
                ? 'bg-blue-600 border-blue-500 text-white font-medium'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Todas
          </Link>
          <Link
            href="/?seniority=senior"
            className={`px-3 py-1.5 rounded-lg border ${
              resolvedParams?.seniority === 'senior'
                ? 'bg-blue-600 border-blue-500 text-white font-medium'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Sênior
          </Link>
          <Link
            href="/?seniority=mid"
            className={`px-3 py-1.5 rounded-lg border ${
              resolvedParams?.seniority === 'mid'
                ? 'bg-blue-600 border-blue-500 text-white font-medium'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Pleno
          </Link>
          <Link
            href="/?seniority=lead"
            className={`px-3 py-1.5 rounded-lg border ${
              resolvedParams?.seniority === 'lead'
                ? 'bg-blue-600 border-blue-500 text-white font-medium'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Lead
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-slate-400 self-center mr-1">Regime:</span>
          <Link
            href="/?workModel=remote"
            className={`px-3 py-1.5 rounded-lg border ${
              resolvedParams?.workModel === 'remote'
                ? 'bg-indigo-600 border-indigo-500 text-white font-medium'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Remoto
          </Link>
          <Link
            href="/?workModel=hybrid"
            className={`px-3 py-1.5 rounded-lg border ${
              resolvedParams?.workModel === 'hybrid'
                ? 'bg-indigo-600 border-indigo-500 text-white font-medium'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Híbrido
          </Link>
          <Link
            href="/?workModel=onsite"
            className={`px-3 py-1.5 rounded-lg border ${
              resolvedParams?.workModel === 'onsite'
                ? 'bg-indigo-600 border-indigo-500 text-white font-medium'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Presencial
          </Link>
        </div>
      </div>

      {/* Lista de Vagas */}
      <div className="space-y-4">
        {jobsWithFit.map((job) => {
          const score = job.fit.scoreResult.score;
          let fitBadgeClass = 'bg-rose-950/60 text-rose-300 border-rose-800/50';
          let fitLabel = 'Baixo Fit';
          if (score >= 75) {
            fitBadgeClass = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50';
            fitLabel = 'Alto Fit';
          } else if (score >= 50) {
            fitBadgeClass = 'bg-amber-950/60 text-amber-300 border-amber-800/50';
            fitLabel = 'Médio Fit';
          }

          return (
            <div
              key={job.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition-all shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-lg font-semibold text-white hover:text-blue-400 transition-colors"
                    >
                      {job.title}
                    </Link>
                    <span className="text-xs px-2 py-0.5 rounded uppercase font-semibold tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                      {job.source}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    {job.company && <span>Empresa: {job.company}</span>}
                    <span>Senioridade: <strong className="text-slate-300">{job.seniority ?? 'N/D'}</strong></span>
                    <span>Modelo: <strong className="text-slate-300">{job.workModel ?? 'N/D'}</strong></span>
                    {job.yearsRequired !== null && (
                      <span>Anos Req.: <strong className="text-slate-300">{job.yearsRequired} anos</strong></span>
                    )}
                    {job.salaryPublished && (
                      <span className="text-emerald-400 font-semibold">
                        Salário: {job.salaryCurrency} {job.salaryMin?.toLocaleString()} - {job.salaryMax?.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 self-start sm:self-center">
                  <div className={`px-3 py-1.5 rounded-lg border text-center ${fitBadgeClass}`}>
                    <div className="text-xs font-semibold">{fitLabel}</div>
                    <div className="text-xl font-bold">{score}%</div>
                  </div>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                  >
                    Ver Detalhes →
                  </Link>
                </div>
              </div>

              {/* Tags de Requisitos e Gaps */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap gap-1.5">
                {job.fit.matchedRequirements.slice(0, 6).map((m) => (
                  <span
                    key={m.requirement}
                    className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/30 flex items-center gap-1"
                  >
                    <span>✓</span> {m.requirement}
                  </span>
                ))}
                {job.fit.gapRequirements.slice(0, 4).map((g) => (
                  <span
                    key={g.requirement}
                    className="text-[11px] px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-800/30 flex items-center gap-1"
                  >
                    <span>✗</span> {g.requirement} (gap)
                  </span>
                ))}
                {job.fit.matchedRequirements.length + job.fit.gapRequirements.length > 10 && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    +{job.fit.matchedRequirements.length + job.fit.gapRequirements.length - 10} mais
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {jobsWithFit.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
            Nenhuma vaga encontrada com os filtros selecionados.
          </div>
        )}
      </div>
    </div>
  );
}
