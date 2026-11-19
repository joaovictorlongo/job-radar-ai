import { parseArgs } from 'node:util';
import { loadConfig } from './config.js';
import { runEvaluation } from './eval/service.js';
import { createPool } from './persist/jobs-repo.js';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      dataset: { type: 'string', default: 'dataset-v1' },
      extractor: { type: 'string', default: 'extract-v2' },
      save: { type: 'boolean', default: true },
    },
    strict: true,
  });

  const datasetVersion = values.dataset ?? 'dataset-v1';
  const extractorVersion = values.extractor ?? 'extract-v2';
  const save = values.save !== false;

  const config = loadConfig();
  const pool = createPool(config.databaseUrl);

  try {
    const summary = await runEvaluation(pool, {
      datasetVersion,
      extractorVersion,
      save,
    });

    console.log('\n======================================================');
    console.log('              JOB RADAR AI — EVAL RUN                ');
    console.log('======================================================');
    console.log(`Dataset Version:   ${summary.datasetVersion}`);
    console.log(`Extractor Version: ${summary.extractorVersion}`);
    console.log(`Jobs Avaliados:    ${summary.nJobs}`);
    if (summary.evalRunId) {
      console.log(`Eval Run ID:       #${summary.evalRunId}`);
    }
    console.log('------------------------------------------------------');
    console.log('                 GATES DE APROVAÇÃO                  ');
    console.log('------------------------------------------------------');

    for (const check of summary.gates.checks) {
      const icon = check.passed ? '✓ PASS' : '✗ FAIL';
      const type = check.hardGate ? '[DURO]' : '[META]';
      const targetStr = `Alvo: ${check.target}`.padEnd(16);
      const actualStr = `Obtido: ${check.actual}`;
      console.log(`${icon.padEnd(8)} ${type} ${check.name.padEnd(46)} | ${targetStr} | ${actualStr}`);
    }

    console.log('------------------------------------------------------');
    console.log('                 MÉTRICAS DETALHADAS                 ');
    console.log('------------------------------------------------------');
    console.log(`Seniority Accuracy:    ${(summary.metrics.seniority.accuracy * 100).toFixed(1)}% (${summary.metrics.seniority.correct}/${summary.metrics.seniority.total})`);
    console.log(`Work Model Accuracy:   ${(summary.metrics.workModel.accuracy * 100).toFixed(1)}% (${summary.metrics.workModel.correct}/${summary.metrics.workModel.total})`);
    console.log(`Salary False Positives: ${summary.metrics.salary.falsePositives} (Zero Gate)`);
    console.log(`Salary Recall:         ${(summary.metrics.salary.recall * 100).toFixed(1)}%`);
    console.log(`Years ±1 Tol Accuracy: ${(summary.metrics.years.accuracy * 100).toFixed(1)}%`);
    console.log(`Stack Must Micro F1:   ${summary.metrics.stackMust.micro.f1.toFixed(3)} (P: ${summary.metrics.stackMust.micro.precision.toFixed(3)}, R: ${summary.metrics.stackMust.micro.recall.toFixed(3)})`);
    console.log(`Stack Must Macro F1:   ${summary.metrics.stackMust.macro.f1.toFixed(3)} (P: ${summary.metrics.stackMust.macro.precision.toFixed(3)}, R: ${summary.metrics.stackMust.macro.recall.toFixed(3)})`);
    if (summary.metrics.cohensKappa) {
      console.log(`Cohen's Kappa (pass 2): ${summary.metrics.cohensKappa.kappa.toFixed(3)} (Acordo: ${(summary.metrics.cohensKappa.observedAgreement * 100).toFixed(1)}%)`);
    }
    console.log(`JSON Válido:           ${(summary.metrics.validJsonRate * 100).toFixed(1)}%`);
    console.log(`Grounding Literal:     ${(summary.metrics.groundingRate * 100).toFixed(1)}%`);
    if (summary.metrics.latency.p50Ms !== null) {
      console.log(`Latência (p50 / p95):  ${summary.metrics.latency.p50Ms} ms / ${summary.metrics.latency.p95Ms} ms`);
    }
    if (summary.metrics.cost.totalUsd !== null) {
      console.log(`Custo Total Registrado: US$ ${summary.metrics.cost.totalUsd.toFixed(6)}`);
    }
    console.log('======================================================');
    const verdict = summary.gates.approved ? 'APROVADO' : 'REPROVADO';
    console.log(`VEREDITO: ${verdict} (${summary.gates.passedChecks}/${summary.gates.totalChecks} checks atendidos)`);
    console.log('======================================================\n');
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`falha no eval: ${message}`);
  process.exitCode = 1;
});
