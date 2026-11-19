import { describe, expect, it } from 'vitest';
import { analyzeMarketGaps, type JobWithExtractedRequirements, type UserSkillEvidenceMap } from './gap-analysis.js';

describe('analyzeMarketGaps', () => {
  it('identifies core advantages, strategic gaps, and market coverage accurately', () => {
    const jobs: JobWithExtractedRequirements[] = [
      {
        id: 'job-1',
        title: 'Senior Node Engineer',
        requirements: [
          { canonical: 'typescript', kind: 'must' },
          { canonical: 'node.js', kind: 'must' },
          { canonical: 'kafka', kind: 'must' },
        ],
      },
      {
        id: 'job-2',
        title: 'Full Stack Developer',
        requirements: [
          { canonical: 'typescript', kind: 'must' },
          { canonical: 'react', kind: 'must' },
          { canonical: 'kafka', kind: 'nice' },
        ],
      },
      {
        id: 'job-3',
        title: 'Backend Specialist',
        requirements: [
          { canonical: 'typescript', kind: 'must' },
          { canonical: 'postgresql', kind: 'must' },
          { canonical: 'pgvector', kind: 'nice' },
        ],
      },
    ];

    const userEvidence: UserSkillEvidenceMap = {
      typescript: {
        status: 'strong_evidence',
        evidence: 'TypeScript avançado na Field Control',
      },
      'node.js': {
        status: 'strong_evidence',
        evidence: 'Node.js na Field Control',
      },
      postgresql: {
        status: 'strong_evidence',
        evidence: 'PostgreSQL em produção',
      },
      pgvector: {
        status: 'strong_evidence',
        evidence: 'Job Radar AI com busca vetorial',
      },
      react: {
        status: 'partial_evidence',
        evidence: 'Conhecimento conceitual e Ink/Next',
      },
      // kafka is missing (gap!)
    };

    const res = analyzeMarketGaps(jobs, userEvidence);

    expect(res.totalJobsAnalyzed).toBe(3);
    // TypeScript is in 3/3 jobs (100%) and user has strong evidence -> core_advantage
    const tsSkill = res.skills.find((s) => s.canonical === 'typescript');
    expect(tsSkill?.competitiveQuadrant).toBe('core_advantage');
    expect(tsSkill?.jobPercentage).toBe(100);

    // Kafka is in 2/3 jobs (66.7%) and user has gap -> strategic_gap
    const kafkaSkill = res.skills.find((s) => s.canonical === 'kafka');
    expect(kafkaSkill?.competitiveQuadrant).toBe('strategic_gap');
    expect(kafkaSkill?.userStatus).toBe('gap');

    // pgvector is in 1/3 jobs (33.3%) with strong evidence -> core_advantage (or differentiator if < 20%)
    const pgvectorSkill = res.skills.find((s) => s.canonical === 'pgvector');
    expect(pgvectorSkill?.userStatus).toBe('strong_evidence');

    expect(res.strategicGaps.length).toBeGreaterThan(0);
    expect(res.topActionableRecommendations.some((r) => r.skill === 'kafka')).toBe(true);
  });
});
