# Technical decisions

## D1 — Embedding dimension is fixed at 1536

The specification left the embedding dimension open (`vector(N)`, `[confirmar]`). A migration cannot stay open, so the dimension is fixed:

- model: `text-embedding-3-small`
- dimension: `1536`
- declared in `.env.example` as `EMBEDDING_MODEL` and `EMBEDDING_DIM`
- hardcoded in `db/migrations/0001_init.sql` as `vector(1536)`

Changing the model dimension requires a new migration that rewrites the column and rebuilds both HNSW indexes. The embedding adapter must assert `EMBEDDING_DIM` equals the migration dimension before writing, so a mismatch fails at write time instead of silently corrupting similarity search.

## D2 — Salary invariant lives at three layers

`salary_published` is a derived field, so it is enforced where it can be violated:

1. Zod: `published = false` forces `min`, `max`, `currency` and `period` to `null`; `published = true` requires at least one amount, a currency and a known period, and `min <= max`.
2. Grounding: each published amount must appear in the normalised description, otherwise the whole extraction is rejected.
3. Postgres: `jobs_salary_consistent` and `jobs_salary_range` check constraints reject inconsistent rows, including manual writes.

A false published salary fails the project even if every other metric passes, so the three layers are intentional redundancy.

## D3 — Dedupe has two keys

- `unique (source, source_job_id)` makes collection idempotent and lets a changed description update the row.
- `description_hash` (SHA-256 of the whitespace-normalised description) detects the same post mirrored across sources. The second copy is skipped and counted as `duplicate_hash`; the first URL is kept.

`description_hash` has a plain index, not a unique constraint: the same text can legitimately appear twice under different sources, and the skip decision belongs to the collector, not to the database.

## D4 — `scrappingjob` is not reusable as a collector

Inventory of `github.com/joaovictorlongo/scrappingjob` (2026-11-19):

- one scraper strategy: LinkedIn jobs, via Puppeteer with stealth plugin;
- NestJS API + TypeORM entity + Angular frontend.

The only existing parser targets LinkedIn, which the specification excludes. Therefore:

- no collector code is reused;
- collection starts from public, structured sources (Programathor HTML, Remote OK JSON);
- NestJS remains the planned framework for `apps/api`, but it is not needed for ingestion.

## D5 — Collection writes raw fields only

`jobs` holds both raw and derived fields. The boundary:

- collector writes: `source`, `source_job_id`, `url`, `title`, `company`, `location_raw`, `country`, `work_model`, `seniority`, `employment_type`, `description`, `description_hash`, `lang`, `posted_at`;
- extractor writes: `salary_*`, `years_required`, `extractor_version`, `job_requirements`, `extraction_runs`.

`work_model` and `seniority` are filled from listing metadata when present and refined by the extractor. Collection never sets `salary_published = true`; only the extractor can, and only with grounding and the database constraint.

## D6 — Extraction cache is keyed by content and extractor version

`extraction_cache (description_hash, extractor_version)` stores the validated payload so reprocessing the same description under the same extractor does not call the LLM again. Changing the prompt adds a new `extractor_version`; old entries stay for comparison and are never overwritten.
