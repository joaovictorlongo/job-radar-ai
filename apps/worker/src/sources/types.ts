export interface RawJob {
  source: string;
  sourceJobId: string;
  url: string;
  title: string;
  company: string | null;
  locationRaw: string | null;
  country: string | null;
  workModel: 'remote' | 'hybrid' | 'onsite' | 'unknown' | null;
  seniority: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'unknown' | null;
  employmentType: string | null;
  description: string;
  lang: 'pt' | 'en';
  postedAt: string | null;
}

export interface JobSource {
  readonly name: string;
  fetchJobs(limit: number): AsyncGenerator<RawJob>;
}
