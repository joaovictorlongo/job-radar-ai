import { normalizeText } from '@job-radar/shared';
import type { HttpClient } from '../http/client.js';
import type { JobSource, RawJob } from './types.js';

const DEFAULT_REPOS = [
  'backend-br/vagas',
  'frontendbr/vagas',
  'react-brasil/vagas',
] as const;

interface GithubIssueItem {
  id?: number;
  number?: number;
  title?: string;
  body?: string | null;
  html_url?: string;
  created_at?: string;
  pull_request?: unknown;
  labels?: Array<{ name?: string }>;
}

const META_ISSUE_PATTERN =
  /^(?:aten[cç][aã]o|leia nossas regras|regras|docs:|chore:|aviso|template|guidelines)/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseGithubIssuesPayload(payload: unknown): GithubIssueItem[] {
  if (!Array.isArray(payload)) {
    throw new Error('payload de GitHub Issues não é uma lista');
  }
  return payload.filter((item): item is GithubIssueItem => {
    if (!isRecord(item)) return false;
    if (item.pull_request !== undefined) return false;
    const hasId = typeof item.id === 'number' && typeof item.number === 'number';
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const body = typeof item.body === 'string' ? item.body.trim() : '';
    if (!hasId || title.length === 0 || body.length < 80) return false;
    if (META_ISSUE_PATTERN.test(title)) return false;
    return typeof item.html_url === 'string';
  });
}

function inferWorkModelFromIssue(title: string, labels: readonly string[]): RawJob['workModel'] {
  const hay = `${title} ${labels.join(' ')}`.toLowerCase();
  if (/\b(?:remoto|remote|home ?office|anywhere)\b/.test(hay)) return 'remote';
  if (/\b(?:h[ií]brido|hybrid)\b/.test(hay)) return 'hybrid';
  if (/\b(?:presencial|on ?site)\b/.test(hay)) return 'onsite';
  return 'unknown';
}

function inferCompanyFromTitle(title: string): string | null {
  const match = /\b(?:na|no|at|@)\s+([^|[\]()\n]+)$/i.exec(title.trim());
  const company = match?.[1]?.trim();
  return company && company.length >= 2 && company.length <= 60 ? company : null;
}

function stripMarkdownNoise(markdown: string): string {
  return normalizeText(
    markdown
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/[*_`~]/g, ''),
  );
}

export function parseGithubIssueJob(repo: string, item: GithubIssueItem): RawJob {
  const title = normalizeText(item.title ?? '');
  const description = stripMarkdownNoise(item.body ?? '');
  if (description.length === 0) {
    throw new Error(`issue sem descrição: ${repo}#${item.number}`);
  }

  const labelNames = Array.isArray(item.labels)
    ? item.labels.map((l) => l.name ?? '').filter(Boolean)
    : [];
  const bracketMatch = /^\[([^\]]+)\]/.exec(title);

  return {
    source: 'github',
    sourceJobId: `${repo}#${item.number}`,
    url: item.html_url ?? `https://github.com/${repo}/issues/${item.number}`,
    title,
    company: inferCompanyFromTitle(title),
    locationRaw: bracketMatch?.[1]?.trim() ?? null,
    country: 'BR',
    workModel: inferWorkModelFromIssue(title, labelNames),
    seniority: null,
    employmentType: labelNames.find((l) => /^(?:clt|pj)$/i.test(l))?.toUpperCase() ?? null,
    description,
    lang: 'pt',
    postedAt: typeof item.created_at === 'string' ? item.created_at.slice(0, 10) : null,
  };
}

export class GithubVagasSource implements JobSource {
  readonly name = 'github';

  constructor(
    private readonly http: HttpClient,
    private readonly repos: readonly string[] = DEFAULT_REPOS,
  ) {}

  async *fetchJobs(limit: number): AsyncGenerator<RawJob> {
    let delivered = 0;
    const perRepo = Math.max(10, Math.ceil(limit / this.repos.length) + 5);

    for (const repo of this.repos) {
      if (delivered >= limit) return;
      const url = `https://api.github.com/repos/${repo}/issues?state=open&per_page=${Math.min(30, perRepo)}`;
      const response = await this.http.get(url);
      const issues = parseGithubIssuesPayload(JSON.parse(response.body));
      for (const issue of issues) {
        if (delivered >= limit) return;
        try {
          yield parseGithubIssueJob(repo, issue);
          delivered += 1;
        } catch {
          continue;
        }
      }
    }
  }
}
