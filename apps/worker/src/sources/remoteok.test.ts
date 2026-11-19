import { describe, expect, it } from 'vitest';
import { isEngineeringRemoteOkItem, parseRemoteOkJob, parseRemoteOkPayload } from './remoteok.js';

const payload = [
  { last_updated: 1795017649, legal: 'API Terms of Service' },
  {
    id: '1137799',
    slug: 'remote-expert-talent-pool-physical-ai-clera-1137799',
    company: 'Clera',
    position: 'Expert Talent Pool - Physical AI',
    location: 'Worldwide',
    date: '2026-11-17T00:00:29+00:00',
    description: '<p>Build <strong>robotics</strong> systems.</p><ul><li>Python</li></ul>',
  },
  { id: 'x', position: 42 },
];

describe('parseRemoteOkPayload', () => {
  it('ignora o aviso legal e entradas inválidas', () => {
    const items = parseRemoteOkPayload(payload);
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('1137799');
  });

  it('rejeita payload que não é lista', () => {
    expect(() => parseRemoteOkPayload({})).toThrow();
  });
});

describe('parseRemoteOkJob', () => {
  it('normaliza HTML para texto e monta a URL', () => {
    const items = parseRemoteOkPayload(payload);
    const job = parseRemoteOkJob(items[0]!);
    expect(job.source).toBe('remoteok');
    expect(job.sourceJobId).toBe('1137799');
    expect(job.url).toBe(
      'https://remoteok.com/remote-jobs/remote-expert-talent-pool-physical-ai-clera-1137799',
    );
    expect(job.workModel).toBe('remote');
    expect(job.lang).toBe('en');
    expect(job.postedAt).toBe('2026-11-17');
    expect(job.description).toContain('Build robotics systems');
    expect(job.description).toContain('Python');
  });
});

describe('isEngineeringRemoteOkItem', () => {
  it('aceita vagas de engenharia/IA e rejeita vagas não técnicas', () => {
    expect(
      isEngineeringRemoteOkItem({ position: 'Senior Full Stack Engineer', tags: ['node', 'react'] }),
    ).toBe(true);
    expect(
      isEngineeringRemoteOkItem({ position: 'Software Engineer AI Tooling', tags: ['ai'] }),
    ).toBe(true);
    expect(isEngineeringRemoteOkItem({ position: 'Patient Care Specialist I', tags: [] })).toBe(
      false,
    );
    expect(isEngineeringRemoteOkItem({ position: 'Scaled Account Manager EMEA', tags: [] })).toBe(
      false,
    );
  });
});
