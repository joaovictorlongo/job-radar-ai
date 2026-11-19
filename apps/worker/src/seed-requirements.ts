import { REQUIREMENT_CATALOG } from '@job-radar/shared';
import { loadConfig } from './config.js';
import { createPool } from './persist/jobs-repo.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const pool = createPool(config.databaseUrl);
  try {
    let inserted = 0;
    let updated = 0;
    for (const definition of REQUIREMENT_CATALOG) {
      const result = await pool.query<{ inserted: boolean }>(
        `insert into requirements (canonical, category, aliases)
         values ($1, $2, $3)
         on conflict (canonical) do update set
           category = excluded.category,
           aliases = excluded.aliases
         returning (xmax = 0) as inserted`,
        [definition.canonical, definition.category, definition.aliases],
      );
      if (result.rows[0]?.inserted === true) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }
    console.log(JSON.stringify({ catalogSize: REQUIREMENT_CATALOG.length, inserted, updated }));
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`falha no seed: ${message}`);
  process.exitCode = 1;
});
