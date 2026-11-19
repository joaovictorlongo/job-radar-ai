import { describe, expect, it } from 'vitest';
import { buildProficiencyIndex, type ProfileSkillsDocument } from '../profile/skills-schema.js';
import { analyzeStudyIntelligence, type StudyJobInput } from './study-intelligence.js';

const mockProfile: ProfileSkillsDocument = {
  version: 'v1',
  owner: 'João Teste',
  updatedAt: '2026-11-19',
  skills: [
    { canonical: 'typescript', proficiency: 'production_senior', evidence: '4 anos em produção' },
    { canonical: 'node.js', proficiency: 'production_senior', evidence: '4 anos em produção' },
    { canonical: 'postgresql', proficiency: 'production_senior', evidence: '4 anos em produção' },
    { canonical: 'aws', proficiency: 'production_senior', evidence: 'Produção Field Control' },
    { canonical: 'react', proficiency: 'working_knowledge', evidence: 'Portfólio Next.js' },
    { canonical: 'python', proficiency: 'working_knowledge', evidence: 'Scripts e estudos' },
  ],
};

const mockJobs: StudyJobInput[] = [
  {
    id: 'j1',
    title: 'Senior Full Stack Node + React',
    company: 'Acme',
    source: 'programathor',
    url: 'https://example.com/1',
    seniority: 'senior',
    workModel: 'remote',
    salaryPublished: false,
    requirements: [
      { canonical: 'typescript', kind: 'must', evidenceSpan: 'TypeScript obrigatório' },
      { canonical: 'node.js', kind: 'must', evidenceSpan: 'Node.js sênior' },
      { canonical: 'react', kind: 'must', evidenceSpan: 'React em produção' },
      { canonical: 'kafka', kind: 'must', evidenceSpan: 'Experiência com Kafka' },
      { canonical: 'logs estruturados', kind: 'nice', evidenceSpan: 'Logs estruturados' },
      { canonical: 'tracing', kind: 'nice', evidenceSpan: 'Tracing distribuído' },
      { canonical: 'vontade de aprender e crescer na area', kind: 'must', evidenceSpan: 'Vontade de aprender' },
    ],
  },
  {
    id: 'j2',
    title: 'Tech Lead Senior',
    company: 'Beta',
    source: 'programathor',
    url: 'https://example.com/2',
    seniority: 'lead',
    workModel: 'remote',
    salaryPublished: false,
    requirements: [
      { canonical: 'node.js', kind: 'must', evidenceSpan: 'Node.js' },
      { canonical: 'kafka/rabbitmq', kind: 'must', evidenceSpan: 'Kafka/RabbitMQ' },
      { canonical: 'observabilidade', kind: 'must', evidenceSpan: 'Observabilidade em escala' },
    ],
  },
  {
    id: 'j3',
    title: 'Analista SAP B1 Pleno',
    company: 'ERP Corp',
    source: 'programathor',
    url: 'https://example.com/3',
    seniority: 'mid',
    workModel: 'onsite',
    salaryPublished: false,
    requirements: [
      { canonical: 'c#', kind: 'must', evidenceSpan: 'C#' },
      { canonical: 'experience with sap business one', kind: 'must', evidenceSpan: 'SAP B1' },
    ],
  },
];

describe('analyzeStudyIntelligence', () => {
  it('exclui vagas fora de escopo por padrão, separa depthGaps de technicalGaps e calcula ROI contrafactual', () => {
    const profileIndex = buildProficiencyIndex(mockProfile);
    const report = analyzeStudyIntelligence(mockJobs, profileIndex, { trackFilter: 'target' });

    // SAP B1 deve ser filtrada da trilha-alvo
    expect(report.totalJobsInDatabase).toBe(3);
    expect(report.analyzedJobsCount).toBe(2);
    expect(report.outOfScopeJobsCount).toBe(1);
    expect(report.filteredNoiseRequirementsCount).toBeGreaterThanOrEqual(1);

    // C# não deve contaminar gaps da trilha-alvo
    expect(report.technicalGaps.some((g) => g.canonical === 'c#')).toBe(false);

    // React deve aparecer em depthGaps (partial_evidence), NÃO em coreAdvantages
    expect(report.depthGaps.some((g) => g.canonical === 'react')).toBe(true);
    expect(report.coreAdvantages.some((c) => c.canonical === 'react')).toBe(false);

    // Observabilidade deve agrupar logs estruturados + tracing + observabilidade (2/2 vagas = 100%)
    const obsGap = report.technicalGaps.find((g) => g.canonical === 'observabilidade');
    expect(obsGap?.jobCount).toBe(2);
    expect(obsGap?.jobPercentage).toBe(100);

    // Kafka aparece em 2/2 vagas (via kafka e kafka/rabbitmq) e gera ganho real no simulador
    const kafkaPriority = report.studyPriorities.find((p) => p.skill.canonical === 'kafka');
    expect(kafkaPriority).toBeDefined();
    expect(kafkaPriority?.avgTrackScoreGain).toBeGreaterThan(0);
    expect(kafkaPriority?.jobsImprovedCount).toBe(2);

    // Benchmark dinâmico contra concorrentes roda nas mesmas vagas
    expect(report.competitorBenchmarks).toHaveLength(3);
    const backendComp = report.competitorBenchmarks.find(
      (b) => b.archetype.id === 'senior_backend_cloud',
    );
    expect(backendComp?.competitorAdvantages.some((a) => a.canonical === 'kafka')).toBe(true);
  });
});
