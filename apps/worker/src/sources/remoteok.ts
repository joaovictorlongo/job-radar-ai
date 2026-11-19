import { normalizeText } from '@job-radar/shared';
import { htmlToText } from '../html.js';
import type { HttpClient } from '../http/client.js';
import type { JobSource, RawJob } from './types.js';

const API_URL = 'https://remoteok.com/api';
const JOB_URL = 'https://remoteok.com/remote-jobs';

interface RemoteOkItem {
  id?: string | number;
  slug?: string;
  position?: string;
  company?: string;
  location?: string;
  date?: string;
  description?: string;
  tags?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseRemoteOkPayload(payload: unknown): RemoteOkItem[] {
  if (!Array.isArray(payload)) {
    throw new Error('payload do Remote OK não é uma lista');
  }
  return payload.filter((item): item is RemoteOkItem => {
    if (!isRecord(item)) {
      return false;
    }
    const hasId = typeof item.id === 'string' || typeof item.id === 'number';
    return hasId && typeof item.position === 'string' && typeof item.slug === 'string';
  });
}

export function parseRemoteOkJob(item: RemoteOkItem): RawJob {
  const id = String(item.id);
  const descriptionHtml = item.description ?? '';
  const description = normalizeText(htmlToText(descriptionHtml));
  if (description.length === 0) {
    throw new Error(`vaga do Remote OK sem descrição: ${id}`);
  }
  return {
    source: 'remoteok',
    sourceJobId: id,
    url: `${JOB_URL}/${item.slug ?? id}`,
    title: normalizeText(item.position ?? ''),
    company: item.company === undefined ? null : normalizeText(item.company),
    locationRaw: item.location === undefined ? null : normalizeText(item.location),
    country: null,
    workModel: 'remote',
    seniority: null,
    employmentType: null,
    description,
    lang: 'en',
    postedAt: typeof item.date === 'string' ? item.date.slice(0, 10) : null,
  };
}

export class RemoteOkSource implements JobSource {
  readonly name = 'remoteok';

  constructor(private readonly http: HttpClient) {}

  async *fetchJobs(limit: number): AsyncGenerator<RawJob> {
    const response = await this.http.get(API_URL);
    const items = parseRemoteOkPayload(JSON.parse(response.body));
    let delivered = 0;
    for (const item of items) {
      if (delivered >= limit) {
        return;
      }
      try {
        yield parseRemoteOkJob(item);
        delivered += 1;
      } catch {
        continue;
      }
    }
  }
}
