import type { Pool } from 'pg';
import {
  applyGrounding,
  extractionSchema,
  normalizeExtraction,
  type Extraction,
} from '@job-radar/shared';
import type { ExtractionResponse, LlmExtractor } from '../llm/index.js';
import {
  persistSuccess,
  recordRun,
  type ExtractionRunRecord,
} from './persist.js';

interface JobRow {
  id: string;
  title: string;
  company: string | null;
  location_raw: string | null;
  description: string;
  description_hash: string;
}

export interface RunExtractionOptions {
  source: string;
  limit: number;
  force: boolean;
  dryRun: boolean;
  intervalMs: number;
}

export interface LatencyStats {
  p50: number | null;
  p95: number | null;
}

export interface RunSummary {
  source: string;
  extractorVersion: string;
  model: string;
  processed: number;
  ok: number;
  cacheHits: number;
  invalidJson: number;
  groundingFailed: number;
  errors: number;
  droppedRequirements: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  costKnown: boolean;
  latencyMs: LatencyStats;
  elapsedMs: number;
  dryRun: boolean;
}

function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return JSON.parse(fenced?.[1] ?? trimmed);
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index] ?? null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadJobs(pool: Pool, options: RunExtractionOptions, version: string): Promise<JobRow[]> {
  if (options.source === 'all') {
    const result = await pool.query<JobRow>(
      `select id, title, company, location_raw, description, description_hash
       from jobs
       where ($2 = true or extractor_version is null or extractor_version <> $1)
       order by posted_at desc nulls last, collected_at desc
       limit $3`,
      [version, options.force, options.limit],
    );
    return result.rows;
  }
  const result = await pool.query<JobRow>(
    `select id, title, company, location_raw, description, description_hash
     from jobs
     where source = $1
       and ($3 = true or extractor_version is null or extractor_version <> $2)
     order by posted_at desc nulls last, collected_at desc
     limit $4`,
    [options.source, version, options.force, options.limit],
  );
  return result.rows;
}

async function readCache(
  pool: Pool,
  hash: string,
  version: string,
): Promise<Extraction | null> {
  const result = await pool.query<{ payload: unknown }>(
    `select payload from extraction_cache where description_hash = $1 and extractor_version = $2`,
    [hash, version],
  );
  const payload = result.rows[0]?.payload;
  if (payload === undefined) {
    return null;
  }
  const parsed = extractionSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export async function runExtraction(
  pool: Pool,
  extractor: LlmExtractor,
  options: RunExtractionOptions,
): Promise<RunSummary> {
  const extractorVersion = extractor.promptVersion;
  const jobs = await loadJobs(pool, options, extractorVersion);
  const latencies: number[] = [];
  let ok = 0;
  let cacheHits = 0;
  let invalidJson = 0;
  let groundingFailed = 0;
  let errors = 0;
  let dropped = 0;
  let tokensIn = 0;
  let tokensOut = 0;
  let costUsd = 0;
  let costKnown = true;
  const startedAt = Date.now();

  const baseRun = (job: JobRow): Omit<ExtractionRunRecord, 'status' | 'rawOutput'> => ({
    jobId: job.id,
    model: extractor.model,
    promptVersion: extractor.promptVersion,
    schemaVersion: extractor.schemaVersion,
    tokensIn: null,
    tokensOut: null,
    costUsd: null,
    latencyMs: null,
  });

  for (const job of jobs) {
    if (!options.force) {
      const cached = await readCache(pool, job.description_hash, extractorVersion);
      if (cached !== null) {
        const normalized = normalizeExtraction(cached, job.description);
        const grounded = applyGrounding(normalized, job.description);
        if (!options.dryRun && grounded.extraction !== null) {
          await persistSuccess(pool, {
            jobId: job.id,
            descriptionHash: job.description_hash,
            model: extractor.model,
            extractorVersion,
            payload: normalized,
            requirements: grounded.extraction.requirements,
            run: null,
          });
        }
        cacheHits += 1;
        ok += grounded.extraction === null ? 0 : 1;
        if (grounded.extraction === null) {
          groundingFailed += 1;
          if (!options.dryRun) {
            await recordRun(pool, {
              ...baseRun(job),
              status: 'grounding_failed',
              rawOutput: { cached: true, issues: grounded.issues },
            });
          }
        }
        dropped += grounded.droppedRequirements;
        console.error(`[cache] ${job.title}`);
        continue;
      }
    }

    let response: ExtractionResponse;
    try {
      response = await extractor.extract({
        title: job.title,
        company: job.company,
        locationRaw: job.location_raw,
        description: job.description,
      });
    } catch (error) {
      errors += 1;
      const message = error instanceof Error ? error.message : String(error);
      if (!options.dryRun) {
        await recordRun(pool, {
          ...baseRun(job),
          status: 'error',
          rawOutput: { error: message },
        });
      }
      console.error(`[error] ${job.title}: ${message}`);
      if (options.intervalMs > 0) {
        await sleep(options.intervalMs);
      }
      continue;
    }

    latencies.push(response.latencyMs);
    if (response.tokensIn !== null) {
      tokensIn += response.tokensIn;
    }
    if (response.tokensOut !== null) {
      tokensOut += response.tokensOut;
    }
    if (response.costUsd === null) {
      costKnown = false;
    } else {
      costUsd += response.costUsd;
    }

    const runBase: Omit<ExtractionRunRecord, 'status' | 'rawOutput'> = {
      ...baseRun(job),
      tokensIn: response.tokensIn,
      tokensOut: response.tokensOut,
      costUsd: response.costUsd,
      latencyMs: response.latencyMs,
    };

    let parsedJson: unknown;
    try {
      parsedJson = parseJsonLoose(response.rawText);
    } catch {
      invalidJson += 1;
      if (!options.dryRun) {
        await recordRun(pool, {
          ...runBase,
          status: 'invalid_json',
          rawOutput: { rawText: response.rawText },
        });
      }
      console.error(`[invalid_json] ${job.title}`);
      if (options.intervalMs > 0) {
        await sleep(options.intervalMs);
      }
      continue;
    }

    const parsed = extractionSchema.safeParse(parsedJson);
    if (!parsed.success) {
      invalidJson += 1;
      if (!options.dryRun) {
        await recordRun(pool, {
          ...runBase,
          status: 'invalid_json',
          rawOutput: { value: parsedJson, issues: parsed.error.issues },
        });
      }
      console.error(`[invalid_json] ${job.title}: ${parsed.error.issues[0]?.message ?? 'schema'}`);
      if (options.intervalMs > 0) {
        await sleep(options.intervalMs);
      }
      continue;
    }

    const normalized = normalizeExtraction(parsed.data, job.description);
    const grounded = applyGrounding(normalized, job.description);
    dropped += grounded.droppedRequirements;

    if (grounded.extraction === null) {
      groundingFailed += 1;
      if (!options.dryRun) {
        await recordRun(pool, {
          ...runBase,
          status: 'grounding_failed',
          rawOutput: {
            value: parsedJson,
            issues: grounded.issues,
          },
        });
      }
      console.error(`[grounding_failed] ${job.title}`);
      if (options.intervalMs > 0) {
        await sleep(options.intervalMs);
      }
      continue;
    }

    if (!options.dryRun) {
      await persistSuccess(pool, {
        jobId: job.id,
        descriptionHash: job.description_hash,
        model: extractor.model,
        extractorVersion,
        payload: normalized,
        requirements: grounded.extraction.requirements,
        run: {
          ...runBase,
          status: 'ok',
          rawOutput: parsedJson,
        },
      });
    } else {
      console.error(JSON.stringify(grounded.extraction));
    }
    ok += 1;
    console.error(
      `[ok] ${job.title} (${parsed.data.requirements.length} requisitos, ${response.latencyMs} ms)`,
    );
    if (options.intervalMs > 0) {
      await sleep(options.intervalMs);
    }
  }

  return {
    source: options.source,
    extractorVersion,
    model: extractor.model,
    processed: jobs.length,
    ok,
    cacheHits,
    invalidJson,
    groundingFailed,
    errors,
    droppedRequirements: dropped,
    tokensIn,
    tokensOut,
    costUsd,
    costKnown,
    latencyMs: { p50: percentile(latencies, 50), p95: percentile(latencies, 95) },
    elapsedMs: Date.now() - startedAt,
    dryRun: options.dryRun,
  };
}
