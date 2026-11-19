import { describe, expect, it } from 'vitest';
import { chunkMarkdown } from './chunker.js';

describe('chunkMarkdown', () => {
  it('splits markdown by headers and groups paragraphs with metadata', () => {
    const md = `
# Perfil Técnico

## Experiência
Trabalhou na Field Control desenvolvendo APIs com NestJS e TypeScript.
Construiu interfaces reativas com Angular.

## Competências
- TypeScript
- PostgreSQL e pgvector
- Docker e AWS
`;

    const chunks = chunkMarkdown('perfil.md', md, 'v1');
    expect(chunks.length).toBeGreaterThanOrEqual(2);

    const expChunk = chunks.find((c) => c.section === 'Experiência');
    expect(expChunk).toBeDefined();
    expect(expChunk?.doc).toBe('perfil.md');
    expect(expChunk?.version).toBe('v1');
    expect(expChunk?.content).toContain('Field Control');

    const compChunk = chunks.find((c) => c.section === 'Competências');
    expect(compChunk).toBeDefined();
    expect(compChunk?.content).toContain('PostgreSQL');
  });

  it('handles empty documents gracefully', () => {
    const chunks = chunkMarkdown('vazio.md', '');
    expect(chunks).toEqual([]);
  });
});
