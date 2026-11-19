import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseProgramathorDetail, parseProgramathorList } from './programathor.js';

const listHtml = readFileSync(new URL('../../fixtures/programathor-list.html', import.meta.url), 'utf8');
const jobHtml = readFileSync(new URL('../../fixtures/programathor-job.html', import.meta.url), 'utf8');
const JOB_URL =
  'https://programathor.com.br/jobs/33685-desenvolvedor-back-end-senior-ai-engineer';

describe('parseProgramathorList', () => {
  it('extrai cards reais sem duplicar', () => {
    const items = parseProgramathorList(listHtml);
    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(new Set(items.map((item) => item.sourceJobId)).size).toBe(items.length);
    const first = items[0];
    expect(first?.sourceJobId).toBe('33724');
    expect(first?.url).toBe('https://programathor.com.br/jobs/33724-desenvolvedor-a-mobile-flutter-senior');
    expect(first?.title.length).toBeGreaterThan(0);
  });

  it('não trata link de filtro como vaga', () => {
    const items = parseProgramathorList('<a href="/jobs?page=2">2</a>');
    expect(items).toEqual([]);
  });
});

describe('parseProgramathorDetail', () => {
  const job = parseProgramathorDetail(jobHtml, JOB_URL);

  it('mapeia título, empresa e origem', () => {
    expect(job.source).toBe('programathor');
    expect(job.sourceJobId).toBe('33685');
    expect(job.title).toBe('Desenvolvedor Back-End Senior (AI Engineer)');
    expect(job.company).toContain('LOLDESIGN');
    expect(job.country).toBe('BR');
    expect(job.lang).toBe('pt');
  });

  it('deriva modelo de trabalho, senioridade e contratos do HTML', () => {
    expect(job.workModel).toBe('remote');
    expect(job.seniority).toBe('senior');
    expect(job.employmentType).toBe('PJ');
    expect(job.postedAt).toBe('2026-07-25');
  });

  it('mantém a descrição para a extração com LLM', () => {
    expect(job.description).toContain('Requisitos');
    expect(job.description).toContain('Python');
    expect(job.description.length).toBeGreaterThan(500);
  });
});
