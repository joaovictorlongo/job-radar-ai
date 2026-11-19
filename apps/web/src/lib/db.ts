import pg from 'pg';
import type { StudyJobInput } from '@job-radar/shared';

const { Pool } = pg;

let globalPool: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  if (!globalPool) {
    const connectionString =
      process.env.DATABASE_URL ?? 'postgres://jobradar:jobradar@localhost:55432/jobradar';
    globalPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return globalPool;
}

export interface JobListRequirement {
  canonical: string;
  kind: 'must' | 'nice';
  category: string;
  evidenceSpan: string;
}

export interface JobListItem {
  id: string;
  source: string;
  sourceJobId: string;
  url: string;
  title: string;
  company: string | null;
  workModel: string | null;
  seniority: string | null;
  salaryPublished: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  yearsRequired: number | null;
  collectedAt: string;
  mustCount: number;
  niceCount: number;
  skills: string[];
  requirements: JobListRequirement[];
}

export async function fetchJobsList(filters?: {
  seniority?: string;
  workModel?: string;
  search?: string;
}): Promise<JobListItem[]> {
  const pool = getDbPool();
  const conditions: string[] = ['j.extractor_version is not null'];
  const params: unknown[] = [];

  if (filters?.seniority && filters.seniority !== 'all') {
    params.push(filters.seniority);
    conditions.push(`j.seniority = $${params.length}`);
  }

  if (filters?.workModel && filters.workModel !== 'all') {
    params.push(filters.workModel);
    conditions.push(`j.work_model = $${params.length}`);
  }

  if (filters?.search && filters.search.trim()) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    conditions.push(
      `(lower(j.title) like $${params.length} or lower(j.description) like $${params.length})`,
    );
  }

  const query = `
    select
      j.id,
      j.source,
      j.source_job_id,
      j.url,
      j.title,
      j.company,
      j.work_model,
      j.seniority,
      j.salary_published,
      j.salary_min,
      j.salary_max,
      j.salary_currency,
      j.years_required,
      j.collected_at,
      count(jr.id) filter (where jr.kind = 'must') as must_count,
      count(jr.id) filter (where jr.kind = 'nice') as nice_count,
      coalesce(
        json_agg(distinct r.canonical) filter (where r.canonical is not null),
        '[]'
      ) as skills,
      coalesce(
        json_agg(
          json_build_object(
            'canonical', r.canonical,
            'kind', jr.kind,
            'category', coalesce(r.category, 'other'),
            'evidenceSpan', coalesce(jr.evidence_span, r.canonical)
          )
        ) filter (where r.canonical is not null),
        '[]'
      ) as requirements
    from jobs j
    left join job_requirements jr on jr.job_id = j.id
    left join requirements r on r.id = jr.requirement_id
    where ${conditions.join(' and ')}
    group by j.id
    order by j.collected_at desc
  `;

  const res = await pool.query(query, params);

  return res.rows.map((row) => ({
    id: String(row.id),
    source: String(row.source),
    sourceJobId: String(row.source_job_id),
    url: String(row.url),
    title: String(row.title),
    company: row.company ? String(row.company) : null,
    workModel: row.work_model ? String(row.work_model) : null,
    seniority: row.seniority ? String(row.seniority) : null,
    salaryPublished: Boolean(row.salary_published),
    salaryMin: row.salary_min ? Number(row.salary_min) : null,
    salaryMax: row.salary_max ? Number(row.salary_max) : null,
    salaryCurrency: row.salary_currency ? String(row.salary_currency) : null,
    yearsRequired: row.years_required ? Number(row.years_required) : null,
    collectedAt: String(row.collected_at),
    mustCount: Number(row.must_count || 0),
    niceCount: Number(row.nice_count || 0),
    skills: Array.isArray(row.skills) ? row.skills : [],
    requirements: Array.isArray(row.requirements) ? row.requirements : [],
  }));
}

export async function fetchStudyJobs(): Promise<StudyJobInput[]> {
  const jobs = await fetchJobsList();
  return jobs.map((j) => ({
    id: j.id,
    title: j.title,
    company: j.company,
    source: j.source,
    url: j.url,
    seniority: j.seniority,
    workModel: j.workModel,
    salaryPublished: j.salaryPublished,
    requirements: j.requirements,
  }));
}

export interface JobDetailRequirement {
  id: string;
  canonical: string;
  kind: 'must' | 'nice';
  minYears: number | null;
  evidenceSpan: string;
  confidence: number;
  category: string;
}

export interface JobDetail {
  id: string;
  source: string;
  sourceJobId: string;
  url: string;
  title: string;
  company: string | null;
  workModel: string | null;
  seniority: string | null;
  salaryPublished: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  yearsRequired: number | null;
  description: string;
  lang: string;
  collectedAt: string;
  requirements: JobDetailRequirement[];
}

export async function fetchJobById(id: string): Promise<JobDetail | null> {
  const pool = getDbPool();

  const jobRes = await pool.query(
    `select id, source, source_job_id, url, title, company, work_model, seniority,
            salary_published, salary_min, salary_max, salary_currency, salary_period,
            years_required, description, lang, collected_at
     from jobs
     where id = $1`,
    [id],
  );

  const job = jobRes.rows[0];
  if (!job) return null;

  const reqsRes = await pool.query(
    `select jr.id, r.canonical, jr.kind, jr.min_years, jr.evidence_span, jr.confidence, r.category
     from job_requirements jr
     join requirements r on r.id = jr.requirement_id
     where jr.job_id = $1
     order by jr.kind asc, jr.confidence desc`,
    [id],
  );

  return {
    id: String(job.id),
    source: String(job.source),
    sourceJobId: String(job.source_job_id),
    url: String(job.url),
    title: String(job.title),
    company: job.company ? String(job.company) : null,
    workModel: job.work_model ? String(job.work_model) : null,
    seniority: job.seniority ? String(job.seniority) : null,
    salaryPublished: Boolean(job.salary_published),
    salaryMin: job.salary_min ? Number(job.salary_min) : null,
    salaryMax: job.salary_max ? Number(job.salary_max) : null,
    salaryCurrency: job.salary_currency ? String(job.salary_currency) : null,
    salaryPeriod: job.salary_period ? String(job.salary_period) : null,
    yearsRequired: job.years_required ? Number(job.years_required) : null,
    description: String(job.description),
    lang: String(job.lang),
    collectedAt: String(job.collected_at),
    requirements: reqsRes.rows.map((r) => ({
      id: String(r.id),
      canonical: String(r.canonical),
      kind: r.kind === 'nice' ? 'nice' : 'must',
      minYears: r.min_years ? Number(r.min_years) : null,
      evidenceSpan: String(r.evidence_span),
      confidence: Number(r.confidence || 1.0),
      category: r.category ? String(r.category) : 'other',
    })),
  };
}

export interface EvalRunRecord {
  id: number;
  datasetVersion: string;
  extractorVersion: string;
  nJobs: number;
  metrics: Record<string, unknown>;
  approved: boolean;
  createdAt: string;
}

export async function fetchLatestEvalRun(): Promise<EvalRunRecord | null> {
  const pool = getDbPool();
  const res = await pool.query(
    `select id, dataset_version, extractor_version, n_jobs, metrics, approved, created_at
     from eval_runs
     order by id desc
     limit 1`,
  );
  const row = res.rows[0];
  if (!row) return null;

  return {
    id: Number(row.id),
    datasetVersion: String(row.dataset_version),
    extractorVersion: String(row.extractor_version),
    nJobs: Number(row.n_jobs),
    metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics,
    approved: Boolean(row.approved),
    createdAt: String(row.created_at),
  };
}
