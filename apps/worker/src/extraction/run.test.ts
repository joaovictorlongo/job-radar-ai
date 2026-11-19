import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Extraction } from '@job-radar/shared';
import type { ExtractionResponse, LlmExtractor } from '../llm/index.js';
import { runExtraction, type RunExtractionOptions } from './run.js';

interface Job {
  id: string;
  title: string;
  company: string | null;
  location_raw: string | null;
  description: string;
  description_hash: string;
}

interface Query {
  sql: string;
  params: unknown[];
}

const description =
  'Vaga: Desenvolvedor Node.js Sênior. Requisitos: experiência com Node.js e PostgreSQL. ' +
  'Salário: não informado. Trabalho remoto.';

const job: Job = {
  id: '7f1d1c9a-0000-4000-8000-000000000001',
  title: 'Desenvolvedor Node.js Sênior',
  company: 'Acme',
  location_raw: 'Remoto',
  description,
  description_hash: 'hash-1',
};

const validExtraction: Extraction = {
  seniority: 'senior',
  workModel: 'remote',
  yearsRequired: null,
  lang: 'pt',
  salary: { published: false, min: null, max: null, currency: null, period: null },
  requirements: [
    {
      requirement: 'Node.js',
      kind: 'must',
      minYears: null,
      evidenceSpan: 'experiência com Node.js e PostgreSQL',
      confidence: 0.9,
    },
  ],
};

const response = (rawText: string): ExtractionResponse => ({
  rawText,
  model: 'test-model',
  tokensIn: 100,
  tokensOut: 50,
  latencyMs: 10,
  costUsd: 0.0001,
  finishReason: 'stop',
});

function fakePool(jobs: Job[], cache: unknown[] = []): { pool: Pool; queries: Query[] } {
  const queries: Query[] = [];
  const client = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      if (/insert into requirements/i.test(sql)) {
        return { rows: [{ id: 1 }] };
      }
      if (/insert into extraction_runs/i.test(sql)) {
        return { rows: [{ id: 'run-1' }] };
      }
      return { rows: [] };
    }),
    release: vi.fn(),
  };
  const pool = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      if (/from extraction_cache/i.test(sql)) {
        return { rows: cache.map((payload) => ({ payload })) };
      }
      if (/from jobs/i.test(sql)) {
        return { rows: jobs };
      }
      if (/insert into extraction_runs/i.test(sql)) {
        return { rows: [{ id: 'run-1' }] };
      }
      return { rows: [] };
    }),
    connect: vi.fn(async () => client),
  };
  return { pool: pool as unknown as Pool, queries };
}

function extractorReturning(impl: () => Promise<ExtractionResponse>): LlmExtractor & {
  extract: ReturnType<typeof vi.fn>;
} {
  return {
    model: 'test-model',
    promptVersion: 'extract-v2',
    schemaVersion: 'extract-schema-v1',
    extract: vi.fn(impl),
  };
}

const options: RunExtractionOptions = {
  source: 'programathor',
  limit: 1,
  force: false,
  dryRun: false,
  intervalMs: 0,
};

function statusOf(queries: Query[]): string | undefined {
  const insert = queries.find((query) => /insert into extraction_runs/i.test(query.sql));
  return insert?.params[4] as string | undefined;
}

describe('runExtraction', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persiste extração válida com run ok e cache', async () => {
    const { pool, queries } = fakePool([job]);
    const extractor = extractorReturning(async () => response(JSON.stringify(validExtraction)));

    const summary = await runExtraction(pool, extractor, options);

    expect(summary.ok).toBe(1);
    expect(summary.processed).toBe(1);
    expect(summary.droppedRequirements).toBe(0);
    expect(statusOf(queries)).toBe('ok');
    expect(queries.some((query) => /insert into extraction_cache/i.test(query.sql))).toBe(true);
    const update = queries.find((query) => /update jobs set/i.test(query.sql));
    expect(update?.sql).toContain('lang = $4');
    expect(update?.params[3]).toBe('pt');
  });

  it('não chama o LLM quando o cache tem o payload', async () => {
    const { pool, queries } = fakePool([job], [validExtraction]);
    const extractor = extractorReturning(async () => response('{}'));

    const summary = await runExtraction(pool, extractor, options);

    expect(extractor.extract).not.toHaveBeenCalled();
    expect(summary.cacheHits).toBe(1);
    expect(summary.ok).toBe(1);
    expect(queries.some((query) => /insert into extraction_runs/i.test(query.sql))).toBe(false);
  });

  it('registra grounding_failed quando o cache antigo não passa na validação atual', async () => {
    const { pool, queries } = fakePool(
      [job],
      [
        {
          ...validExtraction,
          salary: { published: true, min: 15000, max: 20000, currency: 'BRL', period: 'month' },
        },
      ],
    );
    const extractor = extractorReturning(async () => response('{}'));

    const summary = await runExtraction(pool, extractor, options);

    expect(extractor.extract).not.toHaveBeenCalled();
    expect(summary.cacheHits).toBe(1);
    expect(summary.groundingFailed).toBe(1);
    expect(summary.ok).toBe(0);
    expect(statusOf(queries)).toBe('grounding_failed');
    expect(queries.some((query) => /update jobs set/i.test(query.sql))).toBe(false);
  });

  it('marca invalid_json e não toca nas colunas derivadas', async () => {
    const { pool, queries } = fakePool([job]);
    const extractor = extractorReturning(async () => response('não é json'));

    const summary = await runExtraction(pool, extractor, options);

    expect(summary.invalidJson).toBe(1);
    expect(summary.ok).toBe(0);
    expect(statusOf(queries)).toBe('invalid_json');
    expect(queries.some((query) => /update jobs set/i.test(query.sql))).toBe(false);
  });

  it('rejeita schema inválido antes do grounding', async () => {
    const { pool, queries } = fakePool([job]);
    const extractor = extractorReturning(async () =>
      response(JSON.stringify({ ...validExtraction, seniority: 'staff' })),
    );

    const summary = await runExtraction(pool, extractor, options);

    expect(summary.invalidJson).toBe(1);
    expect(statusOf(queries)).toBe('invalid_json');
  });

  it('rejeita salário inventado sem gravar campos derivados', async () => {
    const { pool, queries } = fakePool([job]);
    const extractor = extractorReturning(async () =>
      response(
        JSON.stringify({
          ...validExtraction,
          salary: { published: true, min: 15000, max: 20000, currency: 'BRL', period: 'month' },
        }),
      ),
    );

    const summary = await runExtraction(pool, extractor, options);

    expect(summary.groundingFailed).toBe(1);
    expect(summary.ok).toBe(0);
    expect(statusOf(queries)).toBe('grounding_failed');
    expect(queries.some((query) => /update jobs set/i.test(query.sql))).toBe(false);
  });

  it('registra falha do provedor como error', async () => {
    const { pool, queries } = fakePool([job]);
    const extractor = extractorReturning(async () => {
      throw new Error('HTTP 500 do provedor LLM');
    });

    const summary = await runExtraction(pool, extractor, options);

    expect(summary.errors).toBe(1);
    expect(statusOf(queries)).toBe('error');
    expect(queries.some((query) => /update jobs set/i.test(query.sql))).toBe(false);
  });

  it('não escreve nada em dry-run', async () => {
    const { pool, queries } = fakePool([job]);
    const extractor = extractorReturning(async () => response(JSON.stringify(validExtraction)));

    const summary = await runExtraction(pool, extractor, { ...options, dryRun: true });

    expect(summary.ok).toBe(1);
    expect(summary.dryRun).toBe(true);
    expect(queries.some((query) => /insert into|update jobs/i.test(query.sql))).toBe(false);
  });
});
