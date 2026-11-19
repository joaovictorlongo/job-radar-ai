import { describe, expect, it } from 'vitest';
import { classifyJobTrack, jobMatchesTrackFilter } from './tracks.js';

describe('classifyJobTrack', () => {
  it('classifica Full Stack Node + React como fullstack_ts (dentro do escopo)', () => {
    const res = classifyJobTrack({
      title: 'Full-stack Engineer Node.js + React.js + AWS (USD-based pay)',
      seniority: 'mid',
      requirements: [
        { canonical: 'node.js', kind: 'must' },
        { canonical: 'react', kind: 'must' },
        { canonical: 'aws', kind: 'must' },
      ],
    });
    expect(res.inTargetScope).toBe(true);
    expect(res.primaryTrack).toBe('fullstack_ts');
    expect(jobMatchesTrackFilter(res, 'target')).toBe(true);
  });

  it('classifica AI Engineer como ai_engineer', () => {
    const res = classifyJobTrack({
      title: 'Desenvolvedor Back-End Senior (AI Engineer)',
      seniority: 'senior',
      requirements: [
        { canonical: 'python', kind: 'must' },
        { canonical: 'langgraph', kind: 'must' },
        { canonical: 'pgvector', kind: 'must' },
      ],
    });
    expect(res.inTargetScope).toBe(true);
    expect(res.primaryTrack).toBe('ai_engineer');
  });

  it('classifica Tech Lead com Node + agentes de IA em backend_node_lead e ai_engineer', () => {
    const res = classifyJobTrack({
      title: 'Tech Lead Senior',
      seniority: 'lead',
      requirements: [
        { canonical: 'node.js', kind: 'must' },
        { canonical: 'typescript', kind: 'must' },
        { canonical: 'orquestracao multiplos agentes de ia', kind: 'must' },
      ],
    });
    expect(res.inTargetScope).toBe(true);
    expect(res.primaryTrack).toBe('backend_node_lead');
    expect(res.tracks).toContain('ai_engineer');
  });

  it('coloca C#/.NET, SAP, PHP, Estágio e vagas não-tech em out_of_scope', () => {
    const cases = [
      {
        title: 'Analista SAP B1 Pleno',
        seniority: 'mid',
        requirements: [{ canonical: 'sql', kind: 'must' as const }],
      },
      {
        title: 'Desenvolvedor Full-Stack Estágio',
        seniority: 'intern',
        requirements: [{ canonical: 'react', kind: 'must' as const }],
      },
      {
        title: 'Desenvolvedor Full Stack Pleno',
        seniority: 'mid',
        requirements: [
          { canonical: 'c#', kind: 'must' as const },
          { canonical: '.net', kind: 'must' as const },
        ],
      },
      {
        title: 'Patient Care Specialist I',
        seniority: null,
        requirements: [],
      },
    ];

    for (const c of cases) {
      const res = classifyJobTrack(c);
      expect(res.inTargetScope).toBe(false);
      expect(res.primaryTrack).toBe('out_of_scope');
      expect(jobMatchesTrackFilter(res, 'target')).toBe(false);
      expect(jobMatchesTrackFilter(res, 'out_of_scope')).toBe(true);
    }
  });
});
