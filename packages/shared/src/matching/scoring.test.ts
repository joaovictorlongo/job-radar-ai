import { describe, expect, it } from 'vitest';
import { computeJobMatchScore, type RequirementMatch } from './scoring.js';

describe('computeJobMatchScore', () => {
  it('calculates weighted score giving higher priority to must-have requirements', () => {
    const requirements: RequirementMatch[] = [
      {
        requirement: 'typescript',
        kind: 'must',
        matched: true,
        score: 0.95,
        evidence: 'TypeScript sênior na Field Control',
        section: 'Experiência',
        doc: 'experiencia.md',
      },
      {
        requirement: 'node.js',
        kind: 'must',
        matched: true,
        score: 0.92,
        evidence: 'APIs em Node.js e NestJS',
        section: 'Experiência',
        doc: 'experiencia.md',
      },
      {
        requirement: 'c#',
        kind: 'must',
        matched: false,
        score: 0.1,
        evidence: null,
        section: null,
        doc: null,
      },
      {
        requirement: 'aws',
        kind: 'nice',
        matched: true,
        score: 0.88,
        evidence: 'S3, SQS e RDS',
        section: 'Competências',
        doc: 'competencias.md',
      },
    ];

    // Must: 2/3 = 0.6667
    // Nice: 1/1 = 1.0
    // Weighted: 0.75 * 0.6667 + 0.25 * 1.0 = 0.5 + 0.25 = 0.75 -> 75%
    const res = computeJobMatchScore(requirements);
    expect(res.totalMust).toBe(3);
    expect(res.matchedMust).toBe(2);
    expect(res.totalNice).toBe(1);
    expect(res.matchedNice).toBe(1);
    expect(res.score).toBe(75);
    expect(res.fitLevel).toBe('high');
  });

  it('classifies low fit when critical must-haves are missing', () => {
    const requirements: RequirementMatch[] = [
      {
        requirement: 'ruby',
        kind: 'must',
        matched: false,
        score: 0,
        evidence: null,
        section: null,
        doc: null,
      },
      {
        requirement: 'rails',
        kind: 'must',
        matched: false,
        score: 0,
        evidence: null,
        section: null,
        doc: null,
      },
    ];
    const res = computeJobMatchScore(requirements);
    expect(res.score).toBe(0);
    expect(res.fitLevel).toBe('low');
  });
});
