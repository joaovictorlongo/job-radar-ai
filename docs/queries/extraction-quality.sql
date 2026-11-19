\pset pager off
select
  count(*) as vagas,
  count(*) filter (where salary_published) as com_salario,
  count(*) filter (where lang = 'pt') as pt,
  count(*) filter (where lang = 'en') as en,
  round(avg(years_required), 1) as media_anos,
  count(*) filter (where years_required is null) as sem_anos,
  count(*) filter (where work_model = 'unknown') as modelo_desconhecido
from jobs
where extractor_version = 'extract-v2';

select
  count(*) as requisitos,
  count(distinct jr.job_id) as vagas_com_requisito,
  count(*) filter (where jr.min_years is not null) as com_anos,
  round(avg(jr.confidence), 2) as confianca_media
from job_requirements jr
join jobs j on j.id = jr.job_id
where j.extractor_version = 'extract-v2';

select
  percentile_cont(0.5) within group (order by latency_ms) as p50_ms,
  percentile_cont(0.95) within group (order by latency_ms) as p95_ms,
  min(latency_ms) as min_ms,
  max(latency_ms) as max_ms,
  sum(tokens_in) as tokens_in,
  sum(tokens_out) as tokens_out,
  sum(cost_usd) as custo_usd
from extraction_runs
where prompt_version = 'extract-v2' and status = 'ok';

select j.title, count(*) as requisitos
from job_requirements jr
join jobs j on j.id = jr.job_id
where j.extractor_version = 'extract-v2'
group by j.title
order by requisitos desc
limit 5;

select
  count(*) filter (where r.category = 'other') as fora_do_catalogo,
  count(*) as total
from job_requirements jr
join requirements r on r.id = jr.requirement_id
join jobs j on j.id = jr.job_id
where j.extractor_version = 'extract-v2';

select r.canonical, count(*) as ocorrencias
from job_requirements jr
join requirements r on r.id = jr.requirement_id
join jobs j on j.id = jr.job_id
where j.extractor_version = 'extract-v2' and r.category = 'other'
group by r.canonical
order by ocorrencias desc, r.canonical
limit 15;
