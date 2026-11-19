import * as cheerio from 'cheerio';
import { normalizeText } from '@job-radar/shared';
import type { HttpClient } from '../http/client.js';
import type { JobSource, RawJob } from './types.js';

const BASE_URL = 'https://programathor.com.br';
const JOB_HREF = /^\/jobs\/(\d+)-/;

export interface ProgramathorListItem {
  url: string;
  sourceJobId: string;
  title: string;
  company: string | null;
  locationRaw: string | null;
}

export function parseProgramathorList(html: string): ProgramathorListItem[] {
  const $ = cheerio.load(html);
  const items: ProgramathorListItem[] = [];
  const seen = new Set<string>();

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') ?? '';
    const match = JOB_HREF.exec(href);
    if (!match) {
      return;
    }
    const sourceJobId = match[1];
    if (sourceJobId === undefined || seen.has(sourceJobId)) {
      return;
    }
    const container = $(element).closest('.cell-list');
    const title = normalizeText(container.find('h3').first().text());
    if (title.length === 0) {
      return;
    }
    const spans = container
      .find('.cell-list-content-icon span')
      .map((__, span) => normalizeText($(span).text()))
      .get()
      .filter((text) => text.length > 0);
    seen.add(sourceJobId);
    items.push({
      url: `${BASE_URL}${href}`,
      sourceJobId,
      title,
      company: spans[0] ?? null,
      locationRaw: spans[1] ?? null,
    });
  });

  return items;
}

function parseWorkModel(location: string | null): RawJob['workModel'] {
  if (location === null) {
    return 'unknown';
  }
  const text = location.toLowerCase();
  if (text.includes('remoto') || text.includes('home office')) {
    return 'remote';
  }
  if (text.includes('híbrido') || text.includes('hibrido')) {
    return 'hybrid';
  }
  if (text.includes('presencial')) {
    return 'onsite';
  }
  return 'unknown';
}

function parseSeniority(value: string): RawJob['seniority'] {
  const text = value.toLowerCase();
  if (text.includes('estágio') || text.includes('estagio') || text.includes('intern')) {
    return 'intern';
  }
  if (text.includes('júnior') || text.includes('junior') || text.includes('jr')) {
    return 'junior';
  }
  if (text.includes('pleno') || text.includes('pl')) {
    return 'mid';
  }
  if (text.includes('sênior') || text.includes('senior') || text.includes('sr')) {
    return 'senior';
  }
  if (text.includes('lead') || text.includes('especialista') || text.includes('staff')) {
    return 'lead';
  }
  return 'unknown';
}

export function parseProgramathorDetail(html: string, url: string): RawJob {
  const $ = cheerio.load(html);
  const sourceJobId = /\/jobs\/(\d+)/.exec(url)?.[1];
  if (sourceJobId === undefined) {
    throw new Error(`URL do Programathor sem id: ${url}`);
  }
  const title = normalizeText($('h1').first().text());
  if (title.length === 0) {
    throw new Error(`vaga sem título: ${url}`);
  }
  const details = $('.wrapper-details-job-show');
  const company = normalizeText($('.wrapper-content-job-show h2 a').first().text()) || null;
  const locationRaw = normalizeText(details.find('i.fa-map-marker-alt').closest('p').text()) || null;
  const employmentType =
    normalizeText(details.find('a[href*="contract_type="]').first().text()) || null;
  const seniorityRaw = normalizeText(details.find('a[href*="expertise="]').first().text());
  const blocks = $('.wrapper-content-job-show .line-height-2-4')
    .map((_, element) => normalizeText($(element).text()))
    .get()
    .filter((text) => text.length > 0);
  const description = blocks.join('\n\n');
  if (description.length === 0) {
    throw new Error(`vaga sem descrição: ${url}`);
  }
  const postedAt = $('time[datetime]').first().attr('datetime') ?? null;

  return {
    source: 'programathor',
    sourceJobId,
    url,
    title,
    company,
    locationRaw,
    country: 'BR',
    workModel: parseWorkModel(locationRaw),
    seniority: seniorityRaw.length > 0 ? parseSeniority(seniorityRaw) : 'unknown',
    employmentType,
    description,
    lang: 'pt',
    postedAt,
  };
}

export class ProgramathorSource implements JobSource {
  readonly name = 'programathor';

  constructor(private readonly http: HttpClient) {}

  async *fetchJobs(limit: number): AsyncGenerator<RawJob> {
    const seen = new Set<string>();
    let delivered = 0;
    let page = 1;

    while (delivered < limit) {
      const listUrl = `${BASE_URL}/jobs?page=${page}`;
      const response = await this.http.get(listUrl);
      const items = parseProgramathorList(response.body).filter((item) => !seen.has(item.sourceJobId));
      if (items.length === 0) {
        return;
      }
      for (const item of items) {
        if (delivered >= limit) {
          return;
        }
        seen.add(item.sourceJobId);
        const detail = await this.http.get(item.url);
        yield parseProgramathorDetail(detail.body, item.url);
        delivered += 1;
      }
      page += 1;
    }
  }
}
