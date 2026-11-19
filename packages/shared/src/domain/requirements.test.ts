import { describe, expect, it } from 'vitest';
import { canonicalizeRequirement } from './requirements.js';

describe('canonicalizeRequirement', () => {
  it('normaliza grafias do mesmo requisito', () => {
    for (const raw of ['Node', 'Node.js', 'nodejs', 'NODE JS']) {
      expect(canonicalizeRequirement(raw)?.canonical).toBe('node.js');
    }
  });

  it('resolve aliases com versão e sufixo', () => {
    expect(canonicalizeRequirement('Java 17')?.canonical).toBe('java');
    expect(canonicalizeRequirement('AWS Lambda')?.canonical).toBe('aws');
    expect(canonicalizeRequirement('Next.js 14')?.canonical).toBe('next.js');
  });

  it('não transforma palavra comum em linguagem', () => {
    expect(canonicalizeRequirement('good communication')).not.toMatchObject({ canonical: 'go' });
    expect(canonicalizeRequirement('go')?.canonical).toBe('go');
  });

  it('mantém requisito desconhecido com categoria other', () => {
    const result = canonicalizeRequirement('Elixir');
    expect(result).toEqual({ canonical: 'elixir', category: 'other', known: false });
  });

  it('ignora entrada vazia', () => {
    expect(canonicalizeRequirement('   ')).toBeNull();
  });
});
