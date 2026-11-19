import { z } from 'zod';
import {
  SALARY_CURRENCY_VALUES,
  SALARY_PERIOD_VALUES,
  SENIORITY_VALUES,
  WORK_MODEL_VALUES,
} from '../extraction/schema.js';

export const goldLabelFieldsSchema = z
  .object({
    seniority: z.enum(SENIORITY_VALUES),
    workModel: z.enum(WORK_MODEL_VALUES),
    salaryPublished: z.boolean(),
    salary: z
      .object({
        currency: z.enum(SALARY_CURRENCY_VALUES).nullable(),
        period: z.enum(SALARY_PERIOD_VALUES).nullable(),
        min: z.number().nullable(),
        max: z.number().nullable(),
      })
      .optional(),
    years: z.number().nullable(),
    stackMust: z.array(z.string()),
    stackNice: z.array(z.string()).default([]),
  })
  .strict();

export type GoldLabelFields = z.infer<typeof goldLabelFieldsSchema>;

export const labeledJobSchema = z
  .object({
    jobId: z.string().uuid(),
    source: z.string(),
    sourceJobId: z.string(),
    title: z.string(),
    descriptionHash: z.string(),
    labels: goldLabelFieldsSchema,
    annotator: z.string(),
    pass: z.union([z.literal(1), z.literal(2)]).default(1),
  })
  .strict();

export type LabeledJob = z.infer<typeof labeledJobSchema>;

export const goldDatasetSchema = z
  .object({
    version: z.string(),
    description: z.string(),
    createdAt: z.string(),
    items: z.array(labeledJobSchema),
  })
  .strict();

export type GoldDataset = z.infer<typeof goldDatasetSchema>;
