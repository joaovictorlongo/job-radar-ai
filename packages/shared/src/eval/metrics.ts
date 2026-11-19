export interface BinaryMetrics {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number;
  recall: number;
  f1: number;
}

export function computeBinaryMetrics(tp: number, fp: number, fn: number, tn: number): BinaryMetrics {
  const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return { tp, fp, fn, tn, precision, recall, f1 };
}

export interface MultiLabelMetrics {
  micro: {
    precision: number;
    recall: number;
    f1: number;
    tp: number;
    fp: number;
    fn: number;
  };
  macro: {
    precision: number;
    recall: number;
    f1: number;
    labelCount: number;
  };
  sampleCount: number;
}

export function computeMultiLabelMetrics(
  pairs: Array<{ expected: readonly string[]; predicted: readonly string[] }>,
): MultiLabelMetrics {
  let totalTp = 0;
  let totalFp = 0;
  let totalFn = 0;

  const labels = new Set<string>();
  const perLabel = new Map<string, { tp: number; fp: number; fn: number }>();

  function getLabelStats(label: string) {
    let s = perLabel.get(label);
    if (!s) {
      s = { tp: 0, fp: 0, fn: 0 };
      perLabel.set(label, s);
    }
    return s;
  }

  for (const { expected, predicted } of pairs) {
    const expSet = new Set(expected.map((s) => s.trim().toLowerCase()).filter(Boolean));
    const predSet = new Set(predicted.map((s) => s.trim().toLowerCase()).filter(Boolean));

    for (const l of expSet) labels.add(l);
    for (const l of predSet) labels.add(l);

    for (const p of predSet) {
      if (expSet.has(p)) {
        totalTp += 1;
        getLabelStats(p).tp += 1;
      } else {
        totalFp += 1;
        getLabelStats(p).fp += 1;
      }
    }

    for (const e of expSet) {
      if (!predSet.has(e)) {
        totalFn += 1;
        getLabelStats(e).fn += 1;
      }
    }
  }

  const microPrec = totalTp + totalFp > 0 ? totalTp / (totalTp + totalFp) : 1;
  const microRec = totalTp + totalFn > 0 ? totalTp / (totalTp + totalFn) : 1;
  const microF1 = microPrec + microRec > 0 ? (2 * microPrec * microRec) / (microPrec + microRec) : 0;

  let sumPrec = 0;
  let sumRec = 0;
  let sumF1 = 0;
  const labelCount = labels.size;

  if (labelCount > 0) {
    for (const label of labels) {
      const stats = getLabelStats(label);
      const prec = stats.tp + stats.fp > 0 ? stats.tp / (stats.tp + stats.fp) : 1;
      const rec = stats.tp + stats.fn > 0 ? stats.tp / (stats.tp + stats.fn) : 1;
      const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;
      sumPrec += prec;
      sumRec += rec;
      sumF1 += f1;
    }
  }

  return {
    micro: {
      precision: round(microPrec, 4),
      recall: round(microRec, 4),
      f1: round(microF1, 4),
      tp: totalTp,
      fp: totalFp,
      fn: totalFn,
    },
    macro: {
      precision: labelCount > 0 ? round(sumPrec / labelCount, 4) : 1,
      recall: labelCount > 0 ? round(sumRec / labelCount, 4) : 1,
      f1: labelCount > 0 ? round(sumF1 / labelCount, 4) : 0,
      labelCount,
    },
    sampleCount: pairs.length,
  };
}

export interface ClassificationMetrics {
  accuracy: number;
  total: number;
  correct: number;
  confusionMatrix: Record<string, Record<string, number>>;
}

export function computeClassificationMetrics(
  pairs: Array<{ expected: string; predicted: string }>,
): ClassificationMetrics {
  let correct = 0;
  const matrix: Record<string, Record<string, number>> = {};

  for (const { expected, predicted } of pairs) {
    if (!matrix[expected]) {
      matrix[expected] = {};
    }
    const row = matrix[expected];
    if (row) {
      row[predicted] = (row[predicted] ?? 0) + 1;
    }
    if (expected === predicted) {
      correct += 1;
    }
  }

  const accuracy = pairs.length > 0 ? correct / pairs.length : 1;
  return {
    accuracy: round(accuracy, 4),
    total: pairs.length,
    correct,
    confusionMatrix: matrix,
  };
}

export interface NumericToleranceMetrics {
  accuracy: number;
  total: number;
  correct: number;
  tolerance: number;
  discrepancies: Array<{ expected: number | null; predicted: number | null; diff: number | null }>;
}

export function computeNumericToleranceMetrics(
  pairs: Array<{ expected: number | null; predicted: number | null }>,
  tolerance = 1,
): NumericToleranceMetrics {
  let correct = 0;
  const discrepancies: NumericToleranceMetrics['discrepancies'] = [];

  for (const { expected, predicted } of pairs) {
    if (expected === null && predicted === null) {
      correct += 1;
      continue;
    }
    if (expected !== null && predicted !== null) {
      const diff = Math.abs(expected - predicted);
      if (diff <= tolerance) {
        correct += 1;
      } else {
        discrepancies.push({ expected, predicted, diff });
      }
      continue;
    }
    discrepancies.push({ expected, predicted, diff: null });
  }

  const accuracy = pairs.length > 0 ? correct / pairs.length : 1;
  return {
    accuracy: round(accuracy, 4),
    total: pairs.length,
    correct,
    tolerance,
    discrepancies,
  };
}

export interface SalaryMetrics {
  falsePositives: number;
  truePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  recall: number;
  precision: number;
  valuesAccuracy: number;
  evaluatedValuesCount: number;
}

export function computeSalaryMetrics(
  pairs: Array<{
    expected: { published: boolean; min?: number | null; max?: number | null; currency?: string | null };
    predicted: { published: boolean; min?: number | null; max?: number | null; currency?: string | null };
  }>,
): SalaryMetrics {
  let fp = 0;
  let tp = 0;
  let fn = 0;
  let tn = 0;
  let matchingValues = 0;
  let evaluatedValues = 0;

  for (const { expected, predicted } of pairs) {
    if (!expected.published && predicted.published) {
      fp += 1;
    } else if (expected.published && predicted.published) {
      tp += 1;
      evaluatedValues += 1;
      const currMatch = (expected.currency ?? '').toUpperCase() === (predicted.currency ?? '').toUpperCase();
      const minMatch = expected.min === predicted.min;
      const maxMatch = expected.max === predicted.max;
      if (currMatch && minMatch && maxMatch) {
        matchingValues += 1;
      }
    } else if (expected.published && !predicted.published) {
      fn += 1;
    } else {
      tn += 1;
    }
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
  const valuesAccuracy = evaluatedValues > 0 ? matchingValues / evaluatedValues : 1;

  return {
    falsePositives: fp,
    truePositives: tp,
    falseNegatives: fn,
    trueNegatives: tn,
    precision: round(precision, 4),
    recall: round(recall, 4),
    valuesAccuracy: round(valuesAccuracy, 4),
    evaluatedValuesCount: evaluatedValues,
  };
}

export interface CohenKappaResult {
  kappa: number;
  observedAgreement: number;
  expectedAgreement: number;
  n: number;
}

export function computeCohensKappa(pairs: Array<{ pass1: string; pass2: string }>): CohenKappaResult {
  const n = pairs.length;
  if (n === 0) {
    return { kappa: 1, observedAgreement: 1, expectedAgreement: 1, n: 0 };
  }

  let observedMatches = 0;
  const freq1: Record<string, number> = {};
  const freq2: Record<string, number> = {};
  const categories = new Set<string>();

  for (const { pass1, pass2 } of pairs) {
    categories.add(pass1);
    categories.add(pass2);
    freq1[pass1] = (freq1[pass1] ?? 0) + 1;
    freq2[pass2] = (freq2[pass2] ?? 0) + 1;
    if (pass1 === pass2) {
      observedMatches += 1;
    }
  }

  const po = observedMatches / n;

  let pe = 0;
  for (const cat of categories) {
    const p1 = (freq1[cat] ?? 0) / n;
    const p2 = (freq2[cat] ?? 0) / n;
    pe += p1 * p2;
  }

  const kappa = pe === 1 ? 1 : (po - pe) / (1 - pe);

  return {
    kappa: round(kappa, 4),
    observedAgreement: round(po, 4),
    expectedAgreement: round(pe, 4),
    n,
  };
}

function round(val: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(val * f) / f;
}
