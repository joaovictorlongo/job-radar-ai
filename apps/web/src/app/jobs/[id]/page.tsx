import Link from 'next/link';
import { notFound } from 'next/navigation';
import { classifyJobTrack, TRACK_LABELS } from '@job-radar/shared';
import { fetchJobById } from '@/lib/db';
import { evaluateJobFit } from '@/lib/matching';

export const dynamic = 'force-dynamic';

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

  const reqsInput = job.requirements.map((r) => ({
    canonical: r.canonical,
    kind: r.kind,
    category: r.category,
    evidenceSpan: r.evidenceSpan,
  }));

  const track = classifyJobTrack({
    title: job.title,
    seniority: job.seniority,
    requirements: reqsInput,
  });

  const fit = evaluateJobFit(job.id, reqsInput);

  const mustReqs = fit.allRequirements.filter((r) => r.kind === 'must');
  const niceReqs = fit.allRequirements.filter((r) => r.kind === 'nice');

  return (
    <div className="space-y-8">
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
              <span
                className={`text-xs px-2.5 py-1 rounded font-semibold border ${
                  track.inTargetScope
                    ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {TRACK_LABELS[track.primaryTrack].label}
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
                  Experiência Mínima:{' '}
                  <strong className="text-slate-200">{job.yearsRequired} anos</strong>
                </span>
              )}
            </div>

            {job.salaryPublished ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs">
                <span>✓ Salário com Grounding Verificado:</span>
                <strong>
                  {job.salaryCurrency} {job.salaryMin?.toLocaleString()} -{' '}
                  {job.salaryMax?.toLocaleString()} / {job.salaryPeriod}
                </strong>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                Remuneração não publicada na descrição (gate duro de zero alucinação ativo).
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="p-4 rounded-xl border border-slate-700/80 bg-slate-800/40 text-center min-w-[160px]">
              <span className="text-xs text-slate-400 font-medium">Fit Ponderado</span>
              <div className="text-3xl font-bold text-emerald-400 mt-1">{fit.score}%</div>
              <span className="text-[11px] text-slate-400 block">
                {fit.mustStrong} prod • {fit.mustPartial} parc • {fit.mustGap} gap
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

      {/* Requisitos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Requisitos Obrigatórios (Normalizados)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {mustReqs.length}
              </span>
            </h2>
          </div>

          <div className="space-y-3">
            {mustReqs.map((req) => {
              const borderClass =
                req.status === 'strong'
                  ? 'border-emerald-900/40'
                  : req.status === 'partial'
                    ? 'border-amber-900/40'
                    : 'border-rose-900/40';
              const badgeClass =
                req.status === 'strong'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                  : req.status === 'partial'
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-800/40';
              const icon = req.status === 'strong' ? '✓' : req.status === 'partial' ? '◐' : '✗';
              const iconColor =
                req.status === 'strong'
                  ? 'text-emerald-400'
                  : req.status === 'partial'
                    ? 'text-amber-400'
                    : 'text-rose-400';

              return (
                <div
                  key={`must-${req.requirement}`}
                  className={`border rounded-xl p-4 bg-slate-900/90 ${borderClass}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${iconColor}`}>{icon}</span>
                      <strong className="text-white text-sm capitalize">{req.requirement}</strong>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {req.cluster}
                      </span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${badgeClass}`}>
                      {req.proficiencyLabel}
                    </span>
                  </div>

                  {req.evidence && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-xs text-slate-300">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Evidência no Perfil do João:
                      </span>
                      <p className="italic text-emerald-200/90 mt-0.5">{req.evidence}</p>
                    </div>
                  )}

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
                {niceReqs.map((req) => (
                  <div
                    key={`nice-${req.requirement}`}
                    className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200 font-medium capitalize">
                        {req.status === 'strong' ? '✓' : req.status === 'partial' ? '◐' : '•'}{' '}
                        {req.requirement}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          req.status === 'strong'
                            ? 'bg-emerald-950/60 text-emerald-300'
                            : req.status === 'partial'
                              ? 'bg-amber-950/60 text-amber-300'
                              : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {req.proficiencyLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">&quot;{req.evidenceSpan}&quot;</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-900/40 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-indigo-300">
              Preparação Direcionada para esta Vaga
            </h3>
            <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
              {fit.strongRequirements.length > 0 && (
                <li>
                  <strong>Apoie a narrativa nas suas fortalezas de produção:</strong>{' '}
                  {fit.strongRequirements
                    .slice(0, 4)
                    .map((r) => r.requirement)
                    .join(', ')}
                  .
                </li>
              )}
              {fit.partialRequirements.length > 0 && (
                <li>
                  <strong>Aprofunde antes da entrevista (Quick Wins):</strong>{' '}
                  {fit.partialRequirements.map((r) => r.requirement).join(', ')}.
                </li>
              )}
              {fit.gapRequirements.length > 0 && (
                <li>
                  <strong>Gaps reais para mapear / estudar:</strong>{' '}
                  {fit.gapRequirements
                    .slice(0, 4)
                    .map((g) => g.requirement)
                    .join(', ')}
                  .
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
