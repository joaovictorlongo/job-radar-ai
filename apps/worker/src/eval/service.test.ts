import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { runEvaluation, seedLabels } from './service.js';
import type { GoldDataset } from '@job-radar/shared';

describe('eval service', () => {
  it('seeds labels into the database transactionally', async () => {
    const queryMock = vi.fn().mockResolvedValue({ rows: [] });
    const releaseMock = vi.fn();
    const poolMock = {
      connect: vi.fn().mockResolvedValue({
        query: queryMock,
        release: releaseMock,
      }),
    } as unknown as Pool;

    const dataset: GoldDataset = {
      version: 'v1',
      description: 'Gold dataset v1',
      createdAt: '2026-11-19T00:00:00Z',
      items: [
        {
          jobId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
          source: 'programathor',
          sourceJobId: '1001',
          title: 'Senior Node Developer',
          descriptionHash: 'hash1',
          annotator: 'evaluator-1',
          pass: 1,
          labels: {
            seniority: 'senior',
            workModel: 'remote',
            salaryPublished: false,
            years: 5,
            stackMust: ['node.js', 'typescript'],
            stackNice: ['aws'],
          },
        },
      ],
    };

    const inserted = await seedLabels(poolMock, dataset);
    expect(inserted).toBe(6); // 6 fields for 1 item
    expect(queryMock).toHaveBeenCalledWith('BEGIN');
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalled();
  });

  it('runs evaluation and returns evaluated gates and metrics', async () => {
    const queryMock = vi.fn().mockImplementation((queryText: string) => {
      if (queryText.includes('from labels')) {
        return {
          rows: [
            {
              job_id: 'job-1',
              field: 'seniority',
              value: 'senior',
              annotator: 'a1',
              pass: 1,
            },
            {
              job_id: 'job-1',
              field: 'work_model',
              value: 'remote',
              annotator: 'a1',
              pass: 1,
            },
            {
              job_id: 'job-1',
              field: 'salary_published',
              value: false,
              annotator: 'a1',
              pass: 1,
            },
            {
              job_id: 'job-1',
              field: 'years',
              value: 5,
              annotator: 'a1',
              pass: 1,
            },
            {
              job_id: 'job-1',
              field: 'stack_must',
              value: ['typescript', 'node.js'],
              annotator: 'a1',
              pass: 1,
            },
            {
              job_id: 'job-1',
              field: 'stack_nice',
              value: [],
              annotator: 'a1',
              pass: 1,
            },
            // Pass 2 for job-1
            {
              job_id: 'job-1',
              field: 'seniority',
              value: 'senior',
              annotator: 'a2',
              pass: 2,
            },
          ],
        };
      }
      if (queryText.includes('from jobs')) {
        return {
          rows: [
            {
              id: 'job-1',
              seniority: 'senior',
              work_model: 'remote',
              salary_published: false,
              salary_min: null,
              salary_max: null,
              salary_currency: null,
              years_required: '5.0',
            },
          ],
        };
      }
      if (queryText.includes('from job_requirements')) {
        return {
          rows: [
            { job_id: 'job-1', canonical: 'typescript', kind: 'must' },
            { job_id: 'job-1', canonical: 'node.js', kind: 'must' },
          ],
        };
      }
      if (queryText.includes('from extraction_runs')) {
        return {
          rows: [
            {
              total_runs: '1',
              ok_count: '1',
              invalid_json_count: '0',
              grounding_failed_count: '0',
              error_count: '0',
              p50_ms: 1200,
              p95_ms: 1200,
              min_ms: 1200,
              max_ms: 1200,
              total_cost_usd: '0.0001',
              p50_cost_usd: 0.0001,
              p95_cost_usd: 0.0001,
            },
          ],
        };
      }
      if (queryText.includes('insert into eval_runs')) {
        return { rows: [{ id: '42' }] };
      }
      return { rows: [] };
    });

    const poolMock = {
      query: queryMock,
    } as unknown as Pool;

    const summary = await runEvaluation(poolMock, {
      datasetVersion: 'dataset-v1',
      extractorVersion: 'extract-v2',
      save: true,
    });

    expect(summary.evalRunId).toBe(42);
    expect(summary.nJobs).toBe(1);
    expect(summary.metrics.seniority.accuracy).toBe(1);
    expect(summary.metrics.workModel.accuracy).toBe(1);
    expect(summary.metrics.stackMust.micro.f1).toBe(1);
    expect(summary.metrics.salary.falsePositives).toBe(0);
    expect(summary.metrics.cohensKappa?.kappa).toBe(1);
    expect(summary.gates.hardGatesPassed).toBe(true);
    expect(summary.gates.approved).toBe(true);
  });
});
