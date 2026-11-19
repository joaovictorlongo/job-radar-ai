import type { Pool } from 'pg';
import {
  computeClassificationMetrics,
  computeCohensKappa,
  computeMultiLabelMetrics,
  computeNumericToleranceMetrics,
  computeSalaryMetrics,
  evaluateGates,
  type GoldDataset,
} from '@job-radar/shared';
import type { EvalOptions, EvalRunSummary } from './types.js';

export async function seedLabels(pool: Pool, dataset: GoldDataset): Promise<number> {
  let inserted = 0;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of dataset.items) {
      const { jobId, annotator, pass, labels } = item;

      const fields: Array<{ field: string; value: unknown }> = [
        { field: 'seniority', value: labels.seniority },
        { field: 'work_model', value: labels.workModel },
        { field: 'salary_published', value: labels.salaryPublished },
        { field: 'years', value: labels.years },
        { field: 'stack_must', value: labels.stackMust },
        { field: 'stack_nice', value: labels.stackNice },
      ];

      for (const { field, value } of fields) {
        await client.query(
          `insert into labels (job_id, field, value, annotator, pass)
           values ($1, $2, $3, $4, $5)
           on conflict (job_id, field, annotator, pass)
           do update set value = excluded.value, annotated_at = now()`,
          [jobId, field, JSON.stringify(value), annotator, pass],
        );
        inserted += 1;
      }
    }
    await client.query('COMMIT');
    return inserted;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

interface PredictedJobRow {
  id: string;
  seniority: string | null;
  work_model: string | null;
  salary_published: boolean;
  salary_min: string | null;
  salary_max: string | null;
  salary_currency: string | null;
  years_required: string | null;
}

interface RequirementRow {
  job_id: string;
  canonical: string;
  kind: 'must' | 'nice';
}

interface RunStatsRow {
  total_runs: string;
  ok_count: string;
  invalid_json_count: string;
  grounding_failed_count: string;
  error_count: string;
  p50_ms: number | null;
  p95_ms: number | null;
  min_ms: number | null;
  max_ms: number | null;
  total_cost_usd: string | null;
  p50_cost_usd: number | null;
  p95_cost_usd: number | null;
}

interface LabelRow {
  job_id: string;
  field: string;
  value: unknown;
  annotator: string;
  pass: number;
}

export async function runEvaluation(pool: Pool, options: EvalOptions): Promise<EvalRunSummary> {
  const { datasetVersion, extractorVersion, save = true } = options;

  // 1. Carrega labels do banco
  const labelsRes = await pool.query<LabelRow>(
    `select job_id, field, value, annotator, pass from labels order by job_id, pass, field`,
  );

  if (labelsRes.rows.length === 0) {
    throw new Error('Nenhum rótulo encontrado na tabela labels. Execute seed-labels primeiro.');
  }

  // Agrupa rótulos por job_id e pass
  const pass1Map = new Map<string, Record<string, unknown>>();
  const pass2Map = new Map<string, Record<string, unknown>>();

  for (const row of labelsRes.rows) {
    const targetMap = row.pass === 1 ? pass1Map : pass2Map;
    let jobLabels = targetMap.get(row.job_id);
    if (!jobLabels) {
      jobLabels = {};
      targetMap.set(row.job_id, jobLabels);
    }
    jobLabels[row.field] = row.value;
  }

  const jobIds = [...pass1Map.keys()];
  if (jobIds.length === 0) {
    throw new Error('Nenhum job com pass 1 encontrado na tabela labels.');
  }

  // 2. Busca predições de jobs
  const jobsRes = await pool.query<PredictedJobRow>(
    `select id, seniority, work_model, salary_published, salary_min, salary_max, salary_currency, years_required
     from jobs
     where id = any($1::uuid[]) and extractor_version = $2`,
    [jobIds, extractorVersion],
  );

  const jobsMap = new Map(jobsRes.rows.map((j) => [j.id, j]));

  // 3. Busca requisitos preditos
  const reqsRes = await pool.query<RequirementRow>(
    `select jr.job_id, r.canonical, jr.kind
     from job_requirements jr
     join requirements r on r.id = jr.requirement_id
     join jobs j on j.id = jr.job_id
     where jr.job_id = any($1::uuid[]) and j.extractor_version = $2`,
    [jobIds, extractorVersion],
  );

  const reqsMap = new Map<string, { must: string[]; nice: string[] }>();
  for (const req of reqsRes.rows) {
    let entry = reqsMap.get(req.job_id);
    if (!entry) {
      entry = { must: [], nice: [] };
      reqsMap.set(req.job_id, entry);
    }
    if (req.kind === 'must') {
      entry.must.push(req.canonical);
    } else {
      entry.nice.push(req.canonical);
    }
  }

  // 4. Monta pares para as métricas
  const seniorityPairs: Array<{ expected: string; predicted: string }> = [];
  const workModelPairs: Array<{ expected: string; predicted: string }> = [];
  const salaryPairs: Array<{
    expected: { published: boolean; min?: number | null; max?: number | null; currency?: string | null };
    predicted: { published: boolean; min?: number | null; max?: number | null; currency?: string | null };
  }> = [];
  const yearsPairs: Array<{ expected: number | null; predicted: number | null }> = [];
  const stackMustPairs: Array<{ expected: readonly string[]; predicted: readonly string[] }> = [];
  const stackNicePairs: Array<{ expected: readonly string[]; predicted: readonly string[] }> = [];

  let evaluatedJobsCount = 0;

  for (const [jobId, expected] of pass1Map) {
    const predicted = jobsMap.get(jobId);
    if (!predicted) {
      continue; // Job não foi extraído por esta versão de extrator
    }
    evaluatedJobsCount += 1;

    // Seniority
    const expSeniority = String(expected['seniority'] ?? 'unknown');
    const predSeniority = predicted.seniority ?? 'unknown';
    seniorityPairs.push({ expected: expSeniority, predicted: predSeniority });

    // Work Model
    const expWorkModel = String(expected['work_model'] ?? 'unknown');
    const predWorkModel = predicted.work_model ?? 'unknown';
    workModelPairs.push({ expected: expWorkModel, predicted: predWorkModel });

    // Salary
    const expSalPub = Boolean(expected['salary_published']);
    salaryPairs.push({
      expected: {
        published: expSalPub,
        min: null,
        max: null,
        currency: null,
      },
      predicted: {
        published: predicted.salary_published,
        min: predicted.salary_min ? Number(predicted.salary_min) : null,
        max: predicted.salary_max ? Number(predicted.salary_max) : null,
        currency: predicted.salary_currency,
      },
    });

    // Years
    const expYears = expected['years'] !== undefined && expected['years'] !== null ? Number(expected['years']) : null;
    const predYears = predicted.years_required !== null ? Number(predicted.years_required) : null;
    yearsPairs.push({ expected: expYears, predicted: predYears });

    // Stack Must & Nice
    const predReqs = reqsMap.get(jobId) ?? { must: [], nice: [] };
    const expMust = Array.isArray(expected['stack_must']) ? (expected['stack_must'] as string[]) : [];
    const expNice = Array.isArray(expected['stack_nice']) ? (expected['stack_nice'] as string[]) : [];

    stackMustPairs.push({ expected: expMust, predicted: predReqs.must });
    stackNicePairs.push({ expected: expNice, predicted: predReqs.nice });
  }

  if (evaluatedJobsCount === 0) {
    throw new Error(
      `Nenhum dos ${jobIds.length} jobs rotulados possui extração com extractor_version='${extractorVersion}'.`,
    );
  }

  // 5. Cohen's Kappa entre Pass 1 e Pass 2
  const kappaPairs: Array<{ pass1: string; pass2: string }> = [];
  for (const [jobId, p1] of pass1Map) {
    const p2 = pass2Map.get(jobId);
    if (!p2) continue;
    // Compara campo seniority
    if (p1['seniority'] !== undefined && p2['seniority'] !== undefined) {
      kappaPairs.push({
        pass1: String(p1['seniority']),
        pass2: String(p2['seniority']),
      });
    }
  }

  // 6. Estatísticas de extração
  const runStatsRes = await pool.query<RunStatsRow>(
    `select
       count(*) as total_runs,
       count(*) filter (where status = 'ok') as ok_count,
       count(*) filter (where status = 'invalid_json') as invalid_json_count,
       count(*) filter (where status = 'grounding_failed') as grounding_failed_count,
       count(*) filter (where status = 'error') as error_count,
       percentile_cont(0.5) within group (order by latency_ms) as p50_ms,
       percentile_cont(0.95) within group (order by latency_ms) as p95_ms,
       min(latency_ms) as min_ms,
       max(latency_ms) as max_ms,
       sum(cost_usd) as total_cost_usd,
       percentile_cont(0.5) within group (order by cost_usd) as p50_cost_usd,
       percentile_cont(0.95) within group (order by cost_usd) as p95_cost_usd
     from extraction_runs
     where prompt_version = $1`,
    [extractorVersion],
  );

  const stats = runStatsRes.rows[0];
  const totalRuns = stats ? Number(stats.total_runs) : 0;
  const invalidJsonCount = stats ? Number(stats.invalid_json_count) : 0;
  const groundingFailedCount = stats ? Number(stats.grounding_failed_count) : 0;
  const okCount = stats ? Number(stats.ok_count) : 0;

  const validJsonRate = totalRuns > 0 ? (totalRuns - invalidJsonCount) / totalRuns : 1;
  const groundingRate = okCount + groundingFailedCount > 0 ? okCount / (okCount + groundingFailedCount) : 1;

  // 7. Calcula métricas
  const seniorityMetrics = computeClassificationMetrics(seniorityPairs);
  const workModelMetrics = computeClassificationMetrics(workModelPairs);
  const salaryMetrics = computeSalaryMetrics(salaryPairs);
  const yearsMetrics = computeNumericToleranceMetrics(yearsPairs, 1);
  const stackMustMetrics = computeMultiLabelMetrics(stackMustPairs);
  const stackNiceMetrics = computeMultiLabelMetrics(stackNicePairs);
  const cohensKappaResult = kappaPairs.length > 0 ? computeCohensKappa(kappaPairs) : undefined;

  // 8. Avalia gates
  const gatesResult = evaluateGates({
    validJsonRate,
    groundingRate,
    seniority: seniorityMetrics,
    workModel: workModelMetrics,
    stackMust: stackMustMetrics,
    stackNice: stackNiceMetrics,
    salary: salaryMetrics,
    years: yearsMetrics,
    cohensKappa: cohensKappaResult,
    costP95Usd: stats?.p95_cost_usd ?? null,
    latencyP95Ms: stats?.p95_ms ?? null,
  });

  const fullMetrics: EvalRunSummary['metrics'] = {
    validJsonRate: round(validJsonRate, 4),
    groundingRate: round(groundingRate, 4),
    seniority: seniorityMetrics,
    workModel: workModelMetrics,
    stackMust: stackMustMetrics,
    stackNice: stackNiceMetrics,
    salary: salaryMetrics,
    years: yearsMetrics,
    cohensKappa: cohensKappaResult,
    latency: {
      p50Ms: stats?.p50_ms ? Math.round(stats.p50_ms) : null,
      p95Ms: stats?.p95_ms ? Math.round(stats.p95_ms) : null,
      minMs: stats?.min_ms ?? null,
      maxMs: stats?.max_ms ?? null,
    },
    cost: {
      totalUsd: stats?.total_cost_usd ? Number(stats.total_cost_usd) : null,
      p50Usd: stats?.p50_cost_usd ?? null,
      p95Usd: stats?.p95_cost_usd ?? null,
    },
  };

  let evalRunId: number | undefined;

  if (save) {
    const saveRes = await pool.query<{ id: string }>(
      `insert into eval_runs (dataset_version, extractor_version, n_jobs, metrics, approved)
       values ($1, $2, $3, $4, $5)
       returning id`,
      [datasetVersion, extractorVersion, evaluatedJobsCount, JSON.stringify(fullMetrics), gatesResult.approved],
    );
    const rawId = saveRes.rows[0]?.id;
    if (rawId) {
      evalRunId = Number(rawId);
    }
  }

  return {
    evalRunId,
    datasetVersion,
    extractorVersion,
    nJobs: evaluatedJobsCount,
    timestamp: new Date().toISOString(),
    gates: gatesResult,
    metrics: fullMetrics,
  };
}

function round(val: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(val * f) / f;
}
