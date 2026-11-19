import type { Pool, PoolClient } from 'pg';
import type { GroundedRequirement, Extraction } from '@job-radar/shared';
import { jobDerivedUpdate, type JobDerivedUpdate } from './derived.js';

export type ExtractionStatus = 'ok' | 'invalid_json' | 'grounding_failed' | 'error';

export interface ExtractionRunRecord {
  jobId: string;
  model: string;
  promptVersion: string;
  schemaVersion: string;
  status: ExtractionStatus;
  tokensIn: number | null;
  tokensOut: number | null;
  costUsd: number | null;
  latencyMs: number | null;
  rawOutput: unknown;
}

export interface PersistSuccessInput {
  jobId: string;
  descriptionHash: string;
  model: string;
  extractorVersion: string;
  payload: Extraction;
  requirements: GroundedRequirement[];
  run: ExtractionRunRecord | null;
}

export async function recordRun(pool: Pool, record: ExtractionRunRecord): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `insert into extraction_runs (
       job_id, model, prompt_version, schema_version, status,
       tokens_in, tokens_out, cost_usd, latency_ms, raw_output
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     returning id`,
    [
      record.jobId,
      record.model,
      record.promptVersion,
      record.schemaVersion,
      record.status,
      record.tokensIn,
      record.tokensOut,
      record.costUsd,
      record.latencyMs,
      record.rawOutput,
    ],
  );
  const id = result.rows[0]?.id;
  if (id === undefined) {
    throw new Error('insert em extraction_runs não retornou id');
  }
  return id;
}

function dedupeRequirements(requirements: GroundedRequirement[]): GroundedRequirement[] {
  const byKey = new Map<string, GroundedRequirement>();
  for (const requirement of requirements) {
    const key = `${requirement.canonical}::${requirement.kind}`;
    const current = byKey.get(key);
    if (current === undefined || requirement.confidence > current.confidence) {
      byKey.set(key, requirement);
    }
  }
  return [...byKey.values()];
}

async function requirementId(client: PoolClient, requirement: GroundedRequirement): Promise<number> {
  const inserted = await client.query<{ id: number }>(
    `insert into requirements (canonical, category)
     values ($1, $2)
     on conflict (canonical) do update set category = excluded.category
     returning id`,
    [requirement.canonical, requirement.category],
  );
  const id = inserted.rows[0]?.id;
  if (id === undefined) {
    throw new Error(`não foi possível resolver o requisito ${requirement.canonical}`);
  }
  return id;
}

export async function persistSuccess(pool: Pool, input: PersistSuccessInput): Promise<string | null> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    let runId: string | null = null;
    if (input.run !== null) {
      const runResult = await client.query<{ id: string }>(
        `insert into extraction_runs (
           job_id, model, prompt_version, schema_version, status,
           tokens_in, tokens_out, cost_usd, latency_ms, raw_output
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         returning id`,
        [
          input.run.jobId,
          input.run.model,
          input.run.promptVersion,
          input.run.schemaVersion,
          input.run.status,
          input.run.tokensIn,
          input.run.tokensOut,
          input.run.costUsd,
          input.run.latencyMs,
          input.run.rawOutput,
        ],
      );
      runId = runResult.rows[0]?.id ?? null;
      if (runId === null) {
        throw new Error('insert em extraction_runs não retornou id');
      }
    }
    const derived = jobDerivedUpdate(input.payload, input.extractorVersion);
    const entries = Object.entries(derived) as Array<[string, JobDerivedUpdate[keyof JobDerivedUpdate]]>;
    const assignments = entries.map(([column], index) => `${column} = $${index + 2}`).join(',\n         ');
    await client.query(
      `update jobs set
         ${assignments}
       where id = $1`,
      [input.jobId, ...entries.map(([, value]) => value)],
    );

    await client.query('delete from job_requirements where job_id = $1', [input.jobId]);
    for (const requirement of dedupeRequirements(input.requirements)) {
      const id = await requirementId(client, requirement);
      await client.query(
        `insert into job_requirements (
           job_id, requirement_id, kind, min_years, evidence_span, confidence, extractor_version
         ) values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (job_id, requirement_id, kind) do update set
           min_years = excluded.min_years,
           evidence_span = excluded.evidence_span,
           confidence = excluded.confidence,
           extractor_version = excluded.extractor_version`,
        [
          input.jobId,
          id,
          requirement.kind,
          requirement.minYears,
          requirement.evidenceSpan,
          requirement.confidence,
          input.extractorVersion,
        ],
      );
    }

    await client.query(
      `insert into extraction_cache (description_hash, extractor_version, model, payload)
       values ($1,$2,$3,$4)
       on conflict (description_hash, extractor_version) do update set
         model = excluded.model,
         payload = excluded.payload`,
      [input.descriptionHash, input.extractorVersion, input.model, input.payload],
    );

    await client.query('commit');
    return runId;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
