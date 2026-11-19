export type SkillUserStatus = 'strong_evidence' | 'partial_evidence' | 'gap';
export type MarketImportance = 'critical' | 'high' | 'medium' | 'niche';
export type CompetitiveQuadrant = 'core_advantage' | 'strategic_gap' | 'differentiator' | 'opportunity';

export interface MarketSkillDemand {
  canonical: string;
  category: string;
  totalOccurrences: number;
  jobCount: number;
  jobPercentage: number; // 0 a 100
  mustCount: number;
  niceCount: number;
  userStatus: SkillUserStatus;
  evidenceSummary: string | null;
  marketImportance: MarketImportance;
  competitiveQuadrant: CompetitiveQuadrant;
  recommendation: string;
}

export interface MarketGapAnalysisResult {
  totalJobsAnalyzed: number;
  distinctSkillsDemanded: number;
  overallCoveragePercentage: number;
  mustHaveCoveragePercentage: number;
  skills: MarketSkillDemand[];
  coreAdvantages: MarketSkillDemand[]; // Onde João se destaca fortemente
  strategicGaps: MarketSkillDemand[]; // Principais gargalos a fechar para vencer outros candidatos
  differentiators: MarketSkillDemand[]; // Moats e diferenciais competitivos raros
  topActionableRecommendations: Array<{
    skill: string;
    marketShare: number;
    impact: string;
    action: string;
  }>;
}

export interface UserSkillEvidenceMap {
  [canonical: string]: {
    status: SkillUserStatus;
    evidence: string;
    doc?: string;
    section?: string;
  };
}

export interface JobWithExtractedRequirements {
  id: string;
  title: string;
  requirements: Array<{
    canonical: string;
    category?: string;
    kind: 'must' | 'nice';
  }>;
}

export function analyzeMarketGaps(
  jobs: readonly JobWithExtractedRequirements[],
  userEvidence: UserSkillEvidenceMap,
): MarketGapAnalysisResult {
  const totalJobs = jobs.length;
  if (totalJobs === 0) {
    return {
      totalJobsAnalyzed: 0,
      distinctSkillsDemanded: 0,
      overallCoveragePercentage: 100,
      mustHaveCoveragePercentage: 100,
      skills: [],
      coreAdvantages: [],
      strategicGaps: [],
      differentiators: [],
      topActionableRecommendations: [],
    };
  }

  // Agrega estatísticas por habilidade
  const statsMap = new Map<
    string,
    {
      canonical: string;
      category: string;
      total: number;
      jobsSet: Set<string>;
      mustCount: number;
      niceCount: number;
    }
  >();

  let totalRequirementsCount = 0;
  let userMetRequirementsCount = 0;
  let totalMustRequirementsCount = 0;
  let userMetMustRequirementsCount = 0;

  for (const job of jobs) {
    for (const req of job.requirements) {
      const canonical = req.canonical.toLowerCase().trim();
      if (!canonical) continue;

      totalRequirementsCount += 1;
      const evidence = userEvidence[canonical];
      const isMet = evidence?.status === 'strong_evidence' || evidence?.status === 'partial_evidence';
      if (isMet) {
        userMetRequirementsCount += 1;
      }

      if (req.kind === 'must') {
        totalMustRequirementsCount += 1;
        if (isMet) {
          userMetMustRequirementsCount += 1;
        }
      }

      let entry = statsMap.get(canonical);
      if (!entry) {
        entry = {
          canonical,
          category: req.category ?? 'tech',
          total: 0,
          jobsSet: new Set(),
          mustCount: 0,
          niceCount: 0,
        };
        statsMap.set(canonical, entry);
      }

      entry.total += 1;
      entry.jobsSet.add(job.id);
      if (req.kind === 'must') {
        entry.mustCount += 1;
      } else {
        entry.niceCount += 1;
      }
    }
  }

  const skillsList: MarketSkillDemand[] = [];

  for (const [canonical, entry] of statsMap) {
    const jobCount = entry.jobsSet.size;
    const jobPercentage = Math.round((jobCount / totalJobs) * 1000) / 10;
    const evidence = userEvidence[canonical];
    const userStatus: SkillUserStatus = evidence ? evidence.status : 'gap';
    const evidenceSummary = evidence ? evidence.evidence : null;

    let marketImportance: MarketImportance = 'niche';
    if (jobPercentage >= 30) {
      marketImportance = 'critical';
    } else if (jobPercentage >= 15) {
      marketImportance = 'high';
    } else if (jobPercentage >= 8) {
      marketImportance = 'medium';
    }

    let competitiveQuadrant: CompetitiveQuadrant = 'opportunity';
    let recommendation = '';

    if (userStatus === 'strong_evidence') {
      if (jobPercentage >= 20) {
        competitiveQuadrant = 'core_advantage';
        recommendation = 'Destacar no resumo do currículo e portfólio; você supera a média da concorrência.';
      } else {
        competitiveQuadrant = 'differentiator';
        recommendation = 'Diferencial competitivo de ponta. Use como alavanca técnica em entrevistas para demonstrar profundidade.';
      }
    } else if (userStatus === 'partial_evidence') {
      if (jobPercentage >= 20) {
        competitiveQuadrant = 'strategic_gap';
        recommendation = 'Alta demanda no mercado. Transforme a experiência conceitual em projeto demonstrável no GitHub.';
      } else {
        competitiveQuadrant = 'opportunity';
        recommendation = 'Aprofundar conforme vagas-alvo específicas exigirem.';
      }
    } else {
      // Gap completo
      if (jobPercentage >= 20) {
        competitiveQuadrant = 'strategic_gap';
        recommendation = 'Gargalo crítico frente à concorrência. Adicione projeto prático ou prova de conceito prioritária.';
      } else {
        competitiveQuadrant = 'opportunity';
        recommendation = 'Tecnologia demandada em nichos. Avaliar se alinha ao foco de carreira.';
      }
    }

    skillsList.push({
      canonical,
      category: entry.category,
      totalOccurrences: entry.total,
      jobCount,
      jobPercentage,
      mustCount: entry.mustCount,
      niceCount: entry.niceCount,
      userStatus,
      evidenceSummary,
      marketImportance,
      competitiveQuadrant,
      recommendation,
    });
  }

  // Ordena por % de vagas demandantes decrescente
  skillsList.sort((a, b) => b.jobCount - a.jobCount || b.totalOccurrences - a.totalOccurrences);

  const coreAdvantages = skillsList.filter((s) => s.competitiveQuadrant === 'core_advantage');
  const strategicGaps = skillsList.filter((s) => s.competitiveQuadrant === 'strategic_gap');
  const differentiators = skillsList.filter((s) => s.competitiveQuadrant === 'differentiator');

  const topActionableRecommendations = strategicGaps.slice(0, 5).map((gap) => ({
    skill: gap.canonical,
    marketShare: gap.jobPercentage,
    impact: `Presente em ${gap.jobPercentage}% das vagas da amostra`,
    action: gap.recommendation,
  }));

  const overallCoveragePercentage =
    totalRequirementsCount > 0
      ? Math.round((userMetRequirementsCount / totalRequirementsCount) * 1000) / 10
      : 100;

  const mustHaveCoveragePercentage =
    totalMustRequirementsCount > 0
      ? Math.round((userMetMustRequirementsCount / totalMustRequirementsCount) * 1000) / 10
      : 100;

  return {
    totalJobsAnalyzed: totalJobs,
    distinctSkillsDemanded: statsMap.size,
    overallCoveragePercentage,
    mustHaveCoveragePercentage,
    skills: skillsList,
    coreAdvantages,
    strategicGaps,
    differentiators,
    topActionableRecommendations,
  };
}
