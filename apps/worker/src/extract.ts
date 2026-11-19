import { parseArgs } from 'node:util';
import { loadConfig } from './config.js';
import { runExtraction } from './extraction/run.js';
import { createExtractor } from './llm/index.js';
import { createPool } from './persist/jobs-repo.js';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      source: { type: 'string', default: 'programathor' },
      limit: { type: 'string', default: '20' },
      force: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
    strict: true,
  });

  const limit = Number.parseInt(values.limit ?? '20', 10);
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error('--limit precisa ser inteiro positivo');
  }

  const config = loadConfig();
  const extractor = createExtractor(config.llm);
  const pool = createPool(config.databaseUrl);

  console.error(
    `modelo: ${extractor.model} | base: ${config.llm.baseUrl} | structured: ${config.llm.structuredMode} | prompt: ${extractor.promptVersion}`,
  );

  try {
    const summary = await runExtraction(pool, extractor, {
      source: values.source ?? 'programathor',
      limit,
      force: values.force === true,
      dryRun: values['dry-run'] === true,
      intervalMs: config.llm.requestIntervalMs,
    });
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`falha na extração: ${message}`);
  process.exitCode = 1;
});
