import { describe, expect, it, vi } from 'vitest';
import { OpenAICompatibleExtractor } from './openai-compatible.js';

const validContent = JSON.stringify({
  seniority: 'senior',
  workModel: 'remote',
  yearsRequired: null,
  lang: 'pt',
  salary: { published: false, min: null, max: null, currency: null, period: null },
  requirements: [],
});

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function makeExtractor(
  fetchImpl: typeof fetch,
  overrides: Partial<ConstructorParameters<typeof OpenAICompatibleExtractor>[0]> = {},
) {
  return new OpenAICompatibleExtractor({
    baseUrl: 'https://example.test/v1',
    model: 'test-model',
    apiKey: 'secret',
    promptVersion: 'extract-v1',
    schemaVersion: 'extract-schema-v1',
    structuredMode: 'json_schema',
    prices: { inputPerMillion: 0.75, outputPerMillion: 3.75 },
    timeoutMs: 1000,
    maxRetries: 1,
    fetchImpl,
    retryBaseMs: 1,
    ...overrides,
  });
}

describe('OpenAICompatibleExtractor', () => {
  it('extrai conteúdo, tokens e custo', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        model: 'test-model-2026',
        choices: [{ message: { content: validContent }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1000, completion_tokens: 500 },
      }),
    ) as unknown as typeof fetch;

    const extractor = makeExtractor(fetchImpl);
    const result = await extractor.extract({ title: 'Vaga', company: null, locationRaw: null, description: 'texto' });

    expect(result.rawText).toBe(validContent);
    expect(result.model).toBe('test-model-2026');
    expect(result.tokensIn).toBe(1000);
    expect(result.tokensOut).toBe(500);
    expect(result.costUsd).toBeCloseTo((1000 * 0.75 + 500 * 3.75) / 1_000_000, 12);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('envia json_schema estrito no corpo', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: validContent }, finish_reason: 'stop' }] }),
    ) as unknown as typeof fetch;

    await makeExtractor(fetchImpl).extract({ title: 'Vaga', company: null, locationRaw: null, description: 'texto' });
    const init = (fetchImpl as unknown as { mock: { calls: Array<[string, RequestInit]> } }).mock
      .calls[0]?.[1];
    const body = JSON.parse(String(init?.body)) as {
      response_format: { type: string; json_schema: { strict: boolean } };
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.messages[0]?.content).toContain('untrusted data');
  });

  it('repete em 429 e devolve o sucesso seguinte', async () => {
    const responses = [
      jsonResponse({ error: { message: 'rate limited' } }, 429),
      jsonResponse({
        choices: [{ message: { content: validContent }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    ];
    const fetchImpl = vi.fn(async () => responses.shift() ?? responses[0]!) as unknown as typeof fetch;

    const result = await makeExtractor(fetchImpl).extract({
      title: 'Vaga',
      company: null,
      locationRaw: null,
      description: 'texto',
    });
    expect(result.rawText).toBe(validContent);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('não repete erro não transitório', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: { message: 'bad request' } }, 400),
    ) as unknown as typeof fetch;

    await expect(
      makeExtractor(fetchImpl).extract({ title: 'Vaga', company: null, locationRaw: null, description: 'texto' }),
    ).rejects.toThrow('HTTP 400');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('falha quando a resposta não traz conteúdo', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: '   ' } }] }),
    ) as unknown as typeof fetch;

    await expect(
      makeExtractor(fetchImpl).extract({ title: 'Vaga', company: null, locationRaw: null, description: 'texto' }),
    ).rejects.toThrow('sem conteúdo');
  });

  it('modo json_object inclui o schema no texto e não usa response_format de schema', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: validContent } }] }),
    ) as unknown as typeof fetch;

    await makeExtractor(fetchImpl, { structuredMode: 'json_object' }).extract({
      title: 'Vaga',
      company: null,
      locationRaw: null,
      description: 'texto',
    });
    const init = (fetchImpl as unknown as { mock: { calls: Array<[string, RequestInit]> } }).mock
      .calls[0]?.[1];
    const body = JSON.parse(String(init?.body)) as {
      response_format: { type: string };
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.response_format.type).toBe('json_object');
    expect(body.messages[1]?.content).toContain('JSON Schema');
  });
});
