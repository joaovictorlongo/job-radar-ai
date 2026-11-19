import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { Pool } from 'pg';
import { chunkMarkdown, type ProfileChunk } from '@job-radar/shared';
import { createEmbeddingAdapter, type EmbeddingAdapter } from '../embeddings/adapter.js';

export interface SyncProfileOptions {
  profileDir: string;
  version?: string;
  embeddingAdapter?: EmbeddingAdapter;
}

export async function syncProfile(pool: Pool, options: SyncProfileOptions): Promise<number> {
  const { profileDir, version = 'v1' } = options;
  const adapter = options.embeddingAdapter ?? createEmbeddingAdapter();

  const files = readdirSync(profileDir).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    throw new Error(`Nenhum arquivo .md encontrado no diretório: ${profileDir}`);
  }

  const allChunks: ProfileChunk[] = [];
  for (const file of files) {
    const filePath = join(profileDir, file);
    const content = readFileSync(filePath, 'utf8');
    const chunks = chunkMarkdown(basename(file), content, version);
    allChunks.push(...chunks);
  }

  if (allChunks.length === 0) {
    return 0;
  }

  // Gera embeddings em batch
  const texts = allChunks.map((c) => `${c.section}: ${c.content}`);
  const embeddings = await adapter.embed(texts);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Remove versão anterior para sincronização idempotente
    await client.query(`delete from profile_chunks where version = $1`, [version]);

    for (let i = 0; i < allChunks.length; i++) {
      const chunk = allChunks[i]!;
      const embedding = embeddings[i]!;
      const vectorStr = `[${embedding.join(',')}]`;

      await client.query(
        `insert into profile_chunks (doc, version, section, content, embedding)
         values ($1, $2, $3, $4, $5::vector)`,
        [chunk.doc, chunk.version, chunk.section, chunk.content, vectorStr],
      );
    }

    await client.query('COMMIT');
    return allChunks.length;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
