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

`lang` is the exception: the collector writes the board's language as a guess (Programathor is a Portuguese board that hosts English posts), and the extractor overwrites it after extraction with a deterministic stop-word detector over the description body (`detectLanguage`, returns `null` when inconclusive and then the model's answer is kept). The detector runs outside the LLM because the model was measured misclassifying an English post as Portuguese.

## D6 — Extraction cache is keyed by content and extractor version

`extraction_cache (description_hash, extractor_version)` stores the validated payload so reprocessing the same description under the same extractor does not call the LLM again. Changing the prompt adds a new `extractor_version`; old entries stay for comparison and are never overwritten.

## D7 — The extractor is provider-agnostic, and the first measured runs use a local model

The extractor implements one interface (`LlmExtractor`) and speaks the OpenAI chat-completions dialect with `baseURL` configurable, so the provider changes through `.env` only:

| Provider | `LLM_BASE_URL` | Auth |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `LLM_API_KEY` |
| Gemini (OpenAI-compatible endpoint) | `https://generativelanguage.googleapis.com/v1beta/openai` | `LLM_API_KEY` |
| Ollama / LM Studio / vLLM | `http://localhost:11434/v1` | none |

Only the `baseURL`, model and prices differ; prompt, schema, grounding and persistence are the same code path.

Why the first runs are local:

- no OpenAI key on this machine;
- the Gemini key created at AI Studio answers `402 RESOURCE_EXHAUSTED` ("prepayment credits are depleted") on every model, so the upload of job descriptions would not run;
- the GitHub Models endpoint rejects the `gh` token (missing `models:read` scope), returning plain text instead of JSON.

`qwen2.5:7b-instruct` runs locally through Ollama with `num_ctx 16384` and `temperature 0`, and honours strict JSON-Schema structured output. It is a development-grade model: it proves the pipeline end to end, and its output quality is measured and reported, not assumed. Swapping to a frontier model is an `.env` change plus a prompt version bump.

Cost is recorded per call as `tokens * price / 1e6` from `LLM_PRICE_INPUT_PER_MTOK` and `LLM_PRICE_OUTPUT_PER_MTOK`. Prices are only set when confirmed against the provider's current pricing page; otherwise both prices stay empty, `cost_usd` is written as `null` and the run summary reports `costKnown: false`. Local inference records `0` because there is no metered billing, and the model name makes the difference explicit.

## D8 — OpenCode CLI adapter, track segmentation and proficiency-weighted gap intelligence

1. **Second LLM adapter (`OpenCodeCliExtractor`):** Added behind the same `LlmExtractor` interface (`LLM_PROVIDER=opencode-cli`, model `opencode/deepseek-v4.1-flash-free`), invoking `opencode run --pure --format json` and parsing NDJSON events (`text`, `tokens`, `cost`, `reason`). This reduced extraction latency from ~84s p50 (local 7B Qwen on laptop) to ~12s p50 at US$ 0.00, enabling 90+ job batch extraction without changing any domain, Zod, grounding or persistence code.
2. **Third public source (`github`):** Added `GithubVagasSource` reading public JSON issues from `backend-br/vagas`, `frontendbr/vagas`, and `react-brasil/vagas` (filtering out PRs and pinned rule issues) to complement Programathor and Remote OK (now filtered to engineering/AI roles).
3. **Track classification & structured proficiency (`profile/skills.json`):** Mixing unrelated roles (SAP, TOTVS, PHP, C#/.NET, Swift, Flutter, Intern) into one market gap pool produces false strategic gaps (e.g., C# ranking #1 for a TypeScript/AI engineer). Jobs are deterministically classified into target tracks (`fullstack_ts`, `ai_engineer`, `backend_node_lead`) vs `out_of_scope` (transparently listed). Binary regex matching was replaced by a Zod-validated proficiency matrix (`production_senior = 1.0`, `working_knowledge = 0.55`, `studying = 0.25`, `none = 0.0`), exposing real depth gaps (e.g., React/Next.js and Python) separately from missing gaps and driving a counterfactual ROI study simulator + calibrated competitor archetype benchmark on the exact same jobs.
