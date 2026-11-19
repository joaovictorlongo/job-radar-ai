import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import type { TrackFilter } from '@job-radar/shared';
import { loadConfig } from './config.js';
import { runMatchingEngine } from './matching/engine.js';
import { generateGapAndMatchingReport } from './matching/report-generator.js';
import { createPool } from './persist/jobs-repo.js';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      extractor: { type: 'string', default: 'extract-v2' },
      profileVersion: { type: 'string', default: 'v1' },
      track: { type: 'string', default: 'target' },
      out: { type: 'string' },
    },
    strict: true,
  });

  const config = loadConfig();
  const pool = createPool(config.databaseUrl);

  const defaultOut = fileURLToPath(
    new URL('../../../reports/relatorio-gaps-e-competitividade.md', import.meta.url),
  );
  const outPath = values.out ?? defaultOut;

  try {
    console.log('Executando inteligência de estudo, matching ponderado e análise de gaps...');
    const result = await runMatchingEngine(pool, {
      extractorVersion: values.extractor ?? 'extract-v2',
      profileVersion: values.profileVersion ?? 'v1',
      trackFilter: (values.track as TrackFilter | undefined) ?? 'target',
    });

    const reportMarkdown = generateGapAndMatchingReport(result);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, reportMarkdown, 'utf8');

    const study = result.studyIntelligence;
    console.log('\n======================================================');
    console.log('     JOB RADAR AI — STUDY & GAP INTELLIGENCE REPORT   ');
    console.log('======================================================');
    console.log(
      `Vagas na Trilha (${study.trackFilter}): ${study.analyzedJobsCount}/${study.totalJobsInDatabase} (${study.outOfScopeJobsCount} fora de escopo)`,
    );
    console.log(`Fit Médio na Trilha:        ${study.joaoAvgFitScore}%`);
    console.log(
      `Must-Haves em Produção:     ${study.productionMustCoveragePct}% (${study.technicalMustCoveragePct}% c/ parcial)`,
    );
    console.log('------------------------------------------------------');
    console.log('         TOP 5 GAPS PRIORITÁRIOS PARA ESTUDO          ');
    console.log('------------------------------------------------------');
    for (const item of study.studyPriorities.slice(0, 5)) {
      console.log(
        `  [ROI ${String(item.priorityScore).padStart(2)}] ${item.skill.canonical.padEnd(18)} | ${item.skill.jobPercentage}% (${item.skill.jobCount}x) | ${item.skill.userProficiencyLabel} | +${item.affectedJobsAvgGain} pts/vaga`,
      );
    }
    console.log('------------------------------------------------------');
    console.log('         BENCHMARK VS ARQUÉTIPOS CONCORRENTES         ');
    console.log('------------------------------------------------------');
    for (const b of study.competitorBenchmarks) {
      const sign = b.scoreDelta >= 0 ? '+' : '';
      console.log(
        `  ${b.archetype.name.padEnd(32)} | João ${b.joaoAvgScore}% vs ${b.competitorAvgScore}% (${sign}${b.scoreDelta} pts)`,
      );
    }
    console.log('======================================================');
    console.log(`Relatório salvo em:\n${outPath}`);
    console.log('======================================================\n');
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`falha na geração do relatório: ${message}`);
  process.exitCode = 1;
});
