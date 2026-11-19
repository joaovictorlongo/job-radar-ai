export interface ProfileChunk {
  doc: string;
  version: string;
  section: string;
  content: string;
}

export function chunkMarkdown(docName: string, markdown: string, version = 'v1'): ProfileChunk[] {
  const lines = markdown.split(/\r?\n/);
  const chunks: ProfileChunk[] = [];

  let currentSection = 'Geral';
  let buffer: string[] = [];

  function flushBuffer() {
    const text = buffer.join('\n').trim();
    if (text.length > 0) {
      chunks.push({
        doc: docName,
        version,
        section: currentSection,
        content: text,
      });
    }
    buffer = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Novo cabeçalho de seção (H1, H2, H3)
    if (/^#{1,3}\s+/.test(trimmed)) {
      flushBuffer();
      currentSection = trimmed.replace(/^#{1,3}\s+/, '').trim();
      continue;
    }

    // Agrupa parágrafos e tópicos
    if (trimmed.length === 0) {
      if (buffer.length >= 3) {
        flushBuffer();
      }
    } else {
      buffer.push(trimmed);
      // Evita chunks excessivamente longos (> 600 caracteres)
      if (buffer.join(' ').length > 500) {
        flushBuffer();
      }
    }
  }

  flushBuffer();
  return chunks;
}
