import type { Extraction } from '@job-radar/shared';

export const JOB_DERIVED_COLUMNS = [
  'seniority',
  'work_model',
  'lang',
  'years_required',
  'salary_published',
  'salary_min',
  'salary_max',
  'salary_currency',
  'salary_period',
  'extractor_version',
] as const;

export type JobDerivedUpdate = Record<(typeof JOB_DERIVED_COLUMNS)[number], string | number | boolean | null>;

export function jobDerivedUpdate(extraction: Extraction, extractorVersion: string): JobDerivedUpdate {
  const { salary } = extraction;
  return {
    seniority: extraction.seniority,
    work_model: extraction.workModel,
    lang: extraction.lang,
    years_required: extraction.yearsRequired,
    salary_published: salary.published,
    salary_min: salary.min,
    salary_max: salary.max,
    salary_currency: salary.currency,
    salary_period: salary.period,
    extractor_version: extractorVersion,
  };
}
