import {
  buildExtractionMessages,
  EXTRACTION_JSON_SCHEMA,
  type ExtractionPromptInput,
} from '@job-radar/shared';
import type { ExtractionRequest, ExtractionResponse, LlmExtractor } from './types.js';

export type StructuredMode = 'json_schema' | 'json_object' | 'none';

export interface TokenPrices {
  inputPerMillion: number;
  outputPerMillion: number;
}

export interface OpenAICompatibleOptions {
  baseUrl: string;
  model: string;
  apiKey: string | null;
  promptVersion: string;
  schemaVersion: string;
  structuredMode: StructuredMode;
  prices: TokenPrices | null;
  timeoutMs: number;
  maxRetries: number;
  retryBaseMs?: number;
  fetchImpl?: typeof fetch;
}

interface ChatCompletionResponse {
  model?: string;
  choices?: Array<{
    message?: { content?: string | null };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: { message?: string };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);

class NonRetryableError extends Error {}

function estimateCost(tokensIn: number | null, tokensOut: number | null, prices: TokenPrices | null): number | null {
  if (prices === null || tokensIn === null || tokensOut === null) {
    return null;
  }
  return (tokensIn * prices.inputPerMillion + tokensOut * prices.outputPerMillion) / 1_000_000;
}

export class OpenAICompatibleExtractor implements LlmExtractor {
  readonly model: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
  private readonly options: OpenAICompatibleOptions;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenAICompatibleOptions) {
    this.options = options;
    this.model = options.model;
    this.promptVersion = options.promptVersion;
    this.schemaVersion = options.schemaVersion;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private body(request: ExtractionRequest): string {
    const prompt = buildExtractionMessages(request as ExtractionPromptInput);
    const responseFormat =
      this.options.structuredMode === 'json_schema'
        ? {
            type: 'json_schema',
            json_schema: {
              name: 'job_extraction',
              strict: true,
              schema: EXTRACTION_JSON_SCHEMA,
            },
          }
        : this.options.structuredMode === 'json_object'
          ? { type: 'json_object' }
          : undefined;

    return JSON.stringify({
      model: this.model,
      temperature: 0,
      messages: [
        { role: 'system', content: prompt.system },
        {
          role: 'user',
          content:
            this.options.structuredMode === 'json_object'
              ? `${prompt.user}\n\nRespond with a single JSON object matching this JSON Schema:\n${JSON.stringify(EXTRACTION_JSON_SCHEMA)}`
              : prompt.user,
        },
      ],
      ...(responseFormat === undefined ? {} : { response_format: responseFormat }),
    });
  }

  async extract(request: ExtractionRequest): Promise<ExtractionResponse> {
    const url = `${this.options.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const body = this.body(request);
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.options.maxRetries) {
      const startedAt = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
      try {
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        if (this.options.apiKey !== null && this.options.apiKey.length > 0) {
          headers.authorization = `Bearer ${this.options.apiKey}`;
        }
        const response = await this.fetchImpl(url, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        });
        const latencyMs = Date.now() - startedAt;
        const text = await response.text();

        if (!response.ok) {
          if (RETRYABLE.has(response.status) && attempt < this.options.maxRetries) {
            const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10);
            const base = response.status === 429 ? (this.options.retryBaseMs ?? 4000) : 500;
            const delay = Number.isFinite(retryAfter)
              ? Math.max(retryAfter * 1000, base * 2 ** attempt)
              : base * 2 ** attempt + Math.random() * 250;
            await sleep(delay);
            attempt += 1;
            continue;
          }
          throw new NonRetryableError(`HTTP ${response.status} do provedor LLM: ${text.slice(0, 300)}`);
        }

        let parsed: ChatCompletionResponse;
        try {
          parsed = JSON.parse(text) as ChatCompletionResponse;
        } catch {
          throw new NonRetryableError(`resposta do provedor não é JSON: ${text.slice(0, 200)}`);
        }
        const content = parsed.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || content.trim().length === 0) {
          throw new NonRetryableError('resposta do provedor sem conteúdo');
        }
        const tokensIn = parsed.usage?.prompt_tokens ?? null;
        const tokensOut = parsed.usage?.completion_tokens ?? null;

        return {
          rawText: content,
          model: parsed.model ?? this.model,
          tokensIn,
          tokensOut,
          latencyMs,
          costUsd: estimateCost(tokensIn, tokensOut, this.options.prices),
          finishReason: parsed.choices?.[0]?.finish_reason ?? null,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (error instanceof NonRetryableError || attempt >= this.options.maxRetries) {
          throw lastError;
        }
        await sleep(500 * 2 ** attempt + Math.random() * 250);
        attempt += 1;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError ?? new Error('falha ao chamar o provedor LLM');
  }
}
