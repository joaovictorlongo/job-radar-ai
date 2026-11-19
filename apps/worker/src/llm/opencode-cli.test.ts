import { describe, expect, it } from 'vitest';
import {
  extractJsonObjectText,
  OpenCodeCliExtractor,
  parseOpenCodeJsonEvents,
} from './opencode-cli.js';

describe('parseOpenCodeJsonEvents', () => {
  it('extrai texto, tokens, custo e finishReason de eventos NDJSON', () => {
    const stdout = [
      '{"type":"step_start","part":{"type":"step-start"}}',
      '{"type":"text","part":{"type":"text","text":"{\\"ok\\": true}"}}',
      '{"type":"step_finish","part":{"reason":"stop","tokens":{"input":1200,"output":45},"cost":0}}',
    ].join('\n');

    const parsed = parseOpenCodeJsonEvents(stdout);
    expect(parsed.text).toBe('{"ok": true}');
    expect(parsed.tokensIn).toBe(1200);
    expect(parsed.tokensOut).toBe(45);
    expect(parsed.costUsd).toBe(0);
    expect(parsed.finishReason).toBe('stop');
  });
});

describe('extractJsonObjectText', () => {
  it('remove cercas markdown e texto ao redor do objeto JSON', () => {
    expect(extractJsonObjectText('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(extractJsonObjectText('Resultado:\n{"a":1}\nFim.')).toBe('{"a":1}');
  });
});

describe('OpenCodeCliExtractor', () => {
  it('invoca o executor com --pure --format json e retorna ExtractionResponse', async () => {
    const extractor = new OpenCodeCliExtractor({
      model: 'opencode/deepseek-v4.1-flash-free',
      promptVersion: 'extract-v2',
      schemaVersion: 'extract-schema-v1',
      timeoutMs: 30_000,
      maxRetries: 1,
      execImpl: async (args) => {
        expect(args).toContain('--pure');
        expect(args).toContain('--format');
        expect(args).toContain('json');
        expect(args).toContain('opencode/deepseek-v4.1-flash-free');
        return {
          exitCode: 0,
          stderr: '',
          stdout: [
            '{"type":"text","part":{"type":"text","text":"```json\\n{\\"seniority\\":\\"senior\\"}\\n```"}}',
            '{"type":"step_finish","part":{"reason":"stop","tokens":{"input":500,"output":80},"cost":0}}',
          ].join('\n'),
        };
      },
    });

    const res = await extractor.extract({
      title: 'Senior TS Engineer',
      company: 'Acme',
      locationRaw: 'Remote',
      description: 'TypeScript and Node.js required.',
    });

    expect(res.rawText).toBe('{"seniority":"senior"}');
    expect(res.tokensIn).toBe(500);
    expect(res.tokensOut).toBe(80);
    expect(res.costUsd).toBe(0);
    expect(res.model).toBe('opencode/deepseek-v4.1-flash-free');
  });
});
