export type RequirementCategory =
  | 'language'
  | 'framework'
  | 'database'
  | 'cloud'
  | 'devops'
  | 'ai'
  | 'soft'
  | 'other';

export interface RequirementDefinition {
  canonical: string;
  category: RequirementCategory;
  aliases: readonly string[];
}

export const REQUIREMENT_CATALOG: readonly RequirementDefinition[] = [
  { canonical: 'typescript', category: 'language', aliases: ['ts'] },
  { canonical: 'javascript', category: 'language', aliases: ['js', 'ecmascript'] },
  { canonical: 'node.js', category: 'language', aliases: ['node', 'nodejs', 'node js'] },
  { canonical: 'python', category: 'language', aliases: ['py'] },
  { canonical: 'java', category: 'language', aliases: ['java 8', 'java 11', 'java 17', 'java 21'] },
  { canonical: 'go', category: 'language', aliases: ['golang'] },
  { canonical: 'c#', category: 'language', aliases: ['csharp', 'c sharp', 'dotnet c#'] },
  { canonical: 'php', category: 'language', aliases: [] },
  { canonical: 'ruby', category: 'language', aliases: [] },
  { canonical: 'rust', category: 'language', aliases: [] },
  { canonical: 'kotlin', category: 'language', aliases: [] },
  { canonical: 'swift', category: 'language', aliases: [] },
  { canonical: 'sql', category: 'language', aliases: [] },

  { canonical: 'nestjs', category: 'framework', aliases: ['nest', 'nest.js'] },
  { canonical: 'express', category: 'framework', aliases: ['express.js', 'expressjs'] },
  { canonical: 'fastify', category: 'framework', aliases: [] },
  { canonical: 'angular', category: 'framework', aliases: ['angularjs', 'angular 2+'] },
  { canonical: 'react', category: 'framework', aliases: ['react.js', 'reactjs'] },
  { canonical: 'next.js', category: 'framework', aliases: ['next', 'nextjs', 'next js'] },
  { canonical: 'vue', category: 'framework', aliases: ['vue.js', 'vuejs'] },
  { canonical: 'graphql', category: 'framework', aliases: ['graph ql'] },
  { canonical: 'spring', category: 'framework', aliases: ['spring boot'] },
  { canonical: 'django', category: 'framework', aliases: [] },
  { canonical: 'fastapi', category: 'framework', aliases: ['fast api'] },
  { canonical: 'flask', category: 'framework', aliases: [] },
  { canonical: 'laravel', category: 'framework', aliases: [] },
  { canonical: '.net', category: 'framework', aliases: ['dotnet', 'asp.net', 'net core'] },
  { canonical: 'tailwind', category: 'framework', aliases: ['tailwindcss', 'tailwind css'] },

  { canonical: 'postgresql', category: 'database', aliases: ['postgres', 'postgre sql'] },
  { canonical: 'mysql', category: 'database', aliases: ['maria db', 'mariadb'] },
  { canonical: 'sql server', category: 'database', aliases: ['mssql', 'sqlserver'] },
  { canonical: 'mongodb', category: 'database', aliases: ['mongo'] },
  { canonical: 'redis', category: 'database', aliases: [] },
  { canonical: 'elasticsearch', category: 'database', aliases: ['elastic search', 'opensearch'] },
  { canonical: 'firebird', category: 'database', aliases: [] },
  { canonical: 'oracle', category: 'database', aliases: ['oracle db'] },

  { canonical: 'aws', category: 'cloud', aliases: ['amazon web services'] },
  { canonical: 'azure', category: 'cloud', aliases: ['microsoft azure'] },
  { canonical: 'gcp', category: 'cloud', aliases: ['google cloud', 'google cloud platform'] },

  { canonical: 'docker', category: 'devops', aliases: ['containers'] },
  { canonical: 'kubernetes', category: 'devops', aliases: ['k8s'] },
  { canonical: 'terraform', category: 'devops', aliases: [] },
  { canonical: 'github actions', category: 'devops', aliases: ['gh actions'] },
  { canonical: 'gitlab ci', category: 'devops', aliases: ['gitlab ci/cd'] },
  { canonical: 'jenkins', category: 'devops', aliases: [] },
  { canonical: 'ci/cd', category: 'devops', aliases: ['cicd', 'ci cd'] },
  { canonical: 'linux', category: 'devops', aliases: [] },
  { canonical: 'git', category: 'devops', aliases: [] },

  { canonical: 'llm', category: 'ai', aliases: ['large language model', 'llms', 'gpt', 'claude'] },
  { canonical: 'rag', category: 'ai', aliases: ['retrieval augmented generation', 'retrieval-augmented generation'] },
  { canonical: 'pgvector', category: 'ai', aliases: ['pg vector'] },
  { canonical: 'langchain', category: 'ai', aliases: ['lang chain'] },
  { canonical: 'langgraph', category: 'ai', aliases: ['lang graph'] },
  { canonical: 'openai api', category: 'ai', aliases: ['openai', 'chatgpt api'] },
  { canonical: 'embeddings', category: 'ai', aliases: ['embedding', 'vetores', 'vector embeddings'] },
  { canonical: 'prompt engineering', category: 'ai', aliases: ['engenharia de prompt'] },
  { canonical: 'fine-tuning', category: 'ai', aliases: ['fine tuning', 'finetuning'] },
  { canonical: 'machine learning', category: 'ai', aliases: ['ml'] },
  { canonical: 'pytorch', category: 'ai', aliases: ['torch'] },
  { canonical: 'tensorflow', category: 'ai', aliases: [] },
  { canonical: 'nlp', category: 'ai', aliases: ['natural language processing'] },

  { canonical: 'communication', category: 'soft', aliases: ['comunicação', 'communicative'] },
  { canonical: 'english', category: 'soft', aliases: ['inglês', 'english fluency'] },
  { canonical: 'leadership', category: 'soft', aliases: ['liderança', 'lead'] },
  { canonical: 'teamwork', category: 'soft', aliases: ['trabalho em equipe'] },
  { canonical: 'problem solving', category: 'soft', aliases: ['resolução de problemas'] },
];

interface CatalogEntry {
  definition: RequirementDefinition;
  keys: readonly string[];
}

function buildKey(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9+#./ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CATALOG_INDEX: readonly CatalogEntry[] = REQUIREMENT_CATALOG.map((definition) => ({
  definition,
  keys: [definition.canonical, ...definition.aliases].map(buildKey),
}));

const LOOKUP = new Map<string, RequirementDefinition>();
for (const entry of CATALOG_INDEX) {
  for (const key of entry.keys) {
    if (!LOOKUP.has(key)) {
      LOOKUP.set(key, entry.definition);
    }
  }
}

export interface CanonicalRequirement {
  canonical: string;
  category: RequirementCategory;
  known: boolean;
}

export function canonicalizeRequirement(raw: string): CanonicalRequirement | null {
  const key = buildKey(raw);
  if (key.length === 0) {
    return null;
  }
  const exact = LOOKUP.get(key);
  if (exact) {
    return { canonical: exact.canonical, category: exact.category, known: true };
  }
  for (const [candidate, definition] of LOOKUP) {
    if (candidate.length >= 3 && key.startsWith(`${candidate} `)) {
      return { canonical: definition.canonical, category: definition.category, known: true };
    }
  }
  return { canonical: key, category: 'other', known: false };
}

export function requirementCatalogKeys(): readonly string[] {
  return [...LOOKUP.keys()];
}
