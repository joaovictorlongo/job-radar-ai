import type { LlmConfig } from '../config.js';
import { OpenAICompatibleExtractor } from './openai-compatible.js';
import type { LlmExtractor } from './types.js';

export function createExtractor(config: LlmConfig): LlmExtractor {
  const prices =
    config.priceInputPerMillion === null || config.priceOutputPerMillion === null
      ? null
      : {
          inputPerMillion: config.priceInputPerMillion,
          outputPerMillion: config.priceOutputPerMillion,
        };

  return new OpenAICompatibleExtractor({
    baseUrl: config.baseUrl,
    model: config.model,
    apiKey: config.apiKey,
    promptVersion: config.promptVersion,
    schemaVersion: config.schemaVersion,
    structuredMode: config.structuredMode,
    prices,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
  });
}

export type { LlmExtractor, ExtractionRequest, ExtractionResponse } from './types.js';
