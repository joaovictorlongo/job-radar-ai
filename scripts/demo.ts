import { execSync } from 'node:child_process';

function run(cmd: string) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

console.log('======================================================');
console.log('       JOB RADAR AI — AMBIENTE DE DEMO               ');
console.log('======================================================');
console.log('Inicializando banco de dados, taxonomias e dados pré-extraídos...\n');

// 1. Migrations
run('tsx scripts/db-migrate.ts');

// 2. Taxonomia de Requisitos
run('pnpm --filter @job-radar/worker seed:requirements');

// 3. Dataset Ouro e Labels
run('pnpm --filter @job-radar/worker seed:gold');

// 4. Chunks do Perfil do João e Embeddings no pgvector
run('pnpm --filter @job-radar/worker profile:sync');

// 5. Relatório de Matching e Gaps
run('pnpm --filter @job-radar/worker match:report');

console.log('\n======================================================');
console.log('  DEMO PRONTA! Dados relacionais, vetoriais e avaliações');
console.log('  carregados com sucesso no PostgreSQL + pgvector.');
console.log('======================================================');
console.log('Para iniciar o Dashboard Web em Next.js:');
console.log('  pnpm web:dev');
console.log('Acesse: http://localhost:3000\n');
