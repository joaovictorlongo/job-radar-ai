import { describe, expect, it } from 'vitest';
import { evaluateGates, type EvalInputMetrics } from './gates.js';

describe('evaluateGates', () => {
  const baseMetrics: EvalInputMetrics = {
    validJsonRate: 1.0,
    groundingRate: 0.98,
    seniority: {
      accuracy: 0.9,
      total: 20,
      correct: 18,
      confusionMatrix: {},
    },
    workModel: {
      accuracy: 0.95,
      total: 20,
      correct: 19,
      confusionMatrix: {},
    },
    stackMust: {
      micro: { precision: 0.88, recall: 0.84, f1: 0.86, tp: 50, fp: 7, fn: 9 },
      macro: { precision: 0.85, recall: 0.82, f1: 0.83, labelCount: 15 },
      sampleCount: 20,
    },
    salary: {
      falsePositives: 0,
      truePositives: 2,
      falseNegatives: 0,
      trueNegatives: 18,
      precision: 1.0,
      recall: 1.0,
      valuesAccuracy: 1.0,
      evaluatedValuesCount: 2,
    },
    years: {
      accuracy: 0.9,
      total: 20,
      correct: 18,
      tolerance: 1,
      discrepancies: [],
    },
    cohensKappa: {
      kappa: 0.85,
      observedAgreement: 0.9,
      expectedAgreement: 0.35,
      n: 20,
    },
  };

  it('approves when all gates pass', () => {
    const result = evaluateGates(baseMetrics);
    expect(result.approved).toBe(true);
    expect(result.hardGatesPassed).toBe(true);
    expect(result.passedChecks).toBe(result.totalChecks);
  });

  it('fails hard gate immediately if there is even 1 salary false positive', () => {
    const metrics: EvalInputMetrics = {
      ...baseMetrics,
      salary: {
        ...baseMetrics.salary,
        falsePositives: 1, // Violates hard gate!
      },
    };
    const result = evaluateGates(metrics);
    expect(result.approved).toBe(false);
    expect(result.hardGatesPassed).toBe(false);
    const salaryCheck = result.checks.find((c) => c.id === 'salary_zero_fp');
    expect(salaryCheck?.passed).toBe(false);
  });

  it('fails if valid JSON rate is below 98%', () => {
    const metrics: EvalInputMetrics = {
      ...baseMetrics,
      validJsonRate: 0.95,
    };
    const result = evaluateGates(metrics);
    expect(result.approved).toBe(false);
    expect(result.hardGatesPassed).toBe(false);
  });

  it('fails if grounding rate is below 95%', () => {
    const metrics: EvalInputMetrics = {
      ...baseMetrics,
      groundingRate: 0.92,
    };
    const result = evaluateGates(metrics);
    expect(result.approved).toBe(false);
    expect(result.hardGatesPassed).toBe(false);
  });

  it('fails if stack must F1 is below 0.82', () => {
    const metrics: EvalInputMetrics = {
      ...baseMetrics,
      stackMust: {
        ...baseMetrics.stackMust,
        micro: { ...baseMetrics.stackMust.micro, f1: 0.78 },
      },
    };
    const result = evaluateGates(metrics);
    expect(result.approved).toBe(false);
    expect(result.hardGatesPassed).toBe(true); // Hard gates passed, but overall approval failed
  });
});
