import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { loadConfig } from './config.js';
import { createPool } from './persist/jobs-repo.js';
import { syncProfile } from './profile/service.js';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      dir: { type: 'string' },
      version: { type: 'string', default: 'v1' },
    },
    strict: true,
  });

  const defaultDir = fileURLToPath(new URL('../../../profile', import.meta.url));
  const profileDir = values.dir ?? defaultDir;
  const version = values.version ?? 'v1';

  const config = loadConfig();
  const pool = createPool(config.databaseUrl);

  try {
    console.log(`Sincronizando chunks de perfil de: ${profileDir} (versão: ${version})...`);
    const count = await syncProfile(pool, { profileDir, version });
    console.log(`Sucesso: ${count} chunks indexados e persistidos em profile_chunks com pgvector.`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`falha na sincronização do perfil: ${message}`);
  process.exitCode = 1;
});
