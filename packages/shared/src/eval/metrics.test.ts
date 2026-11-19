import { describe, expect, it } from 'vitest';
import {
  computeClassificationMetrics,
  computeCohensKappa,
  computeMultiLabelMetrics,
  computeNumericToleranceMetrics,
  computeSalaryMetrics,
} from './metrics.js';

describe('computeClassificationMetrics', () => {
  it('computes accuracy and confusion matrix for single class', () => {
    const pairs = [
      { expected: 'senior', predicted: 'senior' },
      { expected: 'pleno', predicted: 'pleno' },
      { expected: 'junior', predicted: 'pleno' },
      { expected: 'senior', predicted: 'senior' },
    ];
    const res = computeClassificationMetrics(pairs);
    expect(res.total).toBe(4);
    expect(res.correct).toBe(3);
    expect(res.accuracy).toBe(0.75);
    expect(res.confusionMatrix['junior']?.['pleno']).toBe(1);
    expect(res.confusionMatrix['senior']?.['senior']).toBe(2);
  });

  it('handles empty input gracefully', () => {
    const res = computeClassificationMetrics([]);
    expect(res.accuracy).toBe(1);
    expect(res.total).toBe(0);
  });
});

describe('computeMultiLabelMetrics', () => {
  it('computes micro and macro precision, recall and F1', () => {
    const pairs = [
      {
        expected: ['typescript', 'node.js', 'react'],
        predicted: ['typescript', 'node.js', 'angular'],
      },
      {
        expected: ['postgresql', 'aws'],
        predicted: ['postgresql', 'aws'],
      },
    ];
    // Sample 1: TP=2 (ts, node), FP=1 (angular), FN=1 (react)
    // Sample 2: TP=2 (pg, aws), FP=0, FN=0
    // Total TP=4, FP=1, FN=1
    // Micro Prec = 4 / (4 + 1) = 0.8
    // Micro Rec = 4 / (4 + 1) = 0.8
    // Micro F1 = 0.8
    const res = computeMultiLabelMetrics(pairs);
    expect(res.micro.tp).toBe(4);
    expect(res.micro.fp).toBe(1);
    expect(res.micro.fn).toBe(1);
    expect(res.micro.precision).toBe(0.8);
    expect(res.micro.recall).toBe(0.8);
    expect(res.micro.f1).toBe(0.8);
    expect(res.sampleCount).toBe(2);
  });

  it('handles empty expected and predicted sets', () => {
    const pairs = [{ expected: [], predicted: [] }];
    const res = computeMultiLabelMetrics(pairs);
    expect(res.micro.precision).toBe(1);
    expect(res.micro.recall).toBe(1);
    expect(res.micro.f1).toBe(1);
  });
});

describe('computeNumericToleranceMetrics', () => {
  it('accepts values within tolerance and handles nulls', () => {
    const pairs = [
      { expected: 5, predicted: 5 }, // exact
      { expected: 5, predicted: 4 }, // diff 1 <= 1
      { expected: 5, predicted: 6 }, // diff 1 <= 1
      { expected: 5, predicted: 3 }, // diff 2 > 1 (fail)
      { expected: null, predicted: null }, // both null (pass)
      { expected: null, predicted: 2 }, // one null (fail)
    ];
    const res = computeNumericToleranceMetrics(pairs, 1);
    expect(res.total).toBe(6);
    expect(res.correct).toBe(4);
    expect(res.accuracy).toBe(0.6667);
    expect(res.discrepancies.length).toBe(2);
  });
});

describe('computeSalaryMetrics', () => {
  it('detects false positives as severe violations', () => {
    const pairs = [
      // FP: expected false, predicted true
      {
        expected: { published: false },
        predicted: { published: true, min: 5000, max: 7000, currency: 'BRL' },
      },
      // TN: both false
      {
        expected: { published: false },
        predicted: { published: false },
      },
      // TP: both true and matching
      {
        expected: { published: true, min: 10000, max: 12000, currency: 'BRL' },
        predicted: { published: true, min: 10000, max: 12000, currency: 'BRL' },
      },
    ];
    const res = computeSalaryMetrics(pairs);
    expect(res.falsePositives).toBe(1);
    expect(res.trueNegatives).toBe(1);
    expect(res.truePositives).toBe(1);
    expect(res.falseNegatives).toBe(0);
    expect(res.recall).toBe(1);
    expect(res.valuesAccuracy).toBe(1);
  });
});

describe('computeCohensKappa', () => {
  it('calculates perfect agreement (kappa = 1)', () => {
    const pairs = [
      { pass1: 'senior', pass2: 'senior' },
      { pass1: 'pleno', pass2: 'pleno' },
      { pass1: 'junior', pass2: 'junior' },
    ];
    const res = computeCohensKappa(pairs);
    expect(res.kappa).toBe(1);
    expect(res.observedAgreement).toBe(1);
  });

  it('calculates partial agreement accurately', () => {
    const pairs = [
      { pass1: 'senior', pass2: 'senior' },
      { pass1: 'senior', pass2: 'pleno' },
      { pass1: 'pleno', pass2: 'pleno' },
      { pass1: 'pleno', pass2: 'pleno' },
    ];
    // n=4. po = 3/4 = 0.75
    // pass1: senior=2 (0.5), pleno=2 (0.5)
    // pass2: senior=1 (0.25), pleno=3 (0.75)
    // pe = 0.5*0.25 + 0.5*0.75 = 0.125 + 0.375 = 0.5
    // kappa = (0.75 - 0.5) / (1 - 0.5) = 0.25 / 0.5 = 0.5
    const res = computeCohensKappa(pairs);
    expect(res.observedAgreement).toBe(0.75);
    expect(res.expectedAgreement).toBe(0.5);
    expect(res.kappa).toBe(0.5);
  });
});
