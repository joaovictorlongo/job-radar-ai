create extension if not exists vector;
create extension if not exists pgcrypto;

create table requirements (
  id        serial primary key,
  canonical text not null unique,
  category  text not null check (category in
              ('language','framework','database','cloud','devops','ai','soft','other')),
  aliases   text[] not null default '{}'
);

create table jobs (
  id                uuid primary key default gen_random_uuid(),
  source            text not null,
  source_job_id     text not null,
  url               text not null,
  title             text not null,
  company           text,
  location_raw      text,
  country           char(2),
  work_model        text check (work_model in ('remote','hybrid','onsite','unknown')),
  seniority         text check (seniority in ('intern','junior','mid','senior','lead','unknown')),
  employment_type   text,
  salary_published  boolean not null default false,
  salary_min        numeric(12,2),
  salary_max        numeric(12,2),
  salary_currency   char(3),
  salary_period     text check (salary_period in ('month','year','hour','unknown')),
  years_required    numeric(4,1),
  description       text not null,
  description_hash  text not null,
  lang              char(2) not null default 'pt',
  posted_at         date,
  collected_at      timestamptz not null default now(),
  extractor_version text,
  unique (source, source_job_id),
  constraint jobs_salary_consistent check (
    (salary_published = false and salary_min is null and salary_max is null)
    or (salary_published = true and (salary_min is not null or salary_max is not null))
  ),
  constraint jobs_salary_range check (
    salary_min is null or salary_max is null or salary_min <= salary_max
  )
);

create index jobs_description_hash_idx on jobs (description_hash);
create index jobs_collected_at_idx on jobs (collected_at desc);
create index jobs_source_idx on jobs (source);

create table job_requirements (
  id                bigserial primary key,
  job_id            uuid not null references jobs(id) on delete cascade,
  requirement_id    int not null references requirements(id),
  kind              text not null check (kind in ('must','nice')),
  min_years         numeric(4,1),
  evidence_span     text,
  confidence        numeric(3,2) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  extractor_version text not null,
  unique (job_id, requirement_id, kind)
);

create index job_requirements_job_id_idx on job_requirements (job_id);

create table extraction_runs (
  id             bigserial primary key,
  job_id         uuid references jobs(id) on delete cascade,
  model          text not null,
  prompt_version text not null,
  schema_version text not null,
  status         text not null check (status in ('ok','invalid_json','grounding_failed','error')),
  tokens_in      int,
  tokens_out     int,
  cost_usd       numeric(10,6),
  latency_ms     int,
  raw_output     jsonb,
  created_at     timestamptz not null default now()
);

create index extraction_runs_job_idx on extraction_runs (job_id, created_at desc);
create index extraction_runs_status_idx on extraction_runs (status, created_at desc);

create table extraction_cache (
  description_hash  text not null,
  extractor_version text not null,
  model             text not null,
  payload           jsonb not null,
  created_at        timestamptz not null default now(),
  primary key (description_hash, extractor_version)
);

create table labels (
  id           bigserial primary key,
  job_id       uuid not null references jobs(id) on delete cascade,
  field        text not null check (field in
                 ('seniority','work_model','salary_published','stack_must','stack_nice','years')),
  value        jsonb not null,
  annotator    text not null,
  annotated_at timestamptz not null default now(),
  pass         smallint not null default 1 check (pass in (1,2))
);

create unique index labels_one_per_pass on labels (job_id, field, annotator, pass);

create table eval_runs (
  id                bigserial primary key,
  dataset_version   text not null,
  extractor_version text not null,
  n_jobs            int not null,
  metrics           jsonb not null,
  approved          boolean not null,
  created_at        timestamptz not null default now()
);

create table profile_chunks (
  id        bigserial primary key,
  doc       text not null,
  version   text not null,
  section   text,
  content   text not null,
  embedding vector(1536)
);

create index profile_chunks_embedding_idx
  on profile_chunks using hnsw (embedding vector_cosine_ops);

create table job_embeddings (
  job_id    uuid primary key references jobs(id) on delete cascade,
  embedding vector(1536),
  model     text not null
);

create index job_embeddings_embedding_idx
  on job_embeddings using hnsw (embedding vector_cosine_ops);
