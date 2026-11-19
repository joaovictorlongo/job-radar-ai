import { existsSync, readFileSync } from 'node:fs';
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

function readFloat(name: string, fallback: number | null): number | null {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} precisa ser número não negativo`);
  }
  return value;
}

function readApiKey(): string | null {
  const file = process.env.LLM_API_KEY_FILE;
  if (file !== undefined && file.trim() !== '') {
    if (!existsSync(file)) {
      throw new Error(`LLM_API_KEY_FILE não existe: ${file}`);
    }
    return readFileSync(file, 'utf8').trim();
  }
  const inline = process.env.LLM_API_KEY;
  return inline === undefined || inline.trim() === '' ? null : inline.trim();
}

export interface LlmConfig {
  provider: 'openai-compatible' | 'opencode-cli';
  baseUrl: string;
  model: string;
  apiKey: string | null;
  promptVersion: string;
  schemaVersion: string;
  structuredMode: 'json_schema' | 'json_object' | 'none';
  priceInputPerMillion: number | null;
  priceOutputPerMillion: number | null;
  requestIntervalMs: number;
  timeoutMs: number;
  maxRetries: number;
}

export interface WorkerConfig {
  databaseUrl: string;
  userAgent: string;
  requestIntervalMs: number;
  maxRetries: number;
  llm: LlmConfig;
}

function readProvider(): LlmConfig['provider'] {
  const raw = process.env.LLM_PROVIDER ?? 'openai-compatible';
  if (raw === 'openai-compatible' || raw === 'opencode-cli') {
    return raw;
  }
  throw new Error('LLM_PROVIDER precisa ser openai-compatible ou opencode-cli');
}

function readStructuredMode(): LlmConfig['structuredMode'] {
  const raw = process.env.LLM_STRUCTURED_MODE ?? 'json_schema';
  if (raw === 'json_schema' || raw === 'json_object' || raw === 'none') {
    return raw;
  }
  throw new Error('LLM_STRUCTURED_MODE precisa ser json_schema, json_object ou none');
}

export function loadConfig(): WorkerConfig {
  return {
    databaseUrl: process.env.DATABASE_URL ?? 'postgres://jobradar:jobradar@localhost:55432/jobradar',
    userAgent:
      process.env.COLLECTOR_USER_AGENT ??
      'job-radar-ai/0.1 (+https://github.com/joaovictorlongo/job-radar-ai)',
    requestIntervalMs: readInt('COLLECTOR_REQUEST_INTERVAL_MS', 1000),
    maxRetries: readInt('COLLECTOR_MAX_RETRIES', 3),
    llm: {
      provider: readProvider(),
      baseUrl: process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1',
      model: process.env.LLM_MODEL ?? 'gpt-4o-mini',
      apiKey: readApiKey(),
      promptVersion: process.env.LLM_PROMPT_VERSION ?? 'extract-v1',
      schemaVersion: process.env.LLM_SCHEMA_VERSION ?? 'extract-schema-v1',
      structuredMode: readStructuredMode(),
      priceInputPerMillion: readFloat('LLM_PRICE_INPUT_PER_MTOK', null),
      priceOutputPerMillion: readFloat('LLM_PRICE_OUTPUT_PER_MTOK', null),
      requestIntervalMs: readInt('LLM_REQUEST_INTERVAL_MS', 1000),
      timeoutMs: readInt('LLM_TIMEOUT_MS', 90_000),
      maxRetries: readInt('LLM_MAX_RETRIES', 3),
    },
  };
}
