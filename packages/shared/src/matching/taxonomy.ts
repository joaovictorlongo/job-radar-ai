import { canonicalizeRequirement, isNonSkillLabel, type RequirementCategory } from '../domain/requirements.js';

export type SkillCluster =
  | 'Linguagens & Runtimes'
  | 'Frontend & Web'
  | 'Backend & Arquitetura'
  | 'Bancos de Dados'
  | 'Cloud & Infraestrutura'
  | 'Mensageria & Eventos'
  | 'Observabilidade & Monitoramento'
  | 'Qualidade & Testes E2E'
  | 'IA, LLMs & Agentes'
  | 'Dados & ML'
  | 'Soft Skills & Idiomas'
  | 'Outras Stacks';

export interface NormalizedAnalysisSkill {
  canonical: string;
  category: RequirementCategory;
  cluster: SkillCluster;
}

interface AliasRule {
  pattern: RegExp;
  outputs: readonly NormalizedAnalysisSkill[];
}

function normalizeKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+#./ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NOISE_PATTERNS: readonly RegExp[] = [
  /^vontade de aprender/,
  /^high growth environments?$/,
  /^distributed teams?$/,
  /^end to end problem ownership$/,
  /^problem ownership$/,
  /^business impact/,
  /^cross functional collaboration$/,
  /^metodologias? ageis/,
  /^agile methodologies?$/,
  /^engenharia de software$/,
  /^arquitetura de software$/,
  /^backend architecture$/,
  /^server side logic$/,
  /^code quality$/,
  /^code reviews?$/,
  /^debugging$/,
  /^experiencia em aplicativos complexos$/,
  /^conhecimento em pipelines ou workflows proprios$/,
  /^restful api development$/,
  /^api development$/,
  /^performance optimization$/,
  /^clean code/,
  /^asynchronous programming$/,
  /^finance module$/,
];

const SPECIAL_RULES: readonly AliasRule[] = [
  {
    pattern: /^(?:kafka\s*\/\s*rabbitmq|rabbitmq\s*\/\s*kafka)$/,
    outputs: [
      { canonical: 'kafka', category: 'devops', cluster: 'Mensageria & Eventos' },
      { canonical: 'rabbitmq', category: 'devops', cluster: 'Mensageria & Eventos' },
    ],
  },
  {
    pattern: /^(?:apache )?kafka$/,
    outputs: [{ canonical: 'kafka', category: 'devops', cluster: 'Mensageria & Eventos' }],
  },
  {
    pattern: /^rabbitmq$/,
    outputs: [{ canonical: 'rabbitmq', category: 'devops', cluster: 'Mensageria & Eventos' }],
  },
  {
    pattern: /^mensageria distribuida/,
    outputs: [{ canonical: 'kafka', category: 'devops', cluster: 'Mensageria & Eventos' }],
  },
  {
    pattern: /^(?:observabilidade|observability|monitoramento\/observabilidade|monitoramento de modelos|logs estruturados|tracing|metricas|opentelemetry|prometheus|grafana)$/,
    outputs: [
      {
        canonical: 'observabilidade',
        category: 'devops',
        cluster: 'Observabilidade & Monitoramento',
      },
    ],
  },
  {
    pattern: /^(?:playwright|testes automatizados com playwright)$/,
    outputs: [{ canonical: 'playwright', category: 'devops', cluster: 'Qualidade & Testes E2E' }],
  },
  {
    pattern: /^(?:cypress)$/,
    outputs: [{ canonical: 'cypress', category: 'devops', cluster: 'Qualidade & Testes E2E' }],
  },
  {
    pattern: /^(?:orquestracao multiplos agentes de ia|multi.?agent|agentes de ia|ai agents?)$/,
    outputs: [{ canonical: 'agentes de ia', category: 'ai', cluster: 'IA, LLMs & Agentes' }],
  },
  {
    pattern: /^(?:llmops|versionamento de modelos|mlops)$/,
    outputs: [{ canonical: 'llmops', category: 'ai', cluster: 'IA, LLMs & Agentes' }],
  },
  {
    pattern: /^(?:prompt evaluation|evals|llm evals|avaliacao de llm)$/,
    outputs: [{ canonical: 'evals', category: 'ai', cluster: 'IA, LLMs & Agentes' }],
  },
  {
    pattern: /^(?:llama\/mistral\/mixtral|open.?source llms?)$/,
    outputs: [{ canonical: 'llm', category: 'ai', cluster: 'IA, LLMs & Agentes' }],
  },
  {
    pattern: /^api gateway and serverless architecture$|^serverless$|^aws lambda$/,
    outputs: [{ canonical: 'aws serverless', category: 'cloud', cluster: 'Cloud & Infraestrutura' }],
  },
  {
    pattern: /^multi tenant access control and rbac$|^rbac$|^multi.?tenant$/,
    outputs: [
      { canonical: 'rbac / multi-tenant', category: 'other', cluster: 'Backend & Arquitetura' },
    ],
  },
  {
    pattern: /^authentication authorization$|^oauth|^jwt$/,
    outputs: [{ canonical: 'oauth / auth', category: 'other', cluster: 'Backend & Arquitetura' }],
  },
  {
    pattern: /^(?:padroes de resiliencia|arquitetura de alto volume|scalability|high volume processing systems|experiencia em escala bilionaria)$/,
    outputs: [
      {
        canonical: 'arquitetura distribuida',
        category: 'other',
        cluster: 'Backend & Arquitetura',
      },
    ],
  },
  {
    pattern: /^github$/,
    outputs: [{ canonical: 'git', category: 'devops', cluster: 'Cloud & Infraestrutura' }],
  },
  {
    pattern: /^(?:documentacao|documentation)$/,
    outputs: [{ canonical: 'documentation', category: 'soft', cluster: 'Soft Skills & Idiomas' }],
  },
  {
    pattern: /^c# asp\.?net core$|^entityframework core c# asp\.?\s*net core$/,
    outputs: [
      { canonical: 'c#', category: 'language', cluster: 'Outras Stacks' },
      { canonical: '.net', category: 'framework', cluster: 'Outras Stacks' },
    ],
  },
  {
    pattern: /^(?:airflow|apache airflow)$/,
    outputs: [{ canonical: 'airflow', category: 'other', cluster: 'Dados & ML' }],
  },
  {
    pattern: /^dbt$/,
    outputs: [{ canonical: 'dbt', category: 'other', cluster: 'Dados & ML' }],
  },
  {
    pattern: /^(?:spark|apache spark|pyspark)$/,
    outputs: [{ canonical: 'spark', category: 'other', cluster: 'Dados & ML' }],
  },
  {
    pattern: /^estatistica$|^statistics$/,
    outputs: [{ canonical: 'estatistica', category: 'ai', cluster: 'Dados & ML' }],
  },
  {
    pattern: /^flutter|ciclo de vida do flutter|experiencia em flutter|gerenciamento de estado riverpod|habilidade para lidar com permissoes nativas/,
    outputs: [{ canonical: 'flutter', category: 'framework', cluster: 'Outras Stacks' }],
  },
  {
    pattern: /^experience with sap business one$|^sap/,
    outputs: [{ canonical: 'sap', category: 'other', cluster: 'Outras Stacks' }],
  },
  {
    pattern: /^hibernate \/ gorm$/,
    outputs: [{ canonical: 'hibernate / gorm', category: 'framework', cluster: 'Outras Stacks' }],
  },
  {
    pattern: /^ionic$/,
    outputs: [{ canonical: 'ionic', category: 'framework', cluster: 'Outras Stacks' }],
  },
  {
    pattern: /^game engine$/,
    outputs: [{ canonical: 'game engine', category: 'other', cluster: 'Outras Stacks' }],
  },
];

const OUT_OF_STACK_CANONICALS = new Set([
  'c#',
  '.net',
  'java',
  'spring',
  'php',
  'laravel',
  'ruby',
  'swift',
  'kotlin',
  'flutter',
  'ionic',
  'sap',
  'game engine',
  'hibernate / gorm',
]);

const FRONTEND_CANONICALS = new Set(['react', 'next.js', 'angular', 'vue', 'tailwind', 'astro']);
const BACKEND_CANONICALS = new Set([
  'nestjs',
  'express',
  'fastify',
  'graphql',
  'django',
  'fastapi',
  'flask',
  'rbac / multi-tenant',
  'oauth / auth',
  'arquitetura distribuida',
]);
const DATA_ML_CANONICALS = new Set([
  'machine learning',
  'pytorch',
  'tensorflow',
  'nlp',
  'airflow',
  'dbt',
  'spark',
  'estatistica',
]);

export function inferSkillCluster(canonical: string, category: RequirementCategory): SkillCluster {
  if (category === 'soft') return 'Soft Skills & Idiomas';
  if (OUT_OF_STACK_CANONICALS.has(canonical)) return 'Outras Stacks';
  if (DATA_ML_CANONICALS.has(canonical)) return 'Dados & ML';
  if (category === 'ai') return 'IA, LLMs & Agentes';
  if (canonical === 'kafka' || canonical === 'rabbitmq') return 'Mensageria & Eventos';
  if (canonical === 'observabilidade') return 'Observabilidade & Monitoramento';
  if (canonical === 'playwright' || canonical === 'cypress') return 'Qualidade & Testes E2E';
  if (FRONTEND_CANONICALS.has(canonical)) return 'Frontend & Web';
  if (BACKEND_CANONICALS.has(canonical)) return 'Backend & Arquitetura';
  if (category === 'database') return 'Bancos de Dados';
  if (category === 'cloud' || category === 'devops') return 'Cloud & Infraestrutura';
  if (category === 'language') return 'Linguagens & Runtimes';
  return 'Backend & Arquitetura';
}

export function isAnalysisNoise(raw: string): boolean {
  const key = normalizeKey(raw);
  if (key.length === 0) return true;
  if (isNonSkillLabel(key)) return true;
  if (NOISE_PATTERNS.some((pattern) => pattern.test(key))) return true;
  // Frases muito longas não mapeadas (> 6 palavras) são descrições genéricas, não skills
  if (key.split(' ').length > 6) {
    return !SPECIAL_RULES.some((rule) => rule.pattern.test(key));
  }
  return false;
}

export function normalizeSkillForAnalysis(
  rawCanonical: string,
  rawCategory?: string,
): NormalizedAnalysisSkill[] {
  const key = normalizeKey(rawCanonical);
  if (key.length === 0) return [];

  for (const rule of SPECIAL_RULES) {
    if (rule.pattern.test(key)) {
      return [...rule.outputs];
    }
  }

  if (isAnalysisNoise(key)) {
    return [];
  }

  const canon = canonicalizeRequirement(key);
  if (!canon) return [];

  const category: RequirementCategory = canon.known
    ? canon.category
    : isValidCategory(rawCategory)
      ? rawCategory
      : 'other';

  return [
    {
      canonical: canon.canonical,
      category,
      cluster: inferSkillCluster(canon.canonical, category),
    },
  ];
}

function isValidCategory(value: string | undefined): value is RequirementCategory {
  return (
    value === 'language' ||
    value === 'framework' ||
    value === 'database' ||
    value === 'cloud' ||
    value === 'devops' ||
    value === 'ai' ||
    value === 'soft' ||
    value === 'other'
  );
}
