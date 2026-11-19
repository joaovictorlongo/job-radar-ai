import {
  computeWeightedJobScore,
  normalizeJobRequirements,
  PROFICIENCY_SCORE_WEIGHT,
  proficiencyLabelPtBr,
  type SkillProficiency,
  type StudyJobRequirementInput,
} from '@job-radar/shared';
import { loadProfileSkills } from './profile';

export interface EvaluatedRequirementItem {
  requirement: string;
  category: string;
  cluster: string;
  kind: 'must' | 'nice';
  proficiency: SkillProficiency;
  proficiencyLabel: string;
  status: 'strong' | 'partial' | 'gap';
  weight: number;
  evidence: string | null;
  evidenceSpan: string;
}

export interface EvaluatedJobScore {
  jobId: string;
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
  strongRequirements: EvaluatedRequirementItem[];
  partialRequirements: EvaluatedRequirementItem[];
  gapRequirements: EvaluatedRequirementItem[];
  allRequirements: EvaluatedRequirementItem[];
  filteredNoiseCount: number;
}

export function evaluateJobFit(
  jobId: string,
  requirements: readonly StudyJobRequirementInput[],
): EvaluatedJobScore {
  const { index } = loadProfileSkills();
  const { normalized, filteredNoiseCount } = normalizeJobRequirements(requirements);

  const lookup = (canonical: string): SkillProficiency =>
    index.get(canonical)?.proficiency ?? 'none';

  const scoreSummary = computeWeightedJobScore(normalized, lookup);

  const allRequirements: EvaluatedRequirementItem[] = normalized.map((req) => {
    const entry = index.get(req.canonical);
    const proficiency: SkillProficiency = entry?.proficiency ?? 'none';
    const status: 'strong' | 'partial' | 'gap' =
      proficiency === 'production_senior'
        ? 'strong'
        : proficiency === 'working_knowledge' || proficiency === 'studying'
          ? 'partial'
          : 'gap';

    return {
      requirement: req.canonical,
      category: req.category,
      cluster: req.cluster,
      kind: req.kind,
      proficiency,
      proficiencyLabel: proficiencyLabelPtBr(proficiency),
      status,
      weight: PROFICIENCY_SCORE_WEIGHT[proficiency],
      evidence: entry?.evidence ?? null,
      evidenceSpan: req.evidenceSpan,
    };
  });

  return {
    jobId,
    score: scoreSummary.score,
    fitLevel: scoreSummary.fitLevel,
    mustTotal: scoreSummary.mustTotal,
    mustStrong: scoreSummary.mustStrong,
    mustPartial: scoreSummary.mustPartial,
    mustGap: scoreSummary.mustGap,
    niceTotal: scoreSummary.niceTotal,
    niceStrong: scoreSummary.niceStrong,
    nicePartial: scoreSummary.nicePartial,
    niceGap: scoreSummary.niceGap,
    strongRequirements: allRequirements.filter((r) => r.status === 'strong'),
    partialRequirements: allRequirements.filter((r) => r.status === 'partial'),
    gapRequirements: allRequirements.filter((r) => r.status === 'gap'),
    allRequirements,
    filteredNoiseCount,
  };
}
