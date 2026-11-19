import Link from 'next/link';
import {
  classifyJobTrack,
  jobMatchesTrackFilter,
  TRACK_LABELS,
  type TrackFilter,
} from '@job-radar/shared';
import { fetchJobsList } from '@/lib/db';
import { evaluateJobFit } from '@/lib/matching';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    seniority?: string;
    workModel?: string;
    track?: string;
    search?: string;
  }>;
}

const VALID_TRACKS: readonly TrackFilter[] = [
  'target',
  'fullstack_ts',
  'ai_engineer',
  'backend_node_lead',
  'all',
  'out_of_scope',
];

function parseTrack(raw: string | undefined): TrackFilter {
  if (raw && (VALID_TRACKS as readonly string[]).includes(raw)) {
    return raw as TrackFilter;
  }
  return 'target';
}

function buildHref(
  current: { seniority?: string; workModel?: string; track?: string },
  updates: Partial<{ seniority?: string; workModel?: string; track?: string }>,
): string {
  const merged = { ...current, ...updates };
  const qs = new URLSearchParams();
  if (merged.track && merged.track !== 'target') qs.set('track', merged.track);
  if (merged.seniority && merged.seniority !== 'all') qs.set('seniority', merged.seniority);
  if (merged.workModel && merged.workModel !== 'all') qs.set('workModel', merged.workModel);
  const str = qs.toString();
  return str.length > 0 ? `/?${str}` : '/';
}

export default async function JobsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const trackFilter = parseTrack(resolvedParams.track);
  const jobs = await fetchJobsList(resolvedParams);

  const jobsWithTrackAndFit = jobs.map((job) => {
    const track = classifyJobTrack({
      title: job.title,
      seniority: job.seniority,
      requirements: job.requirements,
    });
    const fit = evaluateJobFit(job.id, job.requirements);
    return {
      ...job,
      track,
      fit,
    };
  });

  const targetCount = jobsWithTrackAndFit.filter((j) => j.track.inTargetScope).length;
  const outOfScopeCount = jobsWithTrackAndFit.length - targetCount;

  const filteredJobs = jobsWithTrackAndFit
    .filter((j) => jobMatchesTrackFilter(j.track, trackFilter))
    .sort((a, b) => b.fit.score - a.fit.score);

  const highFitCount = filteredJobs.filter((j) => j.fit.fitLevel === 'high').length;
  const avgScore =
    filteredJobs.length > 0
      ? Math.round(
          (filteredJobs.reduce((acc, j) => acc + j.fit.score, 0) / filteredJobs.length) * 10,
        ) / 10
      : 0;

  const currentParams = {
    seniority: resolvedParams.seniority,
    workModel: resolvedParams.workModel,
    track: trackFilter,
  };

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
              Scoring ponderado por nível de proficiência (produção vs parcial vs gap) com requisitos normalizados
              contra o perfil estruturado de <strong>João Victor Longo</strong>.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={trackFilter === 'target' ? '/gaps' : `/gaps?track=${trackFilter}`}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors text-center"
            >
              Plano de Estudo & Gaps
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
            <span className="text-xs text-slate-400">Vagas na Trilha</span>
            <p className="text-2xl font-bold text-white mt-0.5">
              {filteredJobs.length}
              <span className="text-xs text-slate-500 font-normal ml-1.5">
                / {jobs.length} total
              </span>
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Alto Fit (&ge; 75%)</span>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">{highFitCount}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Score Médio na Trilha</span>
            <p className="text-2xl font-bold text-blue-400 mt-0.5">{avgScore}%</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Fora de Escopo Filtradas</span>
            <p className="text-2xl font-bold text-slate-400 mt-0.5">{outOfScopeCount}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2 text-xs items-center">
          <span className="text-slate-400 mr-1">Trilha:</span>
          {(['target', 'fullstack_ts', 'ai_engineer', 'backend_node_lead', 'all'] as const).map(
            (t) => (
              <Link
                key={t}
                href={buildHref(currentParams, { track: t })}
                className={`px-3 py-1.5 rounded-lg border ${
                  trackFilter === t
                    ? 'bg-indigo-600 border-indigo-500 text-white font-medium'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {TRACK_LABELS[t].label}
              </Link>
            ),
          )}
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-between pt-2 border-t border-slate-800/60">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-slate-400 self-center mr-1">Senioridade:</span>
            {([
              { id: 'all', label: 'Todas' },
              { id: 'senior', label: 'Sênior' },
              { id: 'mid', label: 'Pleno' },
              { id: 'lead', label: 'Lead' },
            ] as const).map((s) => {
              const active =
                s.id === 'all'
                  ? !resolvedParams.seniority || resolvedParams.seniority === 'all'
                  : resolvedParams.seniority === s.id;
              return (
                <Link
                  key={s.id}
                  href={buildHref(currentParams, { seniority: s.id })}
                  className={`px-3 py-1.5 rounded-lg border ${
                    active
                      ? 'bg-blue-600 border-blue-500 text-white font-medium'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {s.label}
                </Link>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-slate-400 self-center mr-1">Regime:</span>
            {([
              { id: 'all', label: 'Todos' },
              { id: 'remote', label: 'Remoto' },
              { id: 'hybrid', label: 'Híbrido' },
              { id: 'onsite', label: 'Presencial' },
            ] as const).map((w) => {
              const active =
                w.id === 'all'
                  ? !resolvedParams.workModel || resolvedParams.workModel === 'all'
                  : resolvedParams.workModel === w.id;
              return (
                <Link
                  key={w.id}
                  href={buildHref(currentParams, { workModel: w.id })}
                  className={`px-3 py-1.5 rounded-lg border ${
                    active
                      ? 'bg-indigo-600 border-indigo-500 text-white font-medium'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {w.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lista de Vagas */}
      <div className="space-y-4">
        {filteredJobs.map((job) => {
          const score = job.fit.score;
          let fitBadgeClass = 'bg-rose-950/60 text-rose-300 border-rose-800/50';
          let fitLabel = 'Baixo Fit';
          if (score >= 75) {
            fitBadgeClass = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50';
            fitLabel = 'Alto Fit';
          } else if (score >= 55) {
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
                    <span className="text-[10px] px-2 py-0.5 rounded uppercase font-semibold tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                      {job.source}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                        job.track.inTargetScope
                          ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {TRACK_LABELS[job.track.primaryTrack].label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    {job.company && <span>Empresa: {job.company}</span>}
                    <span>
                      Senioridade: <strong className="text-slate-300">{job.seniority ?? 'N/D'}</strong>
                    </span>
                    <span>
                      Modelo: <strong className="text-slate-300">{job.workModel ?? 'N/D'}</strong>
                    </span>
                    {job.yearsRequired !== null && (
                      <span>
                        Anos Req.: <strong className="text-slate-300">{job.yearsRequired} anos</strong>
                      </span>
                    )}
                    <span>
                      Must-Haves:{' '}
                      <strong className="text-emerald-300">{job.fit.mustStrong} produção</strong>
                      {job.fit.mustPartial > 0 && (
                        <strong className="text-amber-300"> + {job.fit.mustPartial} parcial</strong>
                      )}
                      <span className="text-slate-500"> / {job.fit.mustTotal}</span>
                    </span>
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

              {/* Tags: Produção / Parcial / Gap */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap gap-1.5">
                {job.fit.strongRequirements.slice(0, 5).map((m) => (
                  <span
                    key={`strong-${m.requirement}`}
                    className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/30 flex items-center gap-1"
                  >
                    <span>✓</span> {m.requirement}
                  </span>
                ))}
                {job.fit.partialRequirements.slice(0, 3).map((p) => (
                  <span
                    key={`partial-${p.requirement}`}
                    className="text-[11px] px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/30 flex items-center gap-1"
                  >
                    <span>◐</span> {p.requirement} (parcial)
                  </span>
                ))}
                {job.fit.gapRequirements.slice(0, 4).map((g) => (
                  <span
                    key={`gap-${g.requirement}`}
                    className="text-[11px] px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-800/30 flex items-center gap-1"
                  >
                    <span>✗</span> {g.requirement} (gap)
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        {filteredJobs.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
            Nenhuma vaga encontrada com os filtros selecionados.
          </div>
        )}
      </div>
    </div>
  );
}
