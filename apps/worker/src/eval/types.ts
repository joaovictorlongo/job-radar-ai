import type {
  ClassificationMetrics,
  CohenKappaResult,
  GateEvaluationResult,
  MultiLabelMetrics,
  NumericToleranceMetrics,
  SalaryMetrics,
} from '@job-radar/shared';

export interface EvalRunSummary {
  evalRunId?: number;
  datasetVersion: string;
  extractorVersion: string;
  nJobs: number;
  timestamp: string;
  gates: GateEvaluationResult;
  metrics: {
    validJsonRate: number;
    groundingRate: number;
    seniority: ClassificationMetrics;
    workModel: ClassificationMetrics;
    stackMust: MultiLabelMetrics;
    stackNice: MultiLabelMetrics;
    salary: SalaryMetrics;
    years: NumericToleranceMetrics;
    cohensKappa?: CohenKappaResult;
    latency: {
      p50Ms: number | null;
      p95Ms: number | null;
      minMs: number | null;
      maxMs: number | null;
    };
    cost: {
      totalUsd: number | null;
      p50Usd: number | null;
      p95Usd: number | null;
    };
  };
}

export interface EvalOptions {
  datasetVersion: string;
  extractorVersion: string;
  save?: boolean;
}
