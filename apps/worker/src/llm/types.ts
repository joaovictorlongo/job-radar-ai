export interface ExtractionRequest {
  title: string;
  company: string | null;
  locationRaw: string | null;
  description: string;
}

export interface ExtractionResponse {
  rawText: string;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  latencyMs: number;
  costUsd: number | null;
  finishReason: string | null;
}

export interface LlmExtractor {
  readonly model: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
  extract(request: ExtractionRequest): Promise<ExtractionResponse>;
}
