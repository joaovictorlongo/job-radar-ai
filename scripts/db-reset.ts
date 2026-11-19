import { Client } from 'pg';

function databaseUrl(): string {
  return process.env.DATABASE_URL ?? 'postgres://jobradar:jobradar@localhost:55432/jobradar';
}

async function main(): Promise<void> {
  const url = new URL(databaseUrl());
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  if (!localHosts.has(url.hostname)) {
    throw new Error(`db:reset só roda em banco local, host atual: ${url.hostname}`);
  }
  if (!process.argv.includes('--yes')) {
    throw new Error('db:reset apaga o schema public; rode com --yes para confirmar');
  }
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    await client.query('drop schema public cascade');
    await client.query('create schema public');
    console.log('schema public recriado');
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`falha no reset: ${message}`);
  process.exitCode = 1;
});
