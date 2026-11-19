import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { Client } from 'pg';

const MIGRATIONS_DIR = fileURLToPath(new URL('../db/migrations', import.meta.url));

function databaseUrl(): string {
  return process.env.DATABASE_URL ?? 'postgres://jobradar:jobradar@localhost:55432/jobradar';
}

async function listMigrations(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries.filter((name) => name.endsWith('.sql')).sort();
}

async function main(): Promise<void> {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    await client.query('select pg_advisory_lock(hashtext($1))', ['job-radar-migrations']);
    await client.query(`create table if not exists schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )`);
    const appliedResult = await client.query<{ version: string }>('select version from schema_migrations');
    const applied = new Set(appliedResult.rows.map((row) => row.version));
    const versions = await listMigrations();

    for (const version of versions) {
      if (applied.has(version)) {
        continue;
      }
      const sql = await readFile(join(MIGRATIONS_DIR, version), 'utf8');
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into schema_migrations (version) values ($1)', [version]);
        await client.query('commit');
        console.log(`aplicada: ${version}`);
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    }
    console.log(`migrations ok: ${versions.length} arquivo(s), ${applied.size} já aplicada(s)`);
  } finally {
    await client.query('select pg_advisory_unlock(hashtext($1))', ['job-radar-migrations']);
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`falha na migration: ${message}`);
  process.exitCode = 1;
});
