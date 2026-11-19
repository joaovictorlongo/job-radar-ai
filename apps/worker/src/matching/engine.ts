import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';
import {
  analyzeMarketGaps,
  analyzeStudyIntelligence,
  buildProficiencyIndex,
  computeJobMatchScore,
  profileSkillsSchema,
  profileSkillsToEvidenceMap,
  type JobWithExtractedRequirements,
  type MarketGapAnalysisResult,
  type MatchScoreResult,
  type RequirementMatch,
  type StudyIntelligenceReport,
  type StudyJobInput,
  type TrackFilter,
} from '@job-radar/shared';
import { createEmbeddingAdapter, type EmbeddingAdapter } from '../embeddings/adapter.js';

export interface DetailedJobMatch {
  jobId: string;
  title: string;
  company: string | null;
  source: string;
  url: string;
  seniority: string | null;
  workModel: string | null;
  scoreResult: MatchScoreResult;
  matchedRequirements: RequirementMatch[];
  gapRequirements: RequirementMatch[];
}

export interface MatchingAnalysisOutput {
  jobs: DetailedJobMatch[];
  marketGapAnalysis: MarketGapAnalysisResult;
  studyIntelligence: StudyIntelligenceReport;
  generatedAt: string;
}

interface RawJobRow {
  id: string;
  title: string;
  company: string | null;
  source: string;
  url: string;
  seniority: string | null;
  work_model: string | null;
  salary_published: boolean;
}

interface RawReqRow {
  job_id: string;
  canonical: string;
  kind: 'must' | 'nice';
  category: string | null;
  evidence_span: string | null;
}

interface VectorSearchRow {
  doc: string;
  section: string;
  content: string;
  similarity: number;
}

function loadStructuredProfileSkills() {
  const skillsPath = fileURLToPath(new URL('../../../../profile/skills.json', import.meta.url));
  const raw = readFileSync(skillsPath, 'utf8');
  const doc = profileSkillsSchema.parse(JSON.parse(raw));
  return {
    doc,
    index: buildProficiencyIndex(doc),
    evidenceMap: profileSkillsToEvidenceMap(doc),
  };
}

export async function runMatchingEngine(
  pool: Pool,
  options: {
    extractorVersion?: string;
    profileVersion?: string;
    similarityThreshold?: number;
    embeddingAdapter?: EmbeddingAdapter;
    trackFilter?: TrackFilter;
  } = {},
): Promise<MatchingAnalysisOutput> {
  const {
    extractorVersion = 'extract-v2',
    profileVersion = 'v1',
    similarityThreshold = 0.6,
    trackFilter = 'target',
  } = options;

  const adapter = options.embeddingAdapter ?? createEmbeddingAdapter();
  const structuredProfile = loadStructuredProfileSkills();

  const jobsRes = await pool.query<RawJobRow>(
    `select id, title, company, source, url, seniority, work_model, salary_published
     from jobs
     where extractor_version = $1
     order by collected_at desc`,
    [extractorVersion],
  );

  if (jobsRes.rows.length === 0) {
    throw new Error(`Nenhuma vaga encontrada com extractor_version='${extractorVersion}'`);
  }

  const jobIds = jobsRes.rows.map((j) => j.id);
  const reqsRes = await pool.query<RawReqRow>(
    `select jr.job_id, r.canonical, jr.kind, r.category, jr.evidence_span
     from job_requirements jr
     join requirements r on r.id = jr.requirement_id
     where jr.job_id = any($1::uuid[])`,
    [jobIds],
  );

  const reqsByJob = new Map<string, RawReqRow[]>();
  const distinctSkills = new Set<string>();

  for (const r of reqsRes.rows) {
    let list = reqsByJob.get(r.job_id);
    if (!list) {
      list = [];
      reqsByJob.set(r.job_id, list);
    }
    list.push(r);
    distinctSkills.add(r.canonical.toLowerCase().trim());
  }

  // Busca vetorial no pgvector + evidências do perfil estruturado
  const skillEvidenceCache = new Map<
    string,
    { matched: boolean; score: number; evidence: string | null; section: string | null; doc: string | null }
  >();

  const distinctList = [...distinctSkills];
  const embeddings = distinctList.length > 0 ? await adapter.embed(distinctList) : [];

  for (let i = 0; i < distinctList.length; i++) {
    const skill = distinctList[i];
    const embedding = embeddings[i];
    if (!skill || !embedding) continue;

    const structured = structuredProfile.index.get(skill);
    const vectorStr = `[${embedding.join(',')}]`;

    const matchRes = await pool.query<VectorSearchRow>(
      `select doc, section, content, 1 - (embedding <=> $1::vector) as similarity
       from profile_chunks
       where version = $2
       order by embedding <=> $1::vector asc
       limit 1`,
      [vectorStr, profileVersion],
    );

    const best = matchRes.rows[0];
    const similarity = best ? Number(best.similarity) : 0;

    if (structured && structured.proficiency !== 'none') {
      skillEvidenceCache.set(skill, {
        matched: true,
        score: structured.proficiency === 'production_senior' ? Math.max(similarity, 0.95) : 0.65,
        evidence: structured.evidence,
        section: structured.proficiency,
        doc: 'profile/skills.json',
      });
    } else if (best && similarity >= similarityThreshold) {
      skillEvidenceCache.set(skill, {
        matched: true,
        score: Math.round(similarity * 1000) / 1000,
        evidence: cleanEvidence(best.content),
        section: best.section,
        doc: best.doc,
      });
    } else {
      skillEvidenceCache.set(skill, {
        matched: false,
        score: Math.round(similarity * 1000) / 1000,
        evidence: null,
        section: null,
        doc: null,
      });
    }
  }

  const detailedJobs: DetailedJobMatch[] = [];
  const jobsForMarketAnalysis: JobWithExtractedRequirements[] = [];
  const studyInputs: StudyJobInput[] = [];

  for (const job of jobsRes.rows) {
    const jobReqs = reqsByJob.get(job.id) ?? [];
    const requirementMatches: RequirementMatch[] = [];

    for (const req of jobReqs) {
      const canonical = req.canonical.toLowerCase().trim();
      const match = skillEvidenceCache.get(canonical);

      if (match && match.matched) {
        requirementMatches.push({
          requirement: req.canonical,
          kind: req.kind,
          matched: true,
          score: match.score,
          evidence: match.evidence,
          section: match.section,
          doc: match.doc,
        });
      } else {
        requirementMatches.push({
          requirement: req.canonical,
          kind: req.kind,
          matched: false,
          score: match ? match.score : 0,
          evidence: null,
          section: null,
          doc: null,
          reason: 'Tecnologia sem evidência comprovada no perfil',
        });
      }
    }

    const scoreResult = computeJobMatchScore(requirementMatches);
    detailedJobs.push({
      jobId: job.id,
      title: job.title,
      company: job.company,
      source: job.source,
      url: job.url,
      seniority: job.seniority,
      workModel: job.work_model,
      scoreResult,
      matchedRequirements: requirementMatches.filter((r) => r.matched),
      gapRequirements: requirementMatches.filter((r) => !r.matched),
    });

    jobsForMarketAnalysis.push({
      id: job.id,
      title: job.title,
      requirements: jobReqs.map((r) => ({
        canonical: r.canonical,
        category: r.category ?? 'tech',
        kind: r.kind,
      })),
    });

    studyInputs.push({
      id: job.id,
      title: job.title,
      company: job.company,
      source: job.source,
      url: job.url,
      seniority: job.seniority,
      workModel: job.work_model,
      salaryPublished: Boolean(job.salary_published),
      requirements: jobReqs.map((r) => ({
        canonical: r.canonical,
        kind: r.kind,
        category: r.category ?? 'other',
        evidenceSpan: r.evidence_span ?? r.canonical,
      })),
    });
  }

  detailedJobs.sort((a, b) => b.scoreResult.score - a.scoreResult.score);

  const marketGapAnalysis = analyzeMarketGaps(
    jobsForMarketAnalysis,
    structuredProfile.evidenceMap,
  );
  const studyIntelligence = analyzeStudyIntelligence(studyInputs, structuredProfile.index, {
    trackFilter,
  });

  return {
    jobs: detailedJobs,
    marketGapAnalysis,
    studyIntelligence,
    generatedAt: new Date().toISOString(),
  };
}

function cleanEvidence(content: string): string {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.slice(0, 3).join(' ').slice(0, 250);
}
