import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { loadConfig } from './config.js';
import { runMatchingEngine } from './matching/engine.js';
import { generateGapAndMatchingReport } from './matching/report-generator.js';
import { createPool } from './persist/jobs-repo.js';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      extractor: { type: 'string', default: 'extract-v2' },
      profileVersion: { type: 'string', default: 'v1' },
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
    console.log('Executando matching vetorial e análise de gaps de mercado...');
    const result = await runMatchingEngine(pool, {
      extractorVersion: values.extractor ?? 'extract-v2',
      profileVersion: values.profileVersion ?? 'v1',
    });

    const reportMarkdown = generateGapAndMatchingReport(result);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, reportMarkdown, 'utf8');

    console.log('\n======================================================');
    console.log('        JOB RADAR AI — MATCHING & GAP REPORT         ');
    console.log('======================================================');
    console.log(`Vagas Analisadas:         ${result.jobs.length}`);
    console.log(`Skills Distintas no Mercado: ${result.marketGapAnalysis.distinctSkillsDemanded}`);
    console.log(`Cobertura Global do Perfil: ${result.marketGapAnalysis.overallCoveragePercentage}%`);
    console.log(`Cobertura em Must-Haves:    ${result.marketGapAnalysis.mustHaveCoveragePercentage}%`);
    console.log('------------------------------------------------------');
    console.log('            FORTALEZAS NUCLEARES (CORE ADVANTAGES)    ');
    console.log('------------------------------------------------------');
    for (const s of result.marketGapAnalysis.coreAdvantages.slice(0, 5)) {
      console.log(`  ✓ ${s.canonical.padEnd(20)} | Demanda: ${s.jobPercentage}% das vagas (${s.jobCount}x)`);
    }

    console.log('------------------------------------------------------');
    console.log('            GAPS ESTRATÉGICOS (RISCOS VS OUTROS CANDIDATOS) ');
    console.log('------------------------------------------------------');
    for (const g of result.marketGapAnalysis.strategicGaps.slice(0, 5)) {
      console.log(`  ✗ ${g.canonical.padEnd(20)} | Demanda: ${g.jobPercentage}% das vagas | ${g.recommendation}`);
    }

    console.log('------------------------------------------------------');
    console.log('            TOP 3 VAGAS COM MAIOR FIT                 ');
    console.log('------------------------------------------------------');
    for (const j of result.jobs.slice(0, 3)) {
      console.log(`  [Score: ${j.scoreResult.score}%] ${j.title} (${j.scoreResult.matchedMust}/${j.scoreResult.totalMust} musts)`);
    }
    console.log('======================================================');
    console.log(`Relatório completo salvo em:\n${outPath}`);
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
