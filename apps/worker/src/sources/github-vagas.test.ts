import { describe, expect, it } from 'vitest';
import { parseGithubIssueJob, parseGithubIssuesPayload } from './github-vagas.js';

describe('github-vagas source', () => {
  it('filtra PRs e issues de regras/meta e parseia vagas válidas', () => {
    const payload = [
      {
        id: 1,
        number: 10,
        title: 'ATENÇÃO: Leia nossas regras',
        body: 'Regras de publicação do repositório de vagas para empresas e recrutadores.'.repeat(3),
        html_url: 'https://github.com/frontendbr/vagas/issues/10',
      },
      {
        id: 2,
        number: 11,
        title: '[Remoto] Full-Stack Sênior na Igma | PJ',
        body: '## Requisitos\n- Node.js e TypeScript em produção\n- React ou Next.js\n- PostgreSQL e AWS em alta escala com observabilidade.',
        html_url: 'https://github.com/react-brasil/vagas/issues/11',
        created_at: '2026-11-18T12:00:00Z',
        labels: [{ name: 'Remoto' }, { name: 'PJ' }],
      },
      {
        id: 3,
        number: 12,
        title: 'PR de atualização',
        body: 'Descrição longa o suficiente para passar no filtro de tamanho se não fosse PR.'.repeat(2),
        html_url: 'https://github.com/react-brasil/vagas/pull/12',
        pull_request: {},
      },
    ];

    const issues = parseGithubIssuesPayload(payload);
    expect(issues).toHaveLength(1);

    const job = parseGithubIssueJob('react-brasil/vagas', issues[0]!);
    expect(job.source).toBe('github');
    expect(job.sourceJobId).toBe('react-brasil/vagas#11');
    expect(job.workModel).toBe('remote');
    expect(job.employmentType).toBe('PJ');
    expect(job.postedAt).toBe('2026-11-18');
    expect(job.description).toContain('Node.js e TypeScript');
  });
});
