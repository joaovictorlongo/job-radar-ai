import { Pool } from 'pg';
import { descriptionHash } from '@job-radar/shared';
import type { RawJob } from '../sources/types.js';

export type UpsertStatus = 'inserted' | 'updated' | 'unchanged' | 'duplicate_hash';

export interface UpsertResult {
  status: UpsertStatus;
  id: string | null;
  descriptionHash: string;
}

export function createPool(databaseUrl: string): Pool {
  return new Pool({ connectionString: databaseUrl, max: 4 });
}

export async function upsertJob(pool: Pool, job: RawJob): Promise<UpsertResult> {
  const hash = descriptionHash(job.description);

  const duplicate = await pool.query<{ id: string }>(
    `select id from jobs
     where description_hash = $1
       and not (source = $2 and source_job_id = $3)
     limit 1`,
    [hash, job.source, job.sourceJobId],
  );
  if (duplicate.rowCount !== null && duplicate.rowCount > 0) {
    return { status: 'duplicate_hash', id: duplicate.rows[0]?.id ?? null, descriptionHash: hash };
  }

  const result = await pool.query<{ id: string; inserted: boolean }>(
    `insert into jobs (
       source, source_job_id, url, title, company, location_raw, country,
       work_model, seniority, employment_type, description, description_hash, lang, posted_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     on conflict (source, source_job_id) do update set
       url = excluded.url,
       title = excluded.title,
       company = excluded.company,
       location_raw = excluded.location_raw,
       country = excluded.country,
       work_model = excluded.work_model,
       seniority = excluded.seniority,
       employment_type = excluded.employment_type,
       description = excluded.description,
       description_hash = excluded.description_hash,
       lang = excluded.lang,
       posted_at = excluded.posted_at
     where jobs.description_hash is distinct from excluded.description_hash
     returning id, (xmax = 0) as inserted`,
    [
      job.source,
      job.sourceJobId,
      job.url,
      job.title,
      job.company,
      job.locationRaw,
      job.country,
      job.workModel,
      job.seniority,
      job.employmentType,
      job.description,
      hash,
      job.lang,
      job.postedAt,
    ],
  );

  const row = result.rows[0];
  if (row === undefined) {
    return { status: 'unchanged', id: null, descriptionHash: hash };
  }
  return {
    status: row.inserted ? 'inserted' : 'updated',
    id: row.id,
    descriptionHash: hash,
  };
}
