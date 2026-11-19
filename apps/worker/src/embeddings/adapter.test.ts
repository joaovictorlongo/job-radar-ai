import { describe, expect, it } from 'vitest';
import { DeterministicEmbeddingAdapter } from './adapter.js';

describe('DeterministicEmbeddingAdapter', () => {
  it('produces unit-length 1536-dimensional vectors consistently', async () => {
    const adapter = new DeterministicEmbeddingAdapter();
    expect(adapter.dimension).toBe(1536);

    const [vec1, vec2] = await adapter.embed(['TypeScript e Node.js na Field Control', 'Python e Machine Learning']);

    expect(vec1).toBeDefined();
    expect(vec2).toBeDefined();
    expect(vec1?.length).toBe(1536);
    expect(vec2?.length).toBe(1536);

    // Verifica norma L2 aproximada de 1.0
    let sumSq1 = 0;
    for (const val of vec1 ?? []) {
      sumSq1 += val * val;
    }
    expect(Math.abs(Math.sqrt(sumSq1) - 1.0)).toBeLessThan(0.01);

    // Reprodutibilidade: mesmo texto gera mesmo vetor
    const [vec1Repeat] = await adapter.embed(['TypeScript e Node.js na Field Control']);
    expect(vec1).toEqual(vec1Repeat);
  });
});
