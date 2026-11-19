import type { ClassificationMetrics, MultiLabelMetrics, NumericToleranceMetrics, SalaryMetrics, CohenKappaResult } from './metrics.js';

export interface EvalGateCheck {
  id: string;
  name: string;
  hardGate: boolean;
  target: string;
  actual: number | string;
  passed: boolean;
}

export interface EvalInputMetrics {
  validJsonRate: number;
  groundingRate: number;
  seniority: ClassificationMetrics;
  workModel: ClassificationMetrics;
  stackMust: MultiLabelMetrics;
  stackNice?: MultiLabelMetrics;
  salary: SalaryMetrics;
  years: NumericToleranceMetrics;
  cohensKappa?: CohenKappaResult;
  costP95Usd?: number | null;
  latencyP95Ms?: number | null;
}

export interface GateEvaluationResult {
  approved: boolean;
  hardGatesPassed: boolean;
  totalChecks: number;
  passedChecks: number;
  checks: EvalGateCheck[];
}

export function evaluateGates(metrics: EvalInputMetrics): GateEvaluationResult {
  const checks: EvalGateCheck[] = [];

  // Gate 1 (Duro): Zero falso positivo em salário
  checks.push({
    id: 'salary_zero_fp',
    name: 'Zero falso positivo em salário publicado',
    hardGate: true,
    target: '0',
    actual: metrics.salary.falsePositives,
    passed: metrics.salary.falsePositives === 0,
  });

  // Gate 2 (Duro): JSON válido >= 98%
  checks.push({
    id: 'valid_json_rate',
    name: 'Taxa de JSON válido contra schema Zod',
    hardGate: true,
    target: '>= 0.98',
    actual: metrics.validJsonRate,
    passed: metrics.validJsonRate >= 0.98,
  });

  // Gate 3 (Duro): Grounding literal >= 95%
  checks.push({
    id: 'grounding_rate',
    name: 'Taxa de requisitos com evidência literal na descrição',
    hardGate: true,
    target: '>= 0.95',
    actual: metrics.groundingRate,
    passed: metrics.groundingRate >= 0.95,
  });

  // Gate 4: Stack Must F1 micro >= 0.82
  checks.push({
    id: 'stack_must_f1_micro',
    name: 'F1-Score Micro de stack obrigatória (must-have)',
    hardGate: false,
    target: '>= 0.82',
    actual: metrics.stackMust.micro.f1,
    passed: metrics.stackMust.micro.f1 >= 0.82,
  });

  // Gate 5: Acurácia de Seniority >= 0.85
  checks.push({
    id: 'seniority_accuracy',
    name: 'Acurácia de senioridade',
    hardGate: false,
    target: '>= 0.85',
    actual: metrics.seniority.accuracy,
    passed: metrics.seniority.accuracy >= 0.85,
  });

  // Gate 6: Acurácia de Modelo de Trabalho >= 0.90
  checks.push({
    id: 'work_model_accuracy',
    name: 'Acurácia de modelo de trabalho',
    hardGate: false,
    target: '>= 0.90',
    actual: metrics.workModel.accuracy,
    passed: metrics.workModel.accuracy >= 0.90,
  });

  // Gate 7: Anos requeridos tolerância +-1 ano >= 0.85
  checks.push({
    id: 'years_tolerance_accuracy',
    name: 'Acurácia de anos de experiência (tolerância ±1 ano)',
    hardGate: false,
    target: '>= 0.85',
    actual: metrics.years.accuracy,
    passed: metrics.years.accuracy >= 0.85,
  });

  // Gate 8: Se houver vagas com salário publicado, Recall >= 0.90
  if (metrics.salary.truePositives + metrics.salary.falseNegatives > 0) {
    checks.push({
      id: 'salary_recall',
      name: 'Recall de salário publicado',
      hardGate: false,
      target: '>= 0.90',
      actual: metrics.salary.recall,
      passed: metrics.salary.recall >= 0.9,
    });
  }

  // Gate 9: Cohen's Kappa >= 0.80 se houver re-anotação cega
  if (metrics.cohensKappa && metrics.cohensKappa.n > 0) {
    checks.push({
      id: 'cohens_kappa_pass2',
      name: "Concordância inter-anotadores (Cohen's Kappa pass 2)",
      hardGate: true,
      target: '>= 0.80',
      actual: metrics.cohensKappa.kappa,
      passed: metrics.cohensKappa.kappa >= 0.8,
    });
  }

  const hardGatesPassed = checks.filter((c) => c.hardGate).every((c) => c.passed);
  const allPassed = checks.every((c) => c.passed);
  const passedChecks = checks.filter((c) => c.passed).length;

  return {
    approved: allPassed,
    hardGatesPassed,
    totalChecks: checks.length,
    passedChecks,
    checks,
  };
}
