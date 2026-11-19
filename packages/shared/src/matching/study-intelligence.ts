import type { RequirementCategory } from '../domain/requirements.js';
import {
  PROFICIENCY_SCORE_WEIGHT,
  proficiencyLabelPtBr,
  proficiencyToUserStatus,
  type ProfileSkillEntry,
  type SkillProficiency,
} from '../profile/skills-schema.js';
import { COMPETITOR_ARCHETYPES, type CompetitorArchetype } from './competitors.js';
import { normalizeSkillForAnalysis, type SkillCluster } from './taxonomy.js';
import {
  classifyJobTrack,
  jobMatchesTrackFilter,
  type JobTrack,
  type JobTrackClassification,
  type TrackFilter,
} from './tracks.js';
import type { SkillUserStatus } from './gap-analysis.js';

export interface StudyJobRequirementInput {
  canonical: string;
  kind: 'must' | 'nice';
  category?: string;
  evidenceSpan?: string;
}

export interface StudyJobInput {
  id: string;
  title: string;
  company: string | null;
  source: string;
  url: string;
  seniority: string | null;
  workModel: string | null;
  salaryPublished: boolean;
  requirements: readonly StudyJobRequirementInput[];
}

export interface NormalizedJobRequirement {
  canonical: string;
  category: RequirementCategory;
  cluster: SkillCluster;
  kind: 'must' | 'nice';
  evidenceSpan: string;
}

export interface JobSkillReference {
  jobId: string;
  title: string;
  company: string | null;
  seniority: string | null;
  workModel: string | null;
  kind: 'must' | 'nice';
  evidenceSpan: string;
}

export type StudyHorizon = 'quick_win' | 'high_roi' | 'ai_bet' | 'monitor';

export interface AnalyzedSkillDemand {
  canonical: string;
  category: RequirementCategory;
  cluster: SkillCluster;
  jobCount: number;
  jobPercentage: number;
  mustCount: number;
  niceCount: number;
  seniorOrLeadCount: number;
  remoteOrUsdCount: number;
  userProficiency: SkillProficiency;
  userProficiencyLabel: string;
  userStatus: SkillUserStatus;
  evidenceSummary: string | null;
  jobReferences: readonly JobSkillReference[];
}

export interface StudyPriorityItem {
  skill: AnalyzedSkillDemand;
  priorityScore: number; // 0 a 100
  horizon: StudyHorizon;
  horizonLabel: string;
  avgTrackScoreGain: number; // pontos percentuais médios ganhos na trilha
  affectedJobsAvgGain: number; // pontos percentuais ganhos nas vagas que pedem essa skill
  jobsImprovedCount: number;
  jobsUnlockedToHighFit: number;
  jobsUnlockedToMediumFit: number;
  studyAction: string;
  whyItMatters: string;
}

export interface ClusterStudyImpact {
  cluster: SkillCluster;
  skills: readonly string[];
  gapSkillsCount: number;
  jobsDemandingCount: number;
  jobsDemandingPercentage: number;
  avgTrackScoreGain: number;
  jobsUnlockedToHighFit: number;
  recommendedAction: string;
}

export interface EvaluatedJobFitSummary {
  jobId: string;
  title: string;
  company: string | null;
  source: string;
  url: string;
  seniority: string | null;
  workModel: string | null;
  track: JobTrackClassification;
  score: number; // 0 a 100
  fitLevel: 'high' | 'medium' | 'low';
  mustTotal: number;
  mustStrong: number;
  mustPartial: number;
  mustGap: number;
  niceTotal: number;
  niceStrong: number;
  nicePartial: number;
  niceGap: number;
}

export interface CompetitorSkillEdge {
  canonical: string;
  cluster: SkillCluster;
  jobCount: number;
  jobPercentage: number;
  joaoProficiency: SkillProficiency;
  competitorProficiency: SkillProficiency;
}

export interface CompetitorBenchmarkResult {
  archetype: CompetitorArchetype;
  competitorAvgScore: number;
  joaoAvgScore: number;
  scoreDelta: number; // positivo = João acima
  competitorHighFitCount: number;
  joaoHighFitCount: number;
  competitorAdvantages: readonly CompetitorSkillEdge[];
  joaoAdvantages: readonly CompetitorSkillEdge[];
}

export interface StudyIntelligenceReport {
  trackFilter: TrackFilter;
  totalJobsInDatabase: number;
  analyzedJobsCount: number;
  outOfScopeJobsCount: number;
  filteredNoiseRequirementsCount: number;
  trackCounts: Record<JobTrack, number>;
  joaoAvgFitScore: number;
  highFitCount: number;
  mediumFitCount: number;
  lowFitCount: number;
  technicalMustCoveragePct: number; // contando produção + parcial
  productionMustCoveragePct: number; // contando apenas produção sênior
  overallTechnicalCoveragePct: number;
  coreAdvantages: readonly AnalyzedSkillDemand[];
  depthGaps: readonly AnalyzedSkillDemand[]; // partial_evidence (Quick Wins)
  technicalGaps: readonly AnalyzedSkillDemand[]; // gap completo na trilha
  differentiators: readonly AnalyzedSkillDemand[]; // produção forte + nicho/moat
  softSkills: readonly AnalyzedSkillDemand[];
  studyPriorities: readonly StudyPriorityItem[];
  clusterImpacts: readonly ClusterStudyImpact[];
  competitorBenchmarks: readonly CompetitorBenchmarkResult[];
  evaluatedJobs: readonly EvaluatedJobFitSummary[];
  outOfScopeJobs: ReadonlyArray<{ id: string; title: string; reason: string }>;
}

interface SkillStudyPlaybook {
  action: string;
  why: string;
}

const STUDY_PLAYBOOK: Readonly<Record<string, SkillStudyPlaybook>> = {
  observabilidade: {
    action:
      'Instrumentar o worker e o dashboard do Job Radar AI com OpenTelemetry (traces distribuídos, métricas Prometheus/Grafana e logs estruturados JSON com Pino).',
    why: 'Requisito recorrente em vagas Sênior/Lead e AI Engineer; separa quem faz código funcionar de quem opera produção crítica.',
  },
  kafka: {
    action:
      'Construir POC de arquitetura event-driven em NestJS + Kafka (consumer groups, idempotência, DLQ, outbox pattern) comparando com BullMQ/Redis.',
    why: 'Principal divisor técnico em vagas Sênior de Backend/Full Stack de alta escala.',
  },
  rabbitmq: {
    action:
      'Implementar filas com exchanges/routing keys, dead-letter queues e retry com backoff em NestJS + RabbitMQ.',
    why: 'Muito cobrado em empresas BR de médio/grande porte junto com Node/NestJS.',
  },
  react: {
    action:
      'Aprofundar React 19 (Server Components, hooks avançados, TanStack Query, performance/profiling e testes com Testing Library) usando este dashboard como vitrine.',
    why: 'Você já tem base e produção forte em Angular — fechar a profundidade em React/Next destrava rapidamente a maioria das vagas Full Stack TS.',
  },
  'next.js': {
    action:
      'Evoluir o dashboard do Job Radar AI com Server Actions, streaming SSR, caching granular e testes E2E em produção na Vercel.',
    why: 'Padrão de mercado para Full Stack TS; já iniciado neste projeto (Quick Win).',
  },
  python: {
    action:
      'Migrar seu Python de scripts para nível de produção: tipagem estrita (mypy/pyright), Pydantic v2, async/await, FastAPI e pytest.',
    why: 'Pré-requisito obrigatório na maioria das vagas de AI Engineer no Brasil e no exterior.',
  },
  fastapi: {
    action:
      'Criar microserviço Python/FastAPI com Pydantic v2, streaming SSE de LLM e contrato OpenAPI integrado ao Job Radar AI.',
    why: 'Framework padrão de APIs de IA em produção.',
  },
  langgraph: {
    action:
      'Implementar grafo de agentes com estado persistente, checkpoints, human-in-the-loop e evals automatizados em LangGraph (TS ou Python).',
    why: 'Padrão emergente exigido em vagas de AI Engineer e Tech Lead focados em orquestração de agentes.',
  },
  langchain: {
    action:
      'Dominar abstrações core (LCEL, retrievers, callbacks/tracing) sabendo explicar quando usar SDK puro + Zod vs LangChain.',
    why: 'Muito citado em triagens de vagas AI Engineer como palavra-chave obrigatória.',
  },
  'agentes de ia': {
    action:
      'Documentar arquitetura multi-agente com tool calling, guardrails determinísticos, limites de custo/iteracão e avaliação ponta a ponta.',
    why: 'Diferencial crescente em vagas Sênior e Tech Lead em 2026.',
  },
  llmops: {
    action:
      'Adicionar observabilidade de LLM (Langfuse ou OpenTelemetry GenAI) rastreando prompts versionados, custo por tenant, latência p95 e regressão de evals no CI.',
    why: 'Complementa diretamente o harness de evals que você já construiu.',
  },
  playwright: {
    action:
      'Adicionar suíte E2E com Playwright cobrindo `/`, `/gaps`, `/evals` e `/jobs/[id]` rodando no GitHub Actions do Job Radar AI.',
    why: 'Cobrado em vagas Full Stack Sênior e Tech Lead; fechamento rápido (1–2 fins de semana) com alto impacto visual no portfólio.',
  },
  kubernetes: {
    action:
      'Empacotar web + worker do Job Radar AI com manifests/Helm (probes de health, HPA, ConfigMaps/Secrets, CronJob de coleta) em cluster local (k3d/kind).',
    why: 'Cobre a lacuna de orquestração em vagas Sênior/Lead onde você já domina Docker e AWS ECS.',
  },
  mongodb: {
    action:
      'Dominar modelagem orientada a documentos, aggregation pipelines, índices compostos e trade-offs de consistência vs PostgreSQL JSONB.',
    why: 'Frequente em vagas Full Stack Node/TS; rápido de fechar pela sua base forte de banco de dados.',
  },
  'aws serverless': {
    action:
      'Publicar coletor ou webhook serverless usando AWS Lambda + API Gateway + SQS + IaC (SST, CDK ou Terraform) com observabilidade.',
    why: 'Muito valorizado em vagas remotas em USD para Node + AWS.',
  },
  'machine learning': {
    action:
      'Consolidar fundamentos do Bacharelado em IA (estatística, validação cruzada, métricas de classificação, scikit-learn) em notebooks reproduzíveis com testes.',
    why: 'Reforça credibilidade técnica nas fronteiras entre AI Engineering e ML aplicado.',
  },
};

function defaultPlaybook(canonical: string, cluster: SkillCluster): SkillStudyPlaybook {
  return {
    action: `Estudar os fundamentos práticos de ${canonical} e incluir uma prova de conceito testada no portfólio ligada à sua stack principal.`,
    why: `Demanda recorrente no cluster ${cluster} dentro da trilha selecionada.`,
  };
}

export function normalizeJobRequirements(
  rawReqs: readonly StudyJobRequirementInput[],
): { normalized: NormalizedJobRequirement[]; filteredNoiseCount: number } {
  const byCanonical = new Map<string, NormalizedJobRequirement>();
  let filteredNoiseCount = 0;

  for (const req of rawReqs) {
    const mapped = normalizeSkillForAnalysis(req.canonical, req.category);
    if (mapped.length === 0) {
      filteredNoiseCount += 1;
      continue;
    }

    for (const item of mapped) {
      const existing = byCanonical.get(item.canonical);
      if (!existing) {
        byCanonical.set(item.canonical, {
          canonical: item.canonical,
          category: item.category,
          cluster: item.cluster,
          kind: req.kind,
          evidenceSpan: req.evidenceSpan ?? req.canonical,
        });
      } else if (existing.kind === 'nice' && req.kind === 'must') {
        // Must prevalece se a mesma skill apareceu duplicada como nice e must
        existing.kind = 'must';
      }
    }
  }

  return {
    normalized: [...byCanonical.values()],
    filteredNoiseCount,
  };
}

export function computeWeightedJobScore(
  requirements: readonly NormalizedJobRequirement[],
  proficiencyLookup: (canonical: string) => SkillProficiency,
): {
  score: number;
  fitLevel: 'high' | 'medium' | 'low';
  mustTotal: number;
  mustStrong: number;
  mustPartial: number;
  mustGap: number;
  niceTotal: number;
  niceStrong: number;
  nicePartial: number;
  niceGap: number;
} {
  const musts = requirements.filter((r) => r.kind === 'must');
  const nices = requirements.filter((r) => r.kind === 'nice');

  let mustWeightedSum = 0;
  let mustStrong = 0;
  let mustPartial = 0;
  let mustGap = 0;

  for (const req of musts) {
    const prof = proficiencyLookup(req.canonical);
    mustWeightedSum += PROFICIENCY_SCORE_WEIGHT[prof];
    if (prof === 'production_senior') mustStrong += 1;
    else if (prof === 'working_knowledge' || prof === 'studying') mustPartial += 1;
    else mustGap += 1;
  }

  let niceWeightedSum = 0;
  let niceStrong = 0;
  let nicePartial = 0;
  let niceGap = 0;

  for (const req of nices) {
    const prof = proficiencyLookup(req.canonical);
    niceWeightedSum += PROFICIENCY_SCORE_WEIGHT[prof];
    if (prof === 'production_senior') niceStrong += 1;
    else if (prof === 'working_knowledge' || prof === 'studying') nicePartial += 1;
    else niceGap += 1;
  }

  const mustCoverage = musts.length > 0 ? mustWeightedSum / musts.length : 1;
  const niceCoverage = nices.length > 0 ? niceWeightedSum / nices.length : 1;

  let weighted: number;
  if (musts.length > 0 && nices.length > 0) {
    weighted = 0.75 * mustCoverage + 0.25 * niceCoverage;
  } else if (musts.length > 0) {
    weighted = mustCoverage;
  } else if (nices.length > 0) {
    weighted = niceCoverage;
  } else {
    weighted = 0.5;
  }

  const score = Math.round(weighted * 1000) / 10;
  const fitLevel: 'high' | 'medium' | 'low' =
    score >= 75 ? 'high' : score >= 55 ? 'medium' : 'low';

  return {
    score,
    fitLevel,
    mustTotal: musts.length,
    mustStrong,
    mustPartial,
    mustGap,
    niceTotal: nices.length,
    niceStrong,
    nicePartial,
    niceGap,
  };
}

function horizonLabelPtBr(horizon: StudyHorizon): string {
  switch (horizon) {
    case 'quick_win':
      return 'Quick Win (Já tem base)';
    case 'high_roi':
      return 'Alto ROI (Curto/Médio Prazo)';
    case 'ai_bet':
      return 'Aposta AI Engineer';
    case 'monitor':
      return 'Monitorar';
  }
}

export function analyzeStudyIntelligence(
  allJobs: readonly StudyJobInput[],
  profileIndex: ReadonlyMap<string, ProfileSkillEntry>,
  options: {
    trackFilter?: TrackFilter;
    competitors?: readonly CompetitorArchetype[];
  } = {},
): StudyIntelligenceReport {
  const trackFilter: TrackFilter = options.trackFilter ?? 'target';
  const competitors = options.competitors ?? COMPETITOR_ARCHETYPES;

  const trackCounts: Record<JobTrack, number> = {
    fullstack_ts: 0,
    ai_engineer: 0,
    backend_node_lead: 0,
    out_of_scope: 0,
  };

  const outOfScopeJobs: Array<{ id: string; title: string; reason: string }> = [];

  interface PreparedJob {
    job: StudyJobInput;
    track: JobTrackClassification;
    normalizedReqs: NormalizedJobRequirement[];
    technicalReqs: NormalizedJobRequirement[];
  }

  const selectedJobs: PreparedJob[] = [];
  let filteredNoiseRequirementsCount = 0;

  for (const job of allJobs) {
    const track = classifyJobTrack({
      title: job.title,
      seniority: job.seniority,
      requirements: job.requirements,
    });

    if (!track.inTargetScope) {
      trackCounts.out_of_scope += 1;
      outOfScopeJobs.push({ id: job.id, title: job.title, reason: track.reason });
    } else {
      for (const t of track.tracks) {
        trackCounts[t] += 1;
      }
    }

    if (!jobMatchesTrackFilter(track, trackFilter)) {
      continue;
    }

    const { normalized, filteredNoiseCount } = normalizeJobRequirements(job.requirements);
    filteredNoiseRequirementsCount += filteredNoiseCount;
    const technicalReqs = normalized.filter((r) => r.category !== 'soft');

    selectedJobs.push({
      job,
      track,
      normalizedReqs: normalized,
      technicalReqs,
    });
  }

  const getJoaoProficiency = (canonical: string): SkillProficiency => {
    const entry = profileIndex.get(canonical);
    return entry ? entry.proficiency : 'none';
  };

  // Avalia cada vaga na trilha selecionada
  const evaluatedJobs: EvaluatedJobFitSummary[] = selectedJobs.map(({ job, track, normalizedReqs }) => {
    const res = computeWeightedJobScore(normalizedReqs, getJoaoProficiency);
    return {
      jobId: job.id,
      title: job.title,
      company: job.company,
      source: job.source,
      url: job.url,
      seniority: job.seniority,
      workModel: job.workModel,
      track,
      ...res,
    };
  });

  evaluatedJobs.sort((a, b) => b.score - a.score);

  const analyzedJobsCount = selectedJobs.length;
  const joaoAvgFitScore =
    analyzedJobsCount > 0
      ? Math.round(
          (evaluatedJobs.reduce((acc, j) => acc + j.score, 0) / analyzedJobsCount) * 10,
        ) / 10
      : 0;

  const highFitCount = evaluatedJobs.filter((j) => j.fitLevel === 'high').length;
  const mediumFitCount = evaluatedJobs.filter((j) => j.fitLevel === 'medium').length;
  const lowFitCount = evaluatedJobs.filter((j) => j.fitLevel === 'low').length;

  // Agrega demanda por skill (técnica vs soft)
  const techSkillStats = new Map<
    string,
    {
      canonical: string;
      category: RequirementCategory;
      cluster: SkillCluster;
      jobIds: Set<string>;
      mustCount: number;
      niceCount: number;
      seniorOrLeadCount: number;
      remoteOrUsdCount: number;
      refs: JobSkillReference[];
    }
  >();

  const softSkillStats = new Map<
    string,
    {
      canonical: string;
      category: RequirementCategory;
      cluster: SkillCluster;
      jobIds: Set<string>;
      mustCount: number;
      niceCount: number;
      seniorOrLeadCount: number;
      remoteOrUsdCount: number;
      refs: JobSkillReference[];
    }
  >();

  let totalTechReqs = 0;
  let metTechReqs = 0;
  let totalTechMusts = 0;
  let metTechMusts = 0;
  let productionTechMusts = 0;

  for (const { job, normalizedReqs } of selectedJobs) {
    const isSeniorOrLead = job.seniority === 'senior' || job.seniority === 'lead';
    const isRemoteOrUsd =
      job.workModel === 'remote' || /\busd\b/i.test(job.title);

    for (const req of normalizedReqs) {
      const targetMap = req.category === 'soft' ? softSkillStats : techSkillStats;
      let entry = targetMap.get(req.canonical);
      if (!entry) {
        entry = {
          canonical: req.canonical,
          category: req.category,
          cluster: req.cluster,
          jobIds: new Set(),
          mustCount: 0,
          niceCount: 0,
          seniorOrLeadCount: 0,
          remoteOrUsdCount: 0,
          refs: [],
        };
        targetMap.set(req.canonical, entry);
      }

      if (!entry.jobIds.has(job.id)) {
        entry.jobIds.add(job.id);
        if (isSeniorOrLead) entry.seniorOrLeadCount += 1;
        if (isRemoteOrUsd) entry.remoteOrUsdCount += 1;
      }
      if (req.kind === 'must') entry.mustCount += 1;
      else entry.niceCount += 1;

      entry.refs.push({
        jobId: job.id,
        title: job.title,
        company: job.company,
        seniority: job.seniority,
        workModel: job.workModel,
        kind: req.kind,
        evidenceSpan: req.evidenceSpan,
      });

      if (req.category !== 'soft') {
        const prof = getJoaoProficiency(req.canonical);
        totalTechReqs += 1;
        if (prof !== 'none') metTechReqs += 1;
        if (req.kind === 'must') {
          totalTechMusts += 1;
          if (prof !== 'none') metTechMusts += 1;
          if (prof === 'production_senior') productionTechMusts += 1;
        }
      }
    }
  }

  const toAnalyzedDemand = (
    statsMap: typeof techSkillStats,
  ): AnalyzedSkillDemand[] => {
    const items: AnalyzedSkillDemand[] = [];
    for (const entry of statsMap.values()) {
      const jobCount = entry.jobIds.size;
      const jobPercentage =
        analyzedJobsCount > 0 ? Math.round((jobCount / analyzedJobsCount) * 1000) / 10 : 0;
      const profileEntry = profileIndex.get(entry.canonical);
      const userProficiency: SkillProficiency = profileEntry ? profileEntry.proficiency : 'none';
      items.push({
        canonical: entry.canonical,
        category: entry.category,
        cluster: entry.cluster,
        jobCount,
        jobPercentage,
        mustCount: entry.mustCount,
        niceCount: entry.niceCount,
        seniorOrLeadCount: entry.seniorOrLeadCount,
        remoteOrUsdCount: entry.remoteOrUsdCount,
        userProficiency,
        userProficiencyLabel: proficiencyLabelPtBr(userProficiency),
        userStatus: proficiencyToUserStatus(userProficiency),
        evidenceSummary: profileEntry ? profileEntry.evidence : null,
        jobReferences: entry.refs,
      });
    }
    items.sort(
      (a, b) =>
        b.jobCount - a.jobCount ||
        b.mustCount - a.mustCount ||
        a.canonical.localeCompare(b.canonical),
    );
    return items;
  };

  const techSkills = toAnalyzedDemand(techSkillStats);
  const softSkills = toAnalyzedDemand(softSkillStats);

  const coreAdvantages = techSkills.filter(
    (s) => s.userStatus === 'strong_evidence' && s.jobPercentage >= 20,
  );
  const differentiators = techSkills.filter(
    (s) => s.userStatus === 'strong_evidence' && s.jobPercentage < 20,
  );
  const depthGaps = techSkills.filter((s) => s.userStatus === 'partial_evidence');
  const technicalGaps = techSkills.filter((s) => s.userStatus === 'gap');

  // Simulador contrafactual de ROI de estudo por skill
  const baselineByJobId = new Map<string, EvaluatedJobFitSummary>();
  for (const j of evaluatedJobs) {
    baselineByJobId.set(j.jobId, j);
  }

  const candidateStudySkills = [...depthGaps, ...technicalGaps].filter(
    (s) => s.cluster !== 'Outras Stacks' || trackFilter === 'all' || trackFilter === 'out_of_scope',
  );

  const studyPriorities: StudyPriorityItem[] = candidateStudySkills.map((skill) => {
    const simulatedLookup = (canonical: string): SkillProficiency =>
      canonical === skill.canonical ? 'production_senior' : getJoaoProficiency(canonical);

    let totalGain = 0;
    let affectedGainSum = 0;
    let jobsImprovedCount = 0;
    let jobsUnlockedToHighFit = 0;
    let jobsUnlockedToMediumFit = 0;

    for (const { job, normalizedReqs } of selectedJobs) {
      const base = baselineByJobId.get(job.id);
      if (!base) continue;
      const sim = computeWeightedJobScore(normalizedReqs, simulatedLookup);
      const gain = Math.max(0, Math.round((sim.score - base.score) * 10) / 10);
      totalGain += gain;
      if (gain > 0) {
        jobsImprovedCount += 1;
        affectedGainSum += gain;
      }
      if (base.score < 75 && sim.score >= 75) {
        jobsUnlockedToHighFit += 1;
      }
      if (base.score < 55 && sim.score >= 55) {
        jobsUnlockedToMediumFit += 1;
      }
    }

    const avgTrackScoreGain =
      analyzedJobsCount > 0 ? Math.round((totalGain / analyzedJobsCount) * 10) / 10 : 0;
    const affectedJobsAvgGain =
      jobsImprovedCount > 0 ? Math.round((affectedGainSum / jobsImprovedCount) * 10) / 10 : 0;

    // Fórmula transparente de prioridade (0–100)
    const demandPoints = Math.min(38, (skill.jobPercentage / 100) * 55);
    const mustPoints = Math.min(22, (skill.mustCount / Math.max(1, analyzedJobsCount)) * 35);
    const roiPoints = Math.min(25, avgTrackScoreGain * 3.5 + jobsUnlockedToHighFit * 8);
    const seniorBonus = skill.seniorOrLeadCount > 0 ? 7 : 0;
    const quickWinBonus = skill.userProficiency === 'working_knowledge' ? 10 : skill.userProficiency === 'studying' ? 5 : 0;
    const priorityScore = Math.min(
      100,
      Math.round(demandPoints + mustPoints + roiPoints + seniorBonus + quickWinBonus),
    );

    let horizon: StudyHorizon = 'monitor';
    if (skill.userProficiency === 'working_knowledge') {
      horizon = 'quick_win';
    } else if (skill.cluster === 'IA, LLMs & Agentes' || skill.cluster === 'Dados & ML') {
      horizon = 'ai_bet';
    } else if (skill.jobPercentage >= 20 || skill.mustCount >= 2 || jobsUnlockedToHighFit > 0) {
      horizon = 'high_roi';
    }

    const playbook = STUDY_PLAYBOOK[skill.canonical] ?? defaultPlaybook(skill.canonical, skill.cluster);

    return {
      skill,
      priorityScore,
      horizon,
      horizonLabel: horizonLabelPtBr(horizon),
      avgTrackScoreGain,
      affectedJobsAvgGain,
      jobsImprovedCount,
      jobsUnlockedToHighFit,
      jobsUnlockedToMediumFit,
      studyAction: playbook.action,
      whyItMatters: playbook.why,
    };
  });

  studyPriorities.sort(
    (a, b) =>
      b.priorityScore - a.priorityScore ||
      b.jobsUnlockedToHighFit - a.jobsUnlockedToHighFit ||
      b.skill.mustCount - a.skill.mustCount,
  );

  // Simulador por Cluster (fechar o bloco inteiro, ex: Observabilidade ou Mensageria)
  const clusterGroups = new Map<SkillCluster, AnalyzedSkillDemand[]>();
  for (const skill of candidateStudySkills) {
    let list = clusterGroups.get(skill.cluster);
    if (!list) {
      list = [];
      clusterGroups.set(skill.cluster, list);
    }
    list.push(skill);
  }

  const clusterImpacts: ClusterStudyImpact[] = [];
  for (const [cluster, clusterSkills] of clusterGroups) {
    const skillSet = new Set(clusterSkills.map((s) => s.canonical));
    const demandingJobs = new Set<string>();
    for (const s of clusterSkills) {
      for (const ref of s.jobReferences) {
        demandingJobs.add(ref.jobId);
      }
    }

    const simLookup = (canonical: string): SkillProficiency =>
      skillSet.has(canonical) ? 'production_senior' : getJoaoProficiency(canonical);

    let totalGain = 0;
    let unlockedHigh = 0;
    for (const { job, normalizedReqs } of selectedJobs) {
      const base = baselineByJobId.get(job.id);
      if (!base) continue;
      const sim = computeWeightedJobScore(normalizedReqs, simLookup);
      totalGain += Math.max(0, sim.score - base.score);
      if (base.score < 75 && sim.score >= 75) unlockedHigh += 1;
    }

    const avgGain =
      analyzedJobsCount > 0 ? Math.round((totalGain / analyzedJobsCount) * 10) / 10 : 0;
    const topSkill = clusterSkills[0];
    const action = topSkill
      ? (STUDY_PLAYBOOK[topSkill.canonical]?.action ?? defaultPlaybook(topSkill.canonical, cluster).action)
      : '';

    clusterImpacts.push({
      cluster,
      skills: clusterSkills.map((s) => s.canonical),
      gapSkillsCount: clusterSkills.length,
      jobsDemandingCount: demandingJobs.size,
      jobsDemandingPercentage:
        analyzedJobsCount > 0
          ? Math.round((demandingJobs.size / analyzedJobsCount) * 1000) / 10
          : 0,
      avgTrackScoreGain: avgGain,
      jobsUnlockedToHighFit: unlockedHigh,
      recommendedAction: action,
    });
  }

  clusterImpacts.sort(
    (a, b) =>
      b.avgTrackScoreGain - a.avgTrackScoreGain ||
      b.jobsDemandingCount - a.jobsDemandingCount,
  );

  // Benchmark dinâmico contra arquétipos de concorrentes nas mesmas vagas
  const competitorBenchmarks: CompetitorBenchmarkResult[] = competitors.map((archetype) => {
    const getCompProf = (canonical: string): SkillProficiency =>
      archetype.skills[canonical] ?? 'none';

    let compScoreSum = 0;
    let compHighFit = 0;

    for (const { normalizedReqs } of selectedJobs) {
      const compRes = computeWeightedJobScore(normalizedReqs, getCompProf);
      compScoreSum += compRes.score;
      if (compRes.fitLevel === 'high') compHighFit += 1;
    }

    const competitorAvgScore =
      analyzedJobsCount > 0 ? Math.round((compScoreSum / analyzedJobsCount) * 10) / 10 : 0;

    const competitorAdvantages: CompetitorSkillEdge[] = [];
    const joaoAdvantages: CompetitorSkillEdge[] = [];

    for (const skill of techSkills) {
      const joaoProf = skill.userProficiency;
      const compProf = getCompProf(skill.canonical);
      const joaoWeight = PROFICIENCY_SCORE_WEIGHT[joaoProf];
      const compWeight = PROFICIENCY_SCORE_WEIGHT[compProf];

      if (compWeight > joaoWeight) {
        competitorAdvantages.push({
          canonical: skill.canonical,
          cluster: skill.cluster,
          jobCount: skill.jobCount,
          jobPercentage: skill.jobPercentage,
          joaoProficiency: joaoProf,
          competitorProficiency: compProf,
        });
      } else if (joaoWeight > compWeight) {
        joaoAdvantages.push({
          canonical: skill.canonical,
          cluster: skill.cluster,
          jobCount: skill.jobCount,
          jobPercentage: skill.jobPercentage,
          joaoProficiency: joaoProf,
          competitorProficiency: compProf,
        });
      }
    }

    competitorAdvantages.sort((a, b) => b.jobCount - a.jobCount);
    joaoAdvantages.sort((a, b) => b.jobCount - a.jobCount);

    return {
      archetype,
      competitorAvgScore,
      joaoAvgScore: joaoAvgFitScore,
      scoreDelta: Math.round((joaoAvgFitScore - competitorAvgScore) * 10) / 10,
      competitorHighFitCount: compHighFit,
      joaoHighFitCount: highFitCount,
      competitorAdvantages,
      joaoAdvantages,
    };
  });

  const technicalMustCoveragePct =
    totalTechMusts > 0 ? Math.round((metTechMusts / totalTechMusts) * 1000) / 10 : 100;
  const productionMustCoveragePct =
    totalTechMusts > 0 ? Math.round((productionTechMusts / totalTechMusts) * 1000) / 10 : 100;
  const overallTechnicalCoveragePct =
    totalTechReqs > 0 ? Math.round((metTechReqs / totalTechReqs) * 1000) / 10 : 100;

  return {
    trackFilter,
    totalJobsInDatabase: allJobs.length,
    analyzedJobsCount,
    outOfScopeJobsCount: outOfScopeJobs.length,
    filteredNoiseRequirementsCount,
    trackCounts,
    joaoAvgFitScore,
    highFitCount,
    mediumFitCount,
    lowFitCount,
    technicalMustCoveragePct,
    productionMustCoveragePct,
    overallTechnicalCoveragePct,
    coreAdvantages,
    depthGaps,
    technicalGaps,
    differentiators,
    softSkills,
    studyPriorities,
    clusterImpacts,
    competitorBenchmarks,
    evaluatedJobs,
    outOfScopeJobs,
  };
}
