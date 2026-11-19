import type { Pool } from 'pg';
import {
  analyzeMarketGaps,
  computeJobMatchScore,
  type JobWithExtractedRequirements,
  type MarketGapAnalysisResult,
  type MatchScoreResult,
  type RequirementMatch,
  type UserSkillEvidenceMap,
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
}

interface RawReqRow {
  job_id: string;
  canonical: string;
  kind: 'must' | 'nice';
  category: string | null;
}

interface VectorSearchRow {
  doc: string;
  section: string;
  content: string;
  similarity: number;
}

export async function runMatchingEngine(
  pool: Pool,
  options: {
    extractorVersion?: string;
    profileVersion?: string;
    similarityThreshold?: number;
    embeddingAdapter?: EmbeddingAdapter;
  } = {},
): Promise<MatchingAnalysisOutput> {
  const {
    extractorVersion = 'extract-v2',
    profileVersion = 'v1',
    similarityThreshold = 0.60,
  } = options;

  const adapter = options.embeddingAdapter ?? createEmbeddingAdapter();

  // 1. Busca vagas extraídas
  const jobsRes = await pool.query<RawJobRow>(
    `select id, title, company, source, url, seniority, work_model
     from jobs
     where extractor_version = $1
     order by collected_at desc`,
    [extractorVersion],
  );

  if (jobsRes.rows.length === 0) {
    throw new Error(`Nenhuma vaga encontrada com extractor_version='${extractorVersion}'`);
  }

  // 2. Busca requisitos das vagas
  const jobIds = jobsRes.rows.map((j) => j.id);
  const reqsRes = await pool.query<RawReqRow>(
    `select jr.job_id, r.canonical, jr.kind, r.category
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

  // 3. Avalia cada skill distinta contra o perfil no pgvector
  const skillEvidenceCache = new Map<
    string,
    { matched: boolean; score: number; evidence: string | null; section: string | null; doc: string | null }
  >();

  const distinctList = [...distinctSkills];
  const embeddings = await adapter.embed(distinctList);

  for (let i = 0; i < distinctList.length; i++) {
    const skill = distinctList[i]!;
    const embedding = embeddings[i]!;
    const vectorStr = `[${embedding.join(',')}]`;

    // Busca o chunk mais relevante no pgvector
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

    // Checagem híbrida: similaridade semântica no vetor OU menção literal no conteúdo do perfil
    const literalMatchRes = await pool.query<VectorSearchRow>(
      `select doc, section, content
       from profile_chunks
       where version = $1 and lower(content) ~* $2
       limit 1`,
      [profileVersion, `\\m${escapeRegex(skill)}\\M`],
    );

    const literalBest = literalMatchRes.rows[0];

    if (literalBest) {
      skillEvidenceCache.set(skill, {
        matched: true,
        score: Math.max(similarity, 0.95),
        evidence: cleanEvidence(literalBest.content, skill),
        section: literalBest.section,
        doc: literalBest.doc,
      });
    } else if (best && similarity >= similarityThreshold) {
      skillEvidenceCache.set(skill, {
        matched: true,
        score: Math.round(similarity * 1000) / 1000,
        evidence: cleanEvidence(best.content, skill),
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

  // 4. Monta o mapa de evidências de usuário para análise de mercado
  const userEvidenceMap: UserSkillEvidenceMap = {};
  for (const [skill, matchData] of skillEvidenceCache) {
    if (matchData.matched) {
      userEvidenceMap[skill] = {
        status: matchData.score >= 0.85 ? 'strong_evidence' : 'partial_evidence',
        evidence: matchData.evidence ?? 'Evidência no perfil',
        doc: matchData.doc ?? undefined,
        section: matchData.section ?? undefined,
      };
    } else {
      userEvidenceMap[skill] = {
        status: 'gap',
        evidence: 'Nenhuma menção ou evidência identificada no perfil.',
      };
    }
  }

  // 5. Calcula o match detalhado por vaga
  const detailedJobs: DetailedJobMatch[] = [];
  const jobsForMarketAnalysis: JobWithExtractedRequirements[] = [];

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
    const matchedRequirements = requirementMatches.filter((r) => r.matched);
    const gapRequirements = requirementMatches.filter((r) => !r.matched);

    detailedJobs.push({
      jobId: job.id,
      title: job.title,
      company: job.company,
      source: job.source,
      url: job.url,
      seniority: job.seniority,
      workModel: job.work_model,
      scoreResult,
      matchedRequirements,
      gapRequirements,
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
  }

  // Ordena vagas por Score decrescente
  detailedJobs.sort((a, b) => b.scoreResult.score - a.scoreResult.score);

  // 6. Roda a análise agregada de mercado
  const marketGapAnalysis = analyzeMarketGaps(jobsForMarketAnalysis, userEvidenceMap);

  return {
    jobs: detailedJobs,
    marketGapAnalysis,
    generatedAt: new Date().toISOString(),
  };
}

function cleanEvidence(content: string, _skill: string): string {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.slice(0, 3).join(' ').slice(0, 250);
}

function escapeRegex(text: string): string {
  return text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}
