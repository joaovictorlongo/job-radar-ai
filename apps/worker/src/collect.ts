import { parseArgs } from 'node:util';
import { loadConfig } from './config.js';
import { HttpClient } from './http/client.js';
import { createPool, upsertJob, type UpsertStatus } from './persist/jobs-repo.js';
import { createSource } from './sources/index.js';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      source: { type: 'string' },
      limit: { type: 'string', default: '20' },
      'dry-run': { type: 'boolean', default: false },
    },
    strict: true,
  });

  const sourceName = values.source;
  if (sourceName === undefined) {
    throw new Error('informe --source (programathor | remoteok | github)');
  }
  const limit = Number.parseInt(values.limit ?? '20', 10);
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error('--limit precisa ser inteiro positivo');
  }

  const config = loadConfig();
  const http = new HttpClient({
    userAgent: config.userAgent,
    intervalMs: config.requestIntervalMs,
    maxRetries: config.maxRetries,
  });
  const source = createSource(sourceName, http);
  const pool = createPool(config.databaseUrl);

  const counts: Record<UpsertStatus, number> = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    duplicate_hash: 0,
  };
  const startedAt = Date.now();
  let seen = 0;
  let error: string | null = null;

  try {
    for await (const job of source.fetchJobs(limit)) {
      if (values['dry-run'] === true) {
        seen += 1;
        console.error(`[dry-run] ${job.source} ${job.sourceJobId} ${job.title}`);
        continue;
      }
      const result = await upsertJob(pool, job);
      counts[result.status] += 1;
      seen += 1;
      console.error(`[${result.status}] ${job.source} ${job.sourceJobId} ${job.title}`);
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
    console.error(`coleta interrompida: ${error}`);
  } finally {
    await pool.end();
  }

  const summary = {
    source: source.name,
    requested: limit,
    fetched: seen,
    ...counts,
    dryRun: values['dry-run'] === true,
    elapsedMs: Date.now() - startedAt,
    ...(error === null ? {} : { error }),
  };
  console.log(JSON.stringify(summary, null, 2));
  if (seen === 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`falha na coleta: ${message}`);
  process.exitCode = 1;
});
