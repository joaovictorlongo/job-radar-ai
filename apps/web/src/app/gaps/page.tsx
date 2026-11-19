import Link from 'next/link';
import {
  analyzeStudyIntelligence,
  proficiencyLabelPtBr,
  TRACK_LABELS,
  type StudyHorizon,
  type TrackFilter,
} from '@job-radar/shared';
import { fetchStudyJobs } from '@/lib/db';
import { loadProfileSkills } from '@/lib/profile';

export const dynamic = 'force-dynamic';

interface GapsPageProps {
  searchParams: Promise<{
    track?: string;
  }>;
}

const VALID_TRACK_FILTERS: readonly TrackFilter[] = [
  'target',
  'fullstack_ts',
  'ai_engineer',
  'backend_node_lead',
  'all',
  'out_of_scope',
];

function parseTrackFilter(raw: string | undefined): TrackFilter {
  if (raw && (VALID_TRACK_FILTERS as readonly string[]).includes(raw)) {
    return raw as TrackFilter;
  }
  return 'target';
}

function horizonBadgeClass(horizon: StudyHorizon): string {
  switch (horizon) {
    case 'quick_win':
      return 'bg-amber-950/80 text-amber-300 border-amber-700/50';
    case 'high_roi':
      return 'bg-rose-950/80 text-rose-300 border-rose-700/50';
    case 'ai_bet':
      return 'bg-indigo-950/80 text-indigo-300 border-indigo-700/50';
    case 'monitor':
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
}

export default async function GapsPage({ searchParams }: GapsPageProps) {
  const params = await searchParams;
  const trackFilter = parseTrackFilter(params.track);

  const [allJobs, { doc: profileDoc, index: profileIndex }] = await Promise.all([
    fetchStudyJobs(),
    Promise.resolve(loadProfileSkills()),
  ]);

  const report = analyzeStudyIntelligence(allJobs, profileIndex, { trackFilter });
  const trackMeta = TRACK_LABELS[trackFilter];

  const trackTabs: Array<{ id: TrackFilter; count: number }> = [
    { id: 'target', count: report.totalJobsInDatabase - report.outOfScopeJobsCount },
    { id: 'fullstack_ts', count: report.trackCounts.fullstack_ts },
    { id: 'ai_engineer', count: report.trackCounts.ai_engineer },
    { id: 'backend_node_lead', count: report.trackCounts.backend_node_lead },
    { id: 'all', count: report.totalJobsInDatabase },
    { id: 'out_of_scope', count: report.outOfScopeJobsCount },
  ];

  return (
    <div className="space-y-8">
      {/* Banner & Seletor de Trilha */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                Inteligência de Estudo & Posicionamento
              </span>
              <span className="text-xs text-slate-400">
                Base ativa: <strong className="text-slate-200">{report.analyzedJobsCount}</strong> de{' '}
                {report.totalJobsInDatabase} vagas ({report.outOfScopeJobsCount} fora de escopo separadas)
              </span>
              <span className="text-xs text-slate-500">
                • {report.filteredNoiseRequirementsCount} rótulos genéricos filtrados
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              O que Estudar para Subir de Patamar no Mercado
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl">
              Cruzamento entre as vagas da trilha <strong className="text-indigo-300">{trackMeta.label}</strong> e a
              matriz real de proficiência de <strong>{profileDoc.owner}</strong> (
              <code className="text-xs text-slate-300">profile/skills.json</code>), separando fortalezas de produção,
              gaps de profundidade (Quick Wins) e lacunas técnicas reais.
            </p>
          </div>
          <div className="shrink-0 bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 text-right">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
              Fit Médio na Trilha
            </span>
            <span className="text-3xl font-bold text-emerald-400">{report.joaoAvgFitScore}%</span>
            <span className="text-xs text-slate-400 block mt-0.5">
              {report.highFitCount} alto • {report.mediumFitCount} médio • {report.lowFitCount} baixo
            </span>
          </div>
        </div>

        {/* Filtro de Trilhas */}
        <div className="flex flex-wrap gap-2 pt-2">
          {trackTabs.map((tab) => {
            const active = trackFilter === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.id === 'target' ? '/gaps' : `/gaps?track=${tab.id}`}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors flex items-center gap-2 ${
                  active
                    ? 'bg-indigo-600 border-indigo-500 text-white font-semibold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{TRACK_LABELS[tab.id].label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    active ? 'bg-indigo-500/60 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </Link>
            );
          })}
        </div>

        {/* KPIs Reais da Trilha */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80">
          <div>
            <span className="text-xs text-slate-400">Must-Haves em Produção Sênior</span>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">
              {report.productionMustCoveragePct}%
            </p>
            <span className="text-[11px] text-slate-500">
              {report.technicalMustCoveragePct}% incluindo conhecimento parcial
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400">Gaps de Profundidade (Quick Wins)</span>
            <p className="text-2xl font-bold text-amber-400 mt-0.5">
              {report.depthGaps.length} skills
            </p>
            <span className="text-[11px] text-slate-500">Você já tem base; falta produção</span>
          </div>
          <div>
            <span className="text-xs text-slate-400">Gaps Técnicos Reais</span>
            <p className="text-2xl font-bold text-rose-400 mt-0.5">
              {report.technicalGaps.length} skills
            </p>
            <span className="text-[11px] text-slate-500">Sem evidência no perfil atual</span>
          </div>
          <div>
            <span className="text-xs text-slate-400">Fortalezas de Produção</span>
            <p className="text-2xl font-bold text-blue-400 mt-0.5">
              {report.coreAdvantages.length} skills
            </p>
            <span className="text-[11px] text-slate-500">
              +{report.differentiators.length} diferenciais de nicho (moats)
            </span>
          </div>
        </div>
      </div>

      {/* Aviso honesto de tamanho amostral quando pequeno */}
      {report.analyzedJobsCount < 15 && (
        <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl px-5 py-3.5 text-xs text-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            <strong>Nota de Rigor Estatístico:</strong> Esta trilha tem atualmente{' '}
            <strong>{report.analyzedJobsCount} vagas</strong> extraídas. Os percentuais refletem exatamente a base atual
            — ampliar a coleta para 50–100+ vagas da trilha reduzirá a variância do ranking.
          </span>
        </div>
      )}

      {/* SEÇÃO 1: Simulador de ROI por Cluster */}
      {report.clusterImpacts.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Impacto por Cluster de Estudo (Simulador de Desbloqueio)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Simulação contrafactual: quanto seu Fit Médio nesta trilha sobe se você fechar cada bloco de competências
              para nível de produção.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.clusterImpacts.slice(0, 6).map((cluster) => (
              <div
                key={cluster.cluster}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white text-sm">{cluster.cluster}</h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/40 shrink-0">
                      +{cluster.avgTrackScoreGain} pts
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Presente em{' '}
                    <strong className="text-slate-200">
                      {cluster.jobsDemandingPercentage}% ({cluster.jobsDemandingCount} vagas)
                    </strong>
                    {cluster.jobsUnlockedToHighFit > 0 && (
                      <span className="text-emerald-400 font-semibold">
                        {' '}
                        • +{cluster.jobsUnlockedToHighFit} vaga(s) viram Alto Fit (≥75%)
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cluster.skills.map((s) => (
                      <span
                        key={s}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-950 text-slate-200 border border-slate-800 capitalize"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 border-t border-slate-800/70 pt-3 leading-relaxed">
                  <strong className="text-indigo-300">Próximo passo:</strong> {cluster.recommendedAction}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SEÇÃO 2: Ranking Priorizado de Estudo com Drill-down Literal */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Ranking Prioritário de Gaps para Estudo (Ordenado por ROI)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Combina frequência como must-have, ganho simulado no Fit Score, presença em vagas Sênior/Lead e proximidade
              da sua stack atual. Clique em <em>Ver evidências nas vagas</em> para ler exatamente o que as empresas
              pediram.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {report.studyPriorities.length} lacunas ranqueadas
          </span>
        </div>

        {report.studyPriorities.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            Nenhum gap técnico identificado nesta trilha.
          </p>
        ) : (
          <div className="space-y-3">
            {report.studyPriorities.slice(0, 12).map((item, idx) => (
              <div
                key={item.skill.canonical}
                className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-mono font-bold w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 text-indigo-300 flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-base font-bold text-white capitalize">
                      {item.skill.canonical}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${horizonBadgeClass(item.horizon)}`}
                    >
                      {item.horizonLabel}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {item.skill.cluster}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Nível Atual</span>
                      <strong
                        className={
                          item.skill.userStatus === 'partial_evidence'
                            ? 'text-amber-300'
                            : 'text-rose-300'
                        }
                      >
                        {item.skill.userProficiencyLabel}
                      </strong>
                    </div>
                    <div className="text-right border-l border-slate-800 pl-3">
                      <span className="text-slate-400 block text-[10px]">Demanda</span>
                      <strong className="text-white">
                        {item.skill.jobPercentage}% ({item.skill.jobCount}x • {item.skill.mustCount} must)
                      </strong>
                    </div>
                    <div className="text-right border-l border-slate-800 pl-3">
                      <span className="text-slate-400 block text-[10px]">Ganho Simulado</span>
                      <strong className="text-emerald-400 font-mono">
                        +{item.affectedJobsAvgGain} pts/vaga
                      </strong>
                      {item.jobsUnlockedToHighFit > 0 && (
                        <span className="text-[10px] text-emerald-300 block">
                          +{item.jobsUnlockedToHighFit} Alto Fit
                        </span>
                      )}
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-center min-w-[60px]">
                      <span className="text-[10px] text-indigo-300 block">ROI</span>
                      <strong className="text-sm font-mono text-white">{item.priorityScore}</strong>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800/60">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                      Por que importa no seu posicionamento
                    </span>
                    <p className="text-slate-300 mt-0.5 leading-relaxed">{item.whyItMatters}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-indigo-400 block">
                      Projeto / Ação Prática Recomendada
                    </span>
                    <p className="text-indigo-100/90 mt-0.5 leading-relaxed">{item.studyAction}</p>
                  </div>
                </div>

                {/* Drill-down de evidências literais nas vagas */}
                <details className="pt-1">
                  <summary className="cursor-pointer text-xs text-slate-400 hover:text-indigo-300 select-none">
                    Ver evidências nas vagas ({item.skill.jobReferences.length} menções literais)
                  </summary>
                  <div className="mt-3 space-y-2">
                    {item.skill.jobReferences.map((ref, refIdx) => (
                      <div
                        key={`${ref.jobId}-${refIdx}`}
                        className="bg-slate-900 border border-slate-800/80 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/jobs/${ref.jobId}`}
                              className="font-semibold text-blue-400 hover:underline"
                            >
                              {ref.title}
                            </Link>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                                ref.kind === 'must'
                                  ? 'bg-rose-950/70 text-rose-300 border border-rose-800/40'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {ref.kind === 'must' ? 'Obrigatório' : 'Desejável'}
                            </span>
                            {ref.seniority && (
                              <span className="text-[10px] text-slate-400">{ref.seniority}</span>
                            )}
                          </div>
                          <p className="font-mono text-[11px] text-slate-300 bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800/60">
                            &quot;{ref.evidenceSpan}&quot;
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SEÇÃO 3: Matriz 2x2 Limpa (4 Buckets Reais) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Fortalezas de Produção */}
        <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-emerald-400">
              🟢 Fortalezas de Produção Sênior
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
              ≥ 20% da trilha • Produção
            </span>
          </div>
          <div className="space-y-2">
            {report.coreAdvantages.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhuma skill atingiu ≥ 20% nesta trilha.</p>
            ) : (
              report.coreAdvantages.slice(0, 8).map((item) => (
                <div
                  key={item.canonical}
                  className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-semibold text-white capitalize text-sm">
                      {item.canonical}
                    </span>
                    <span className="text-xs text-slate-400 block">
                      {item.jobPercentage}% das vagas ({item.jobCount}x) • {item.mustCount}x obrigatória
                    </span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/40 shrink-0">
                    Produção
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Gaps de Profundidade (Quick Wins) */}
        <div className="bg-slate-900 border border-amber-900/50 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-amber-400">
              🟡 Gaps de Profundidade (Quick Wins)
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/40">
              Prática / Estudo → Produção
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Skills que você já usa em portfólio/estudo mas o mercado cobra com profundidade sênior. Menor esforço para
            destravar conversão:
          </p>
          <div className="space-y-2">
            {report.depthGaps.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum gap de profundidade nesta trilha.</p>
            ) : (
              report.depthGaps.map((item) => (
                <div
                  key={item.canonical}
                  className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white capitalize text-sm">
                      {item.canonical}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/40">
                      {item.jobPercentage}% ({item.jobCount}x) • {item.userProficiencyLabel}
                    </span>
                  </div>
                  {item.evidenceSummary && (
                    <p className="text-[11px] text-slate-400">{item.evidenceSummary}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Gaps Técnicos Reais */}
        <div className="bg-slate-900 border border-rose-900/50 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-rose-400">
              🔴 Gaps Técnicos Reais da Trilha
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/40">
              Sem evidência no perfil
            </span>
          </div>
          <div className="space-y-2">
            {report.technicalGaps.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum gap técnico ausente nesta trilha.</p>
            ) : (
              report.technicalGaps.slice(0, 10).map((item) => (
                <div
                  key={item.canonical}
                  className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-semibold text-white capitalize text-sm">
                      {item.canonical}
                    </span>
                    <span className="text-xs text-slate-400 block">
                      {item.cluster} • {item.mustCount}x obrigatória, {item.niceCount}x desejável
                    </span>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-800/40 shrink-0">
                    {item.jobPercentage}% ({item.jobCount}x)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. Moats & Diferenciais */}
        <div className="bg-slate-900 border border-indigo-900/50 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-indigo-400">
              🛡️ Diferenciais & Moats Técnicos
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40">
              Produção • Baixa oferta no mercado
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Skills que você já domina e que aparecem como diferenciais decisivos em vagas específicas de Sênior/AI:
          </p>
          <div className="space-y-2">
            {report.differentiators.length === 0 ? (
              <p className="text-xs text-slate-500">
                Todas as suas fortalezas desta trilha já atingiram ≥ 20% de demanda (listadas em Fortalezas).
              </p>
            ) : (
              report.differentiators.slice(0, 8).map((item) => (
                <div
                  key={item.canonical}
                  className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-semibold text-white capitalize text-sm">
                      {item.canonical}
                    </span>
                    <span className="text-xs text-slate-400 block">{item.cluster}</span>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/40 shrink-0">
                    {item.jobPercentage}% ({item.jobCount}x)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* SEÇÃO 4: Benchmark Dinâmico contra Concorrentes */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Benchmark Competitivo Dinâmico: João vs Concorrentes na Trilha
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Calculado nas mesmas {report.analyzedJobsCount} vagas
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400 max-w-3xl">
            Os 3 perfis abaixo são <strong>arquétipos de referência calibrados</strong> avaliados pelo mesmo motor de
            pontuação nas vagas desta trilha — mostrando exatamente em quais skills reais você perde ou vence cada
            perfil concorrente.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {report.competitorBenchmarks.map((bench) => {
            const joaoLeads = bench.scoreDelta >= 0;
            return (
              <div
                key={bench.archetype.id}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-white text-sm">{bench.archetype.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{bench.archetype.subtitle}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-900 p-3 rounded-lg border border-slate-800 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block">João</span>
                      <strong className="text-base text-white font-mono">
                        {bench.joaoAvgScore}%
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Concorrente</span>
                      <strong className="text-base text-slate-300 font-mono">
                        {bench.competitorAvgScore}%
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Delta</span>
                      <strong
                        className={`text-base font-mono ${
                          joaoLeads ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {bench.scoreDelta >= 0 ? `+${bench.scoreDelta}` : bench.scoreDelta}
                      </strong>
                    </div>
                  </div>

                  {/* Onde o concorrente passa à frente */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-rose-300 block">
                      Onde este concorrente te supera ({bench.competitorAdvantages.length}):
                    </span>
                    {bench.competitorAdvantages.length === 0 ? (
                      <p className="text-[11px] text-slate-500">
                        Nenhuma vantagem técnica sobre você nesta trilha.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {bench.competitorAdvantages.slice(0, 8).map((edge) => (
                          <span
                            key={edge.canonical}
                            title={`Você: ${proficiencyLabelPtBr(edge.joaoProficiency)} | Concorrente: ${proficiencyLabelPtBr(edge.competitorProficiency)}`}
                            className="text-[11px] px-2 py-0.5 rounded bg-rose-950/50 text-rose-200 border border-rose-800/40 capitalize"
                          >
                            {edge.canonical} ({edge.jobCount}x)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Onde o João supera o concorrente */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-emerald-300 block">
                      Onde você supera este concorrente ({bench.joaoAdvantages.length}):
                    </span>
                    {bench.joaoAdvantages.length === 0 ? (
                      <p className="text-[11px] text-slate-500">Sem vantagem medida nesta trilha.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {bench.joaoAdvantages.slice(0, 8).map((edge) => (
                          <span
                            key={edge.canonical}
                            className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-200 border border-emerald-800/40 capitalize"
                          >
                            {edge.canonical} ({edge.jobCount}x)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 border-t border-slate-800/70 pt-3">
                  Alto Fit (≥75%): <strong className="text-white">João {bench.joaoHighFitCount}</strong> vs{' '}
                  <strong className="text-slate-300">Concorrente {bench.competitorHighFitCount}</strong>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SEÇÃO 5: Soft Skills & Idiomas (Separados) + Transparência das Vagas Fora de Escopo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <h2 className="text-base font-bold text-white">
            Soft Skills & Idiomas (Separados da Stack Técnica)
          </h2>
          <p className="text-xs text-slate-400">
            Isolados para não inflar nem distorcer seus gaps técnicos de estudo:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {report.softSkills.length === 0 ? (
              <span className="text-xs text-slate-500">Nenhuma soft skill extraída nesta trilha.</span>
            ) : (
              report.softSkills.map((s) => (
                <span
                  key={s.canonical}
                  className={`text-xs px-2.5 py-1 rounded-lg border capitalize ${
                    s.userStatus === 'strong_evidence'
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                      : s.userStatus === 'partial_evidence'
                        ? 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {s.canonical} • {s.jobPercentage}% ({s.jobCount}x)
                </span>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <h2 className="text-base font-bold text-white">
            Transparência de Filtragem ({report.outOfScopeJobsCount} vagas fora de escopo)
          </h2>
          <p className="text-xs text-slate-400">
            Vagas separadas automaticamente para evitar falsos gaps como C#, SAP, PHP ou estágio:
          </p>
          <details>
            <summary className="cursor-pointer text-xs text-indigo-300 hover:text-indigo-200 select-none">
              Inspecionar lista de vagas fora de escopo e motivo
            </summary>
            <ul className="mt-3 space-y-1.5 text-xs max-h-56 overflow-y-auto pr-1">
              {report.outOfScopeJobs.map((j) => (
                <li
                  key={j.id}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
                >
                  <Link href={`/jobs/${j.id}`} className="text-slate-200 hover:text-blue-400 truncate">
                    {j.title}
                  </Link>
                  <span className="text-[11px] text-slate-400 shrink-0">{j.reason}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
