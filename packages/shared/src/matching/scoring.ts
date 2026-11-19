export interface RequirementMatch {
  requirement: string;
  kind: 'must' | 'nice';
  matched: boolean;
  score: number; // 0 a 1
  evidence: string | null;
  section: string | null;
  doc: string | null;
  reason?: string;
}

export interface MatchScoreResult {
  score: number; // 0 a 100
  mustCoverage: number; // 0 a 1
  niceCoverage: number; // 0 a 1
  totalMust: number;
  matchedMust: number;
  totalNice: number;
  matchedNice: number;
  fitLevel: 'high' | 'medium' | 'low';
}

export function computeJobMatchScore(requirements: readonly RequirementMatch[]): MatchScoreResult {
  const musts = requirements.filter((r) => r.kind === 'must');
  const nices = requirements.filter((r) => r.kind === 'nice');

  const totalMust = musts.length;
  const matchedMust = musts.filter((r) => r.matched).length;

  const totalNice = nices.length;
  const matchedNice = nices.filter((r) => r.matched).length;

  const mustCoverage = totalMust > 0 ? matchedMust / totalMust : 1.0;
  const niceCoverage = totalNice > 0 ? matchedNice / totalNice : 1.0;

  let weightedScore: number;
  if (totalMust > 0 && totalNice > 0) {
    weightedScore = 0.75 * mustCoverage + 0.25 * niceCoverage;
  } else if (totalMust > 0) {
    weightedScore = mustCoverage;
  } else if (totalNice > 0) {
    weightedScore = niceCoverage;
  } else {
    weightedScore = 0.5; // sem requisitos listados
  }

  const score = Math.round(weightedScore * 1000) / 10; // 0 a 100 com 1 casa decimal

  let fitLevel: 'high' | 'medium' | 'low' = 'low';
  if (score >= 75) {
    fitLevel = 'high';
  } else if (score >= 55) {
    fitLevel = 'medium';
  }

  return {
    score,
    mustCoverage: Math.round(mustCoverage * 1000) / 1000,
    niceCoverage: Math.round(niceCoverage * 1000) / 1000,
    totalMust,
    matchedMust,
    totalNice,
    matchedNice,
    fitLevel,
  };
}
