import type { SkillProficiency } from '../profile/skills-schema.js';

export interface CompetitorArchetype {
  id: 'fullstack_ts_market' | 'ai_engineer_python' | 'senior_backend_cloud';
  name: string;
  subtitle: string;
  summary: string;
  skills: Readonly<Record<string, SkillProficiency>>;
}

/**
 * Arquétipos de referência calibrados para benchmark competitivo dinâmico.
 * Rodam no mesmo motor de scoring das mesmas vagas da trilha selecionada.
 */
export const COMPETITOR_ARCHETYPES: readonly CompetitorArchetype[] = [
  {
    id: 'fullstack_ts_market',
    name: 'Candidato Médio Full Stack TS',
    subtitle: '3–5 anos • React/Next.js + Node/Express + MongoDB/Prisma',
    summary:
      'Perfil mais comum nas vagas Full Stack JS/TS: forte em React/Next.js, testes E2E e CRUDs Node, mas raso em NestJS/SQL avançado, resiliência e AI Engineering com evals.',
    skills: {
      typescript: 'production_senior',
      javascript: 'production_senior',
      'node.js': 'production_senior',
      react: 'production_senior',
      'next.js': 'production_senior',
      tailwind: 'production_senior',
      express: 'production_senior',
      mongodb: 'production_senior',
      postgresql: 'working_knowledge',
      mysql: 'working_knowledge',
      sql: 'working_knowledge',
      docker: 'working_knowledge',
      aws: 'working_knowledge',
      git: 'production_senior',
      'ci/cd': 'working_knowledge',
      playwright: 'production_senior',
      cypress: 'production_senior',
      redis: 'working_knowledge',
      nestjs: 'working_knowledge',
      graphql: 'working_knowledge',
      'openai api': 'working_knowledge',
      llm: 'studying',
      communication: 'production_senior',
      english: 'working_knowledge',
      portuguese: 'production_senior',
    },
  },
  {
    id: 'ai_engineer_python',
    name: 'Candidato AI Engineer (Python)',
    subtitle: '2–5 anos • Python/FastAPI + LangChain/LangGraph + PyTorch',
    summary:
      'Concorrente direto em vagas de IA: domina Python, FastAPI, LangChain/LangGraph e ecossistema ML, mas costuma ter menos base de engenharia de produto SaaS, TypeScript strict e banco relacional transacional.',
    skills: {
      python: 'production_senior',
      fastapi: 'production_senior',
      flask: 'production_senior',
      langchain: 'production_senior',
      langgraph: 'production_senior',
      'agentes de ia': 'production_senior',
      llm: 'production_senior',
      rag: 'production_senior',
      'openai api': 'production_senior',
      embeddings: 'production_senior',
      'prompt engineering': 'production_senior',
      llmops: 'working_knowledge',
      evals: 'working_knowledge',
      'machine learning': 'production_senior',
      pytorch: 'production_senior',
      tensorflow: 'working_knowledge',
      nlp: 'production_senior',
      estatistica: 'production_senior',
      pgvector: 'working_knowledge',
      sql: 'working_knowledge',
      postgresql: 'working_knowledge',
      docker: 'working_knowledge',
      aws: 'working_knowledge',
      gcp: 'working_knowledge',
      git: 'production_senior',
      observabilidade: 'working_knowledge',
      communication: 'working_knowledge',
      english: 'production_senior',
      portuguese: 'production_senior',
    },
  },
  {
    id: 'senior_backend_cloud',
    name: 'Candidato Sênior Backend & Cloud',
    subtitle: '6+ anos • Node/Cloud + Kafka/RabbitMQ + Kubernetes + Observabilidade',
    summary:
      'Concorrente em vagas Sênior e Tech Lead: domina mensageria distribuída, Kubernetes, observabilidade e serverless AWS, mas geralmente sem profundidade em Frontend moderno nem Engenharia de IA.',
    skills: {
      typescript: 'production_senior',
      javascript: 'production_senior',
      'node.js': 'production_senior',
      nestjs: 'working_knowledge',
      postgresql: 'production_senior',
      mysql: 'production_senior',
      sql: 'production_senior',
      mongodb: 'working_knowledge',
      redis: 'production_senior',
      kafka: 'production_senior',
      rabbitmq: 'production_senior',
      docker: 'production_senior',
      kubernetes: 'production_senior',
      terraform: 'working_knowledge',
      aws: 'production_senior',
      'aws serverless': 'production_senior',
      observabilidade: 'production_senior',
      'arquitetura distribuida': 'production_senior',
      'rbac / multi-tenant': 'production_senior',
      'oauth / auth': 'production_senior',
      'ci/cd': 'production_senior',
      git: 'production_senior',
      linux: 'production_senior',
      leadership: 'production_senior',
      communication: 'production_senior',
      english: 'production_senior',
      portuguese: 'production_senior',
    },
  },
];
