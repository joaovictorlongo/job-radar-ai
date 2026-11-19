import { describe, expect, it } from 'vitest';
import { applyGrounding } from './grounding.js';
import { salaryAmountsEvidenced } from './salary.js';
import { extractionSchema, type Extraction } from './schema.js';

const description = `Buscamos pessoa desenvolvedora sênior.
Requisitos: experiência sólida com Node.js e PostgreSQL em produção.
Diferencial: conhecimento em AWS.
Faixa salarial: R$ 8.000,00 a R$ 10.000,00 por mês.
Regime remoto.`;

function baseExtraction(overrides: Partial<Extraction> = {}): Extraction {
  return {
    seniority: 'senior',
    workModel: 'remote',
    yearsRequired: 5,
    lang: 'pt',
    salary: {
      published: true,
      min: 8000,
      max: 10000,
      currency: 'BRL',
      period: 'month',
    },
    requirements: [
      {
        requirement: 'Node.js',
        kind: 'must',
        minYears: null,
        evidenceSpan: 'experiência sólida com Node.js e PostgreSQL em produção',
        confidence: 0.95,
      },
    ],
    ...overrides,
  };
}

describe('regra de salário', () => {
  it('aceita faixa publicada que existe no texto', () => {
    const parsed = extractionSchema.parse(baseExtraction());
    expect(salaryAmountsEvidenced(parsed.salary, description)).toBe(true);
  });

  it('rejeita faixa inventada', () => {
    const parsed = extractionSchema.parse(
      baseExtraction({
        salary: { published: true, min: 15000, max: 20000, currency: 'BRL', period: 'month' },
      }),
    );
    expect(salaryAmountsEvidenced(parsed.salary, description)).toBe(false);
  });

  it('exige null quando a vaga não publica salário', () => {
    const invalid = extractionSchema.safeParse(
      baseExtraction({
        salary: { published: false, min: 5000, max: null, currency: 'BRL', period: 'month' },
      }),
    );
    expect(invalid.success).toBe(false);
  });

  it('rejeita published=true sem moeda ou período', () => {
    const invalid = extractionSchema.safeParse(
      baseExtraction({
        salary: { published: true, min: 8000, max: null, currency: null, period: null },
      }),
    );
    expect(invalid.success).toBe(false);
  });
});

describe('applyGrounding', () => {
  it('descarta requisito sem trecho literal e mantém os comprovados', () => {
    const extraction = baseExtraction({
      requirements: [
        {
          requirement: 'Node.js',
          kind: 'must',
          minYears: null,
          evidenceSpan: 'experiência sólida com Node.js',
          confidence: 0.9,
        },
        {
          requirement: 'Kubernetes',
          kind: 'nice',
          minYears: null,
          evidenceSpan: 'experiência com Kubernetes em cluster',
          confidence: 0.7,
        },
      ],
    });
    const result = applyGrounding(extraction, description);
    expect(result.ok).toBe(true);
    expect(result.droppedRequirements).toBe(1);
    expect(result.extraction?.requirements.map((item) => item.canonical)).toEqual(['node.js']);
    expect(result.issues[0]?.code).toBe('evidence_not_found');
  });

  it('normaliza espaços e caixa antes de comparar o trecho', () => {
    const extraction = baseExtraction({
      requirements: [
        {
          requirement: 'PostgreSQL',
          kind: 'must',
          minYears: null,
          evidenceSpan: 'EXPERIÊNCIA   sólida com node.js e postgresql',
          confidence: 0.9,
        },
      ],
    });
    const result = applyGrounding(extraction, description);
    expect(result.extraction?.requirements[0]?.canonical).toBe('postgresql');
  });

  it('rejeita a extração inteira quando o salário não tem evidência', () => {
    const extraction = baseExtraction({
      salary: { published: true, min: 15000, max: null, currency: 'BRL', period: 'month' },
    });
    const result = applyGrounding(extraction, description);
    expect(result.ok).toBe(false);
    expect(result.extraction).toBeNull();
    expect(result.issues[0]?.code).toBe('salary_not_evidenced');
  });

  it('aceita salário não publicado com campos nulos', () => {
    const extraction = baseExtraction({
      salary: { published: false, min: null, max: null, currency: null, period: null },
    });
    const result = applyGrounding(extraction, description);
    expect(result.ok).toBe(true);
  });

  it('normaliza requisito em frase usando o catálogo e o trecho', () => {
    const extraction = baseExtraction({
      salary: { published: false, min: null, max: null, currency: null, period: null },
      requirements: [
        {
          requirement: 'Strong experience in code reviews and managing CI/CD pipelines.',
          kind: 'must',
          minYears: null,
          evidenceSpan: 'Strong experience in code reviews and managing CI/CD pipelines.',
          confidence: 0.9,
        },
      ],
    });
    const result = applyGrounding(
      extraction,
      'Requisitos: Strong experience in code reviews and managing CI/CD pipelines.',
    );
    expect(result.extraction?.requirements.map((item) => item.canonical)).toEqual(['ci/cd']);
    expect(result.extraction?.requirements[0]?.requirement).toBe('ci/cd');
  });
});
