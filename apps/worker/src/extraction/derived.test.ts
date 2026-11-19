import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Extraction } from '@job-radar/shared';
import { JOB_DERIVED_COLUMNS, jobDerivedUpdate } from './derived.js';

const extraction: Extraction = {
  seniority: 'senior',
  workModel: 'remote',
  yearsRequired: 5,
  lang: 'en',
  salary: { published: true, min: 12000, max: 15000, currency: 'BRL', period: 'month' },
  requirements: [],
};

function jobsTableColumns(): string[] {
  const sql = readFileSync(new URL('../../../../db/migrations/0001_init.sql', import.meta.url), 'utf8');
  const table = /create table jobs \(([\s\S]*?)\n\);/.exec(sql)?.[1];
  if (table === undefined) {
    throw new Error('tabela jobs não encontrada na migração');
  }
  return [...table.matchAll(/^\s{2}([a-z_]+)\s/gm)].map((match) => match[1] ?? '');
}

describe('jobDerivedUpdate', () => {
  it('mapeia todos os campos derivados e o salário', () => {
    expect(jobDerivedUpdate(extraction, 'extract-v2')).toEqual({
      seniority: 'senior',
      work_model: 'remote',
      lang: 'en',
      years_required: 5,
      salary_published: true,
      salary_min: 12000,
      salary_max: 15000,
      salary_currency: 'BRL',
      salary_period: 'month',
      extractor_version: 'extract-v2',
    });
  });

  it('mantém salário nulo quando não publicado', () => {
    const update = jobDerivedUpdate(
      {
        ...extraction,
        salary: { published: false, min: null, max: null, currency: null, period: null },
      },
      'extract-v2',
    );
    expect(update.salary_published).toBe(false);
    expect(update.salary_min).toBeNull();
    expect(update.salary_currency).toBeNull();
  });

  it('cobre todas as colunas mapeadas', () => {
    expect(Object.keys(jobDerivedUpdate(extraction, 'extract-v2')).sort()).toEqual(
      [...JOB_DERIVED_COLUMNS].sort(),
    );
  });

  it('só escreve colunas que existem na tabela jobs', () => {
    const columns = jobsTableColumns();
    expect(columns.length).toBeGreaterThan(10);
    for (const column of JOB_DERIVED_COLUMNS) {
      expect(columns).toContain(column);
    }
  });
});
