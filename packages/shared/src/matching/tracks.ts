import { normalizeSkillForAnalysis } from './taxonomy.js';

export const JOB_TRACK_VALUES = [
  'fullstack_ts',
  'ai_engineer',
  'backend_node_lead',
  'out_of_scope',
] as const;

export type JobTrack = (typeof JOB_TRACK_VALUES)[number];

export type TrackFilter = 'target' | JobTrack | 'all';

export interface JobTrackClassification {
  primaryTrack: JobTrack;
  tracks: readonly JobTrack[];
  inTargetScope: boolean;
  reason: string;
}

export interface JobTrackInput {
  title: string;
  seniority: string | null;
  requirements: ReadonlyArray<{ canonical: string; kind: 'must' | 'nice'; category?: string }>;
}

export const TRACK_LABELS: Record<TrackFilter, { label: string; description: string }> = {
  target: {
    label: 'Todas as Trilhas-Alvo',
    description: 'Full Stack TS/Node + AI Engineer + Tech Lead (exclui stacks fora de escopo)',
  },
  fullstack_ts: {
    label: 'Full Stack TS / Node / React',
    description: 'Vagas Full Stack com ecossistema JavaScript/TypeScript, Node, React ou Angular',
  },
  ai_engineer: {
    label: 'AI Engineer & LLMs',
    description: 'Vagas focadas em IA aplicada, LLMs, RAG, agentes ou Machine Learning',
  },
  backend_node_lead: {
    label: 'Backend Node / Tech Lead',
    description: 'Vagas de liderança técnica ou backend sênior compatível com Node/TS/Cloud',
  },
  out_of_scope: {
    label: 'Fora de Escopo',
    description: 'Stacks distintas (C#, Java, PHP, SAP, Mobile nativo, Game Dev) ou estágio',
  },
  all: {
    label: 'Todas as Vagas (com ruído)',
    description: 'Base completa sem filtro de trilha',
  },
};

function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const OUT_OF_SCOPE_TITLE_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(?:estagio|estagiari[oa]|intern|internship)\b/, reason: 'Vaga de estágio (fora da senioridade alvo)' },
  { pattern: /\b(?:sap\b|totvs|protheus|abap)\b/, reason: 'Ecossistema ERP proprietário (SAP/TOTVS)' },
  { pattern: /\b(?:php|laravel|wordpress)\b/, reason: 'Stack primária PHP' },
  { pattern: /\b(?:java\b|spring)\b/, reason: 'Stack primária Java' },
  { pattern: /\b(?:c#|csharp|asp\.?net|\.net|dotnet)\b/, reason: 'Stack primária C# / .NET' },
  { pattern: /\b(?:swift|swiftui|ios\b|android\b|flutter|mobile)\b/, reason: 'Foco exclusivo em Mobile nativo/Flutter' },
  { pattern: /\b(?:game developer|unity|unreal)\b/, reason: 'Desenvolvimento de games' },
  { pattern: /\b(?:golang|go developer)\b/, reason: 'Stack primária Go' },
  {
    pattern: /\b(?:patient care|account manager|partnerships|bd lead|operations coach|question reviewers)\b/,
    reason: 'Vaga não técnica / fora de engenharia de software',
  },
];

const AI_TITLE_PATTERN = /\b(?:ai engineer|machine learning|engenheir[oa] de ia|inteligencia artificial|llm|ml engineer|ai tooling)\b/;
const LEAD_TITLE_PATTERN = /\b(?:tech lead|staff|principal|engineering manager)\b/;
const FULLSTACK_TITLE_PATTERN = /\b(?:full[\s-]?stack|react|node\.?js|typescript|angular|next\.?js|frontend|front[\s-]?end)\b/;

export function classifyJobTrack(input: JobTrackInput): JobTrackClassification {
  const title = normalizeTitle(input.title);

  if (input.seniority === 'intern' || input.seniority === 'junior') {
    return {
      primaryTrack: 'out_of_scope',
      tracks: ['out_of_scope'],
      inTargetScope: false,
      reason: `Senioridade ${input.seniority} fora do foco sênior/pleno`,
    };
  }

  for (const rule of OUT_OF_SCOPE_TITLE_PATTERNS) {
    if (rule.pattern.test(title)) {
      return {
        primaryTrack: 'out_of_scope',
        tracks: ['out_of_scope'],
        inTargetScope: false,
        reason: rule.reason,
      };
    }
  }

  const mustSkills = new Set<string>();
  const allSkills = new Set<string>();
  for (const req of input.requirements) {
    const normalized = normalizeSkillForAnalysis(req.canonical, req.category);
    for (const item of normalized) {
      allSkills.add(item.canonical);
      if (req.kind === 'must') {
        mustSkills.add(item.canonical);
      }
    }
  }

  const hasNonTargetPrimaryMust =
    (mustSkills.has('c#') || mustSkills.has('.net')) &&
    !mustSkills.has('node.js') &&
    !mustSkills.has('typescript');
  if (hasNonTargetPrimaryMust) {
    return {
      primaryTrack: 'out_of_scope',
      tracks: ['out_of_scope'],
      inTargetScope: false,
      reason: 'Requisitos obrigatórios centrados em C# / .NET',
    };
  }

  if (
    (mustSkills.has('java') || mustSkills.has('php') || mustSkills.has('swift') || mustSkills.has('flutter')) &&
    !mustSkills.has('node.js') &&
    !mustSkills.has('typescript') &&
    !mustSkills.has('react')
  ) {
    return {
      primaryTrack: 'out_of_scope',
      tracks: ['out_of_scope'],
      inTargetScope: false,
      reason: 'Stack obrigatória fora do ecossistema JS/TS e IA',
    };
  }

  const tracks: JobTrack[] = [];

  const hasAiSignal =
    AI_TITLE_PATTERN.test(title) ||
    allSkills.has('llm') ||
    allSkills.has('rag') ||
    allSkills.has('pgvector') ||
    allSkills.has('langchain') ||
    allSkills.has('langgraph') ||
    allSkills.has('agentes de ia') ||
    allSkills.has('machine learning');

  const hasNodeTsSignal =
    allSkills.has('node.js') ||
    allSkills.has('typescript') ||
    allSkills.has('javascript') ||
    allSkills.has('react') ||
    allSkills.has('next.js') ||
    allSkills.has('angular') ||
    allSkills.has('nestjs');

  const isLeadRole = LEAD_TITLE_PATTERN.test(title) || input.seniority === 'lead';

  if (AI_TITLE_PATTERN.test(title)) {
    tracks.push('ai_engineer');
  }

  if (isLeadRole && (hasNodeTsSignal || hasAiSignal)) {
    tracks.push('backend_node_lead');
  }

  if (FULLSTACK_TITLE_PATTERN.test(title) || hasNodeTsSignal) {
    if (!tracks.includes('fullstack_ts') && !AI_TITLE_PATTERN.test(title) && !isLeadRole) {
      tracks.push('fullstack_ts');
    } else if (FULLSTACK_TITLE_PATTERN.test(title) && !tracks.includes('fullstack_ts')) {
      tracks.push('fullstack_ts');
    }
  }

  if (hasAiSignal && !tracks.includes('ai_engineer')) {
    tracks.push('ai_engineer');
  }

  if (tracks.length === 0) {
    return {
      primaryTrack: 'out_of_scope',
      tracks: ['out_of_scope'],
      inTargetScope: false,
      reason: 'Sem sinais aderentes às trilhas Full Stack TS, Node Lead ou AI Engineer',
    };
  }

  const primaryTrack = tracks[0]!;
  return {
    primaryTrack,
    tracks,
    inTargetScope: true,
    reason: `Classificada em ${tracks.join(' + ')}`,
  };
}

export function jobMatchesTrackFilter(
  classification: JobTrackClassification,
  filter: TrackFilter,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'target') return classification.inTargetScope;
  if (filter === 'out_of_scope') return !classification.inTargetScope;
  return classification.tracks.includes(filter);
}
