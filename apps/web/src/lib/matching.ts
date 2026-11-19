import { getDbPool } from './db';
import {
  computeJobMatchScore,
  type MatchScoreResult,
  type RequirementMatch,
} from '@job-radar/shared';

interface CachedSkillStatus {
  matched: boolean;
  score: number;
  evidence: string | null;
  section: string | null;
}

let skillCache: Map<string, CachedSkillStatus> | null = null;
let lastCacheSync = 0;

export async function getSkillMatchMap(): Promise<Map<string, CachedSkillStatus>> {
  const now = Date.now();
  if (skillCache && now - lastCacheSync < 60000) {
    return skillCache;
  }

  const pool = getDbPool();
  const cache = new Map<string, CachedSkillStatus>();

  // Busca todas as skills do catálogo e do perfil
  const chunksRes = await pool.query<{ section: string; content: string }>(
    `select section, content from profile_chunks where version = 'v1'`,
  );

  const fullProfileText = chunksRes.rows.map((r) => `${r.section}\n${r.content}`).join('\n\n');

  // Consulta todos os requisitos presentes no banco
  const reqsRes = await pool.query<{ canonical: string }>(
    `select distinct canonical from requirements`,
  );

  for (const { canonical } of reqsRes.rows) {
    const key = canonical.toLowerCase().trim();
    const regex = new RegExp(`(?<![a-z0-9])${escapeRegex(key)}(?![a-z0-9])`, 'i');
    const match = regex.exec(fullProfileText);

    if (match) {
      const idx = match.index;
      const start = Math.max(0, idx - 80);
      const end = Math.min(fullProfileText.length, idx + 120);
      const snippet = fullProfileText.substring(start, end).replace(/\s+/g, ' ').trim();

      cache.set(key, {
        matched: true,
        score: 0.95,
        evidence: `"...${snippet}..."`,
        section: 'Perfil João Victor Longo',
      });
    } else {
      cache.set(key, {
        matched: false,
        score: 0.1,
        evidence: null,
        section: null,
      });
    }
  }

  skillCache = cache;
  lastCacheSync = now;
  return cache;
}

export interface EvaluatedJobScore {
  jobId: string;
  scoreResult: MatchScoreResult;
  matchedRequirements: RequirementMatch[];
  gapRequirements: RequirementMatch[];
}

export async function evaluateJobFit(
  jobId: string,
  requirements: Array<{ canonical: string; kind: 'must' | 'nice' }>,
): Promise<EvaluatedJobScore> {
  const skillMap = await getSkillMatchMap();
  const requirementMatches: RequirementMatch[] = [];

  for (const req of requirements) {
    const key = req.canonical.toLowerCase().trim();
    const status = skillMap.get(key);

    if (status?.matched) {
      requirementMatches.push({
        requirement: req.canonical,
        kind: req.kind,
        matched: true,
        score: status.score,
        evidence: status.evidence,
        section: status.section,
        doc: 'profile',
      });
    } else {
      requirementMatches.push({
        requirement: req.canonical,
        kind: req.kind,
        matched: false,
        score: status?.score ?? 0,
        evidence: null,
        section: null,
        doc: null,
        reason: 'Tecnologia sem evidência comprovada no perfil',
      });
    }
  }

  const scoreResult = computeJobMatchScore(requirementMatches);

  return {
    jobId,
    scoreResult,
    matchedRequirements: requirementMatches.filter((r) => r.matched),
    gapRequirements: requirementMatches.filter((r) => !r.matched),
  };
}

function escapeRegex(text: string): string {
  return text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}
