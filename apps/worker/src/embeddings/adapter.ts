import { createHash } from 'node:crypto';

export interface EmbeddingAdapter {
  readonly model: string;
  readonly dimension: number;
  embed(texts: string[]): Promise<number[][]>;
}

export class DeterministicEmbeddingAdapter implements EmbeddingAdapter {
  readonly model = 'deterministic-hash-1536';
  readonly dimension = 1536;

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.embedSingle(text));
  }

  embedSingle(text: string): number[] {
    const vector = new Float64Array(this.dimension);
    const tokens = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9+#_]+/i)
      .filter((t) => t.length > 0);

    if (tokens.length === 0) {
      vector[0] = 1.0;
      return Array.from(vector);
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!;
      // Hash do token para mapear em dimensões
      const hash = createHash('sha256').update(token).digest();
      const idx1 = hash.readUInt16BE(0) % this.dimension;
      const idx2 = hash.readUInt16BE(2) % this.dimension;
      const idx3 = hash.readUInt16BE(4) % this.dimension;

      const sign1 = (hash[6]! & 1) === 0 ? 1 : -1;
      const sign2 = (hash[7]! & 1) === 0 ? 1 : -1;
      const sign3 = (hash[8]! & 1) === 0 ? 1 : -1;

      vector[idx1] = (vector[idx1] ?? 0) + sign1;
      vector[idx2] = (vector[idx2] ?? 0) + sign2 * 0.5;
      vector[idx3] = (vector[idx3] ?? 0) + sign3 * 0.25;

      // N-gramas de pares adjacentes
      if (i > 0) {
        const bigram = `${tokens[i - 1]}_${token}`;
        const biHash = createHash('sha256').update(bigram).digest();
        const biIdx = biHash.readUInt16BE(0) % this.dimension;
        const biSign = (biHash[2]! & 1) === 0 ? 1 : -1;
        vector[biIdx] = (vector[biIdx] ?? 0) + biSign * 0.75;
      }
    }

    // Normalização L2 (comprimento unitário para cosseno no pgvector)
    let sumSq = 0;
    for (let i = 0; i < this.dimension; i++) {
      sumSq += vector[i]! * vector[i]!;
    }
    const norm = Math.sqrt(sumSq) || 1e-12;
    const result: number[] = new Array(this.dimension);
    for (let i = 0; i < this.dimension; i++) {
      result[i] = Math.round((vector[i]! / norm) * 1000000) / 1000000;
    }

    return result;
  }
}

export interface RemoteEmbeddingConfig {
  baseUrl: string;
  apiKey: string | null;
  model: string;
}

export class OpenAiEmbeddingAdapter implements EmbeddingAdapter {
  readonly model: string;
  readonly dimension = 1536;
  private readonly baseUrl: string;
  private readonly apiKey: string | null;

  constructor(config: RemoteEmbeddingConfig) {
    this.model = config.model;
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Embedding API error ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as {
      data?: Array<{ embedding: number[]; index: number }>;
    };

    if (!Array.isArray(data.data)) {
      throw new Error('Formato de resposta inesperado da API de embeddings');
    }

    // Ordena pelo índice para garantir correspondência com a ordem dos textos
    const sorted = [...data.data].sort((a, b) => a.index - b.index);
    return sorted.map((item) => item.embedding);
  }
}

export function createEmbeddingAdapter(): EmbeddingAdapter {
  const apiKey = process.env.EMBEDDING_API_KEY ?? process.env.LLM_API_KEY ?? null;
  const baseUrl = process.env.EMBEDDING_BASE_URL ?? process.env.LLM_BASE_URL ?? null;
  const model = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';

  // Se houver OpenAI ou endpoint remoto configurado com chave válida
  if (apiKey && baseUrl && baseUrl.includes('openai.com')) {
    return new OpenAiEmbeddingAdapter({ baseUrl, apiKey, model });
  }

  // Fallback determinístico local (1536 dimensões, L2 normalizado, zero custo, zero rede)
  return new DeterministicEmbeddingAdapter();
}
