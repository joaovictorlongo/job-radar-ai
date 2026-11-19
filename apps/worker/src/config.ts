import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT_ENV = fileURLToPath(new URL('../../../.env', import.meta.url));

if (existsSync(ROOT_ENV)) {
  process.loadEnvFile(ROOT_ENV);
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} precisa ser inteiro não negativo`);
  }
  return value;
}

export interface WorkerConfig {
  databaseUrl: string;
  userAgent: string;
  requestIntervalMs: number;
  maxRetries: number;
}

export function loadConfig(): WorkerConfig {
  return {
    databaseUrl: process.env.DATABASE_URL ?? 'postgres://jobradar:jobradar@localhost:55432/jobradar',
    userAgent:
      process.env.COLLECTOR_USER_AGENT ??
      'job-radar-ai/0.1 (+https://github.com/joaovictorlongo/job-radar-ai)',
    requestIntervalMs: readInt('COLLECTOR_REQUEST_INTERVAL_MS', 1000),
    maxRetries: readInt('COLLECTOR_MAX_RETRIES', 3),
  };
}
