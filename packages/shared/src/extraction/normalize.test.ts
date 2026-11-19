import { describe, expect, it } from 'vitest';
import { detectLanguage, normalizeExtraction } from './normalize.js';
import type { Extraction } from './schema.js';

const englishPosting = `We are looking for a senior backend engineer. You will work with the team
to design scalable services. Requirements: strong experience with Java and Spring. You have
experience with the cloud. This role will have an impact on our product.`;

const portuguesePosting = `Buscamos pessoa desenvolvedora sênior para atuar com o time de produto.
Requisitos: experiência com Java e Spring. Você vai trabalhar com desenvolvimento de serviços
escaláveis. A vaga é para trabalho remoto e o time é distribuído.`;

describe('detectLanguage', () => {
  it('detecta inglês', () => {
    expect(detectLanguage(englishPosting)).toBe('en');
  });

  it('detecta português', () => {
    expect(detectLanguage(portuguesePosting)).toBe('pt');
  });

  it('devolve null quando o texto é curto demais', () => {
    expect(detectLanguage('Vaga Java')).toBeNull();
  });
});

describe('normalizeExtraction', () => {
  const base: Extraction = {
    seniority: 'senior',
    workModel: 'remote',
    yearsRequired: null,
    lang: 'pt',
    salary: { published: false, min: null, max: null, currency: null, period: null },
    requirements: [
      {
        requirement: 'Java',
        kind: 'must',
        minYears: 8,
        evidenceSpan: 'strong experience with Java and Spring',
        confidence: 0.9,
      },
    ],
  };

  it('corrige o idioma pelo corpo do anúncio', () => {
    expect(normalizeExtraction(base, englishPosting).lang).toBe('en');
  });

  it('mantém o idioma quando a detecção é inconclusiva', () => {
    expect(normalizeExtraction(base, 'Vaga Java').lang).toBe('pt');
  });

  it('deriva years_required do maior minYears quando o topo vem nulo', () => {
    expect(normalizeExtraction(base, englishPosting).yearsRequired).toBe(8);
  });

  it('preserva years_required explícito', () => {
    expect(normalizeExtraction({ ...base, yearsRequired: 5 }, englishPosting).yearsRequired).toBe(5);
  });
});
