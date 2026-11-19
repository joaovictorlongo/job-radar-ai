import { TRACK_LABELS } from '@job-radar/shared';
import type { MatchingAnalysisOutput } from './engine.js';

export function generateGapAndMatchingReport(data: MatchingAnalysisOutput): string {
  const { studyIntelligence: report, generatedAt } = data;
  const trackMeta = TRACK_LABELS[report.trackFilter];

  const lines: string[] = [];

  lines.push('# Relatório de Inteligência de Estudo, Gaps e Competitividade');
  lines.push(
    `*Gerado em: ${new Date(generatedAt).toLocaleString('pt-BR')} | Trilha: ${trackMeta.label} | Base ativa: ${report.analyzedJobsCount}/${report.totalJobsInDatabase} vagas (${report.outOfScopeJobsCount} fora de escopo separadas)*`,
  );
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 1. Sumário Executivo da Trilha-Alvo');
  lines.push('');
  lines.push('| Métrica | Valor Medido | Contexto |');
  lines.push('|---|---|---|');
  lines.push(`| **Vagas Analisadas na Trilha** | ${report.analyzedJobsCount} | Excluídas ${report.outOfScopeJobsCount} vagas fora de escopo (C#, Java, PHP, SAP, Estágio) |`);
  lines.push(`| **Rótulos Genéricos Filtrados** | ${report.filteredNoiseRequirementsCount} | Frases de ruído removidas antes do cálculo |`);
  lines.push(`| **Fit Médio do João na Trilha** | **${report.joaoAvgFitScore}%** | ${report.highFitCount} Alto Fit (≥75%), ${report.mediumFitCount} Médio Fit, ${report.lowFitCount} Baixo Fit |`);
  lines.push(`| **Cobertura Must-Have (Produção Sênior)** | **${report.productionMustCoveragePct}%** | ${report.technicalMustCoveragePct}% incluindo conhecimento parcial |`);
  lines.push(`| **Gaps de Profundidade (Quick Wins)** | ${report.depthGaps.length} | Skills com prática/estudo que precisam de evidência de produção |`);
  lines.push(`| **Gaps Técnicos Reais** | ${report.technicalGaps.length} | Skills exigidas na trilha sem evidência no perfil atual |`);
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## 2. Simulador de ROI por Cluster de Estudo');
  lines.push('');
  lines.push('| Cluster | Skills em Gap | Presença na Trilha | Ganho Médio na Trilha | Vagas → Alto Fit | Próximo Passo |');
  lines.push('|---|---|---|---|---|---|');
  for (const c of report.clusterImpacts.slice(0, 6)) {
    lines.push(
      `| **${c.cluster}** | ${c.skills.join(', ')} | ${c.jobsDemandingPercentage}% (${c.jobsDemandingCount} vagas) | **+${c.avgTrackScoreGain} pts** | +${c.jobsUnlockedToHighFit} | ${c.recommendedAction} |`,
    );
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## 3. Ranking Prioritário de Gaps para Estudo');
  lines.push('');
  lines.push('| # | Skill | Horizonte | Nível Atual | Demanda | Ganho / Vaga Afetada | ROI | Ação Recomendada |');
  lines.push('|---|---|---|---|---|---|---|---|');
  report.studyPriorities.slice(0, 12).forEach((item, idx) => {
    lines.push(
      `| ${idx + 1} | **${item.skill.canonical}** | ${item.horizonLabel} | ${item.skill.userProficiencyLabel} | ${item.skill.jobPercentage}% (${item.skill.jobCount}x, ${item.skill.mustCount} must) | +${item.affectedJobsAvgGain} pts | **${item.priorityScore}** | ${item.studyAction} |`,
    );
  });
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## 4. Benchmark Dinâmico: João vs Concorrentes (Mesmas Vagas)');
  lines.push('');
  lines.push('> *Nota:* Os 3 perfis abaixo são arquétipos de referência calibrados rodando no mesmo motor de scoring contra as mesmas vagas da trilha.');
  lines.push('');
  lines.push('| Arquétipo Concorrente | Fit João | Fit Concorrente | Delta | Onde o Concorrente Te Supera | Onde Você Supera |');
  lines.push('|---|---|---|---|---|---|');
  for (const b of report.competitorBenchmarks) {
    const delta = b.scoreDelta >= 0 ? `+${b.scoreDelta}` : String(b.scoreDelta);
    const compAdv = b.competitorAdvantages
      .slice(0, 5)
      .map((e) => `${e.canonical} (${e.jobCount}x)`)
      .join(', ');
    const joaoAdv = b.joaoAdvantages
      .slice(0, 5)
      .map((e) => `${e.canonical} (${e.jobCount}x)`)
      .join(', ');
    lines.push(
      `| **${b.archetype.name}** | **${b.joaoAvgScore}%** | ${b.competitorAvgScore}% | **${delta} pts** | ${compAdv || '—'} | ${joaoAdv || '—'} |`,
    );
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## 5. Vagas Avaliadas na Trilha-Alvo');
  lines.push('');
  for (const job of report.evaluatedJobs) {
    const badge =
      job.fitLevel === 'high' ? '🟢 ALTO FIT' : job.fitLevel === 'medium' ? '🟡 MÉDIO FIT' : '🔴 BAIXO FIT';
    lines.push(
      `- **[${badge} ${job.score}%]** [${job.title}](${job.url}) — *${TRACK_LABELS[job.track.primaryTrack].label}* | Must-Haves: ${job.mustStrong} produção, ${job.mustPartial} parcial, ${job.mustGap} gap (total ${job.mustTotal})`,
    );
  }
  lines.push('');

  return lines.join('\n');
}
