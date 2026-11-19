import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { goldDatasetSchema } from '@job-radar/shared';
import { loadConfig } from './config.js';
import { seedLabels } from './eval/service.js';
import { createPool } from './persist/jobs-repo.js';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      file: { type: 'string' },
    },
    strict: true,
  });

  const defaultPath = fileURLToPath(new URL('../../../data/gold/dataset-v1.json', import.meta.url));
  const filePath = values.file ?? defaultPath;

  if (!existsSync(filePath)) {
    throw new Error(`Arquivo de dataset ouro não encontrado: ${filePath}`);
  }

  const raw = readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const dataset = goldDatasetSchema.parse(parsed);

  const config = loadConfig();
  const pool = createPool(config.databaseUrl);

  try {
    const inserted = await seedLabels(pool, dataset);
    console.log(`Sucesso: ${inserted} rótulos gravados para ${dataset.items.length} itens do dataset '${dataset.version}'.`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`falha ao semear rótulos: ${message}`);
  process.exitCode = 1;
});
