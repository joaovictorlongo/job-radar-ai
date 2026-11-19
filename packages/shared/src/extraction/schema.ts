import { z } from 'zod';

export const SENIORITY_VALUES = ['intern', 'junior', 'mid', 'senior', 'lead', 'unknown'] as const;
export const WORK_MODEL_VALUES = ['remote', 'hybrid', 'onsite', 'unknown'] as const;
export const SALARY_PERIOD_VALUES = ['month', 'year', 'hour', 'unknown'] as const;
export const SALARY_CURRENCY_VALUES = ['BRL', 'USD', 'EUR', 'GBP'] as const;
export const LANGUAGE_VALUES = ['pt', 'en'] as const;
export const REQUIREMENT_KIND_VALUES = ['must', 'nice'] as const;

export const extractedSalarySchema = z
  .object({
    published: z.boolean(),
    min: z.number().min(0).max(1_000_000).nullable(),
    max: z.number().min(0).max(1_000_000).nullable(),
    currency: z.enum(SALARY_CURRENCY_VALUES).nullable(),
    period: z.enum(SALARY_PERIOD_VALUES).nullable(),
  })
  .strict()
  .superRefine((salary, ctx) => {
    if (!salary.published) {
      if (salary.min !== null || salary.max !== null || salary.currency !== null || salary.period !== null) {
        ctx.addIssue({
          code: 'custom',
          message: 'salary_published=false exige min, max, currency e period nulos',
        });
      }
      return;
    }
    if (salary.min === null && salary.max === null) {
      ctx.addIssue({ code: 'custom', message: 'salary_published=true exige min ou max' });
    }
    if (salary.currency === null) {
      ctx.addIssue({ code: 'custom', message: 'salary_published=true exige currency' });
    }
    if (salary.period === null || salary.period === 'unknown') {
      ctx.addIssue({ code: 'custom', message: 'salary_published=true exige period conhecido' });
    }
    if (salary.min !== null && salary.max !== null && salary.min > salary.max) {
      ctx.addIssue({ code: 'custom', message: 'salary_min não pode ser maior que salary_max' });
    }
  });

export const extractedRequirementSchema = z
  .object({
    requirement: z.string().min(1).max(80),
    kind: z.enum(REQUIREMENT_KIND_VALUES),
    minYears: z.number().min(0).max(40).nullable(),
    evidenceSpan: z.string().min(8).max(400),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export const extractionSchema = z
  .object({
    seniority: z.enum(SENIORITY_VALUES),
    workModel: z.enum(WORK_MODEL_VALUES),
    yearsRequired: z.number().min(0).max(40).nullable(),
    lang: z.enum(LANGUAGE_VALUES),
    salary: extractedSalarySchema,
    requirements: z.array(extractedRequirementSchema).max(40),
  })
  .strict();

export type Extraction = z.infer<typeof extractionSchema>;
export type ExtractedRequirement = z.infer<typeof extractedRequirementSchema>;
export type ExtractedSalary = z.infer<typeof extractedSalarySchema>;
export type Seniority = (typeof SENIORITY_VALUES)[number];
export type WorkModel = (typeof WORK_MODEL_VALUES)[number];
