import { describe, expect, it } from 'vitest';
import { canonicalizeRequirement, findKnownRequirements, isNonSkillLabel } from './requirements.js';

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

describe('findKnownRequirements', () => {
  it('encontra skills citadas no trecho', () => {
    const found = findKnownRequirements(
      'Experience managing CI/CD pipelines and SQL databases with Git.',
    ).map((item) => item.canonical);
    expect(found).toEqual(expect.arrayContaining(['ci/cd', 'sql', 'git']));
  });

  it('não confunde substrings com requisitos', () => {
    const found = findKnownRequirements('good communication and mysql administration').map(
      (item) => item.canonical,
    );
    expect(found).not.toContain('go');
    expect(found).toContain('mysql');
    expect(found).toContain('communication');
  });

  it('resolve alias com versão', () => {
    const found = findKnownRequirements('Strong Node.js and AWS Lambda experience').map(
      (item) => item.canonical,
    );
    expect(found).toEqual(expect.arrayContaining(['node.js', 'aws']));
  });

  it('normaliza acentos do português', () => {
    expect(canonicalizeRequirement('Comunicação')?.canonical).toBe('communication');
    expect(canonicalizeRequirement('Português fluente')?.canonical).toBe('portuguese');
    expect(canonicalizeRequirement('Espanhol')?.canonical).toBe('spanish');
  });

  it('reconhece idioma publicado como requisito', () => {
    const found = findKnownRequirements('Portuguese - Fluent. English - Fluent.').map(
      (item) => item.canonical,
    );
    expect(found).toEqual(expect.arrayContaining(['portuguese', 'english']));
  });

  it('separa modelo de trabalho e benefício de skill', () => {
    for (const label of [
      'Remote work',
      '100% Remoto',
      'Home Office',
      'Híbrido',
      'Presencial',
      'Vale Refeição',
      'Plano de Saúde',
      'Salary',
    ]) {
      expect(isNonSkillLabel(label)).toBe(true);
    }
    for (const label of ['Node.js', 'Comunicação', 'AWS', 'Remote sensing']) {
      expect(isNonSkillLabel(label)).toBe(false);
    }
  });
});
