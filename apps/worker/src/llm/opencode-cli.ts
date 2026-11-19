import { spawn } from 'node:child_process';
import {
  buildExtractionMessages,
  EXTRACTION_JSON_SCHEMA,
  type ExtractionPromptInput,
} from '@job-radar/shared';
import type { ExtractionRequest, ExtractionResponse, LlmExtractor } from './types.js';

export interface OpenCodeCliOptions {
  model: string;
  promptVersion: string;
  schemaVersion: string;
  timeoutMs: number;
  maxRetries: number;
  binPath?: string;
  workDir?: string;
  execImpl?: OpenCodeExecFn;
}

export interface OpenCodeExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type OpenCodeExecFn = (
  args: readonly string[],
  options: { timeoutMs: number; cwd: string },
) => Promise<OpenCodeExecResult>;

export interface ParsedOpenCodeEvents {
  text: string;
  tokensIn: number | null;
  tokensOut: number | null;
  costUsd: number | null;
  finishReason: string | null;
}

interface RawOpenCodeEvent {
  type?: string;
  part?: {
    type?: string;
    text?: string;
    reason?: string;
    cost?: number;
    tokens?: {
      input?: number;
      output?: number;
    };
  };
}

export function parseOpenCodeJsonEvents(stdout: string): ParsedOpenCodeEvents {
  const textChunks: string[] = [];
  let tokensIn: number | null = null;
  let tokensOut: number | null = null;
  let costUsd: number | null = null;
  let finishReason: string | null = null;

  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('{')) continue;
    let event: RawOpenCodeEvent;
    try {
      event = JSON.parse(line) as RawOpenCodeEvent;
    } catch {
      continue;
    }

    if (event.type === 'text' && typeof event.part?.text === 'string') {
      textChunks.push(event.part.text);
    } else if (event.type === 'step_finish' && event.part) {
      if (typeof event.part.tokens?.input === 'number') {
        tokensIn = (tokensIn ?? 0) + event.part.tokens.input;
      }
      if (typeof event.part.tokens?.output === 'number') {
        tokensOut = (tokensOut ?? 0) + event.part.tokens.output;
      }
      if (typeof event.part.cost === 'number') {
        costUsd = (costUsd ?? 0) + event.part.cost;
      }
      if (typeof event.part.reason === 'string') {
        finishReason = event.part.reason;
      }
    }
  }

  return {
    text: textChunks.join('').trim(),
    tokensIn,
    tokensOut,
    costUsd,
    finishReason,
  };
}

function defaultExec(
  binPath: string,
): OpenCodeExecFn {
  return (args, { timeoutMs, cwd }) =>
    new Promise<OpenCodeExecResult>((resolve, reject) => {
      const child = spawn(binPath, args, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      const timer = setTimeout(() => {
        killed = true;
        child.kill('SIGTERM');
      }, timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (killed) {
          reject(new Error(`opencode CLI excedeu timeout de ${timeoutMs} ms`));
          return;
        }
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 1,
        });
      });
    });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractJsonObjectText(text: string): string {
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }
  return trimmed;
}

export class OpenCodeCliExtractor implements LlmExtractor {
  readonly model: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
  private readonly options: OpenCodeCliOptions;
  private readonly execFn: OpenCodeExecFn;

  constructor(options: OpenCodeCliOptions) {
    this.options = options;
    this.model = options.model;
    this.promptVersion = options.promptVersion;
    this.schemaVersion = options.schemaVersion;
    this.execFn = options.execImpl ?? defaultExec(options.binPath ?? 'opencode');
  }

  private buildCombinedPrompt(request: ExtractionRequest): string {
    const prompt = buildExtractionMessages(request as ExtractionPromptInput);
    return [
      'IMPORTANT EXECUTION MODE: Do NOT call any tools, do NOT read or write files, do NOT run shell commands.',
      'Return ONLY a single raw JSON object (no markdown fences, no commentary) strictly conforming to the JSON Schema below.',
      '',
      '=== SYSTEM INSTRUCTIONS ===',
      prompt.system,
      '',
      '=== JSON SCHEMA ===',
      JSON.stringify(EXTRACTION_JSON_SCHEMA),
      '',
      '=== TASK INPUT ===',
      prompt.user,
    ].join('\n');
  }

  async extract(request: ExtractionRequest): Promise<ExtractionResponse> {
    const combinedPrompt = this.buildCombinedPrompt(request);
    const cwd = this.options.workDir ?? '/tmp';
    const args = [
      'run',
      '--pure',
      '--format',
      'json',
      '--dir',
      cwd,
      '-m',
      this.model,
      combinedPrompt,
    ];

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.options.maxRetries) {
      const startedAt = Date.now();
      try {
        const result = await this.execFn(args, {
          timeoutMs: this.options.timeoutMs,
          cwd,
        });
        const latencyMs = Date.now() - startedAt;

        if (result.exitCode !== 0) {
          throw new Error(
            `opencode CLI saiu com código ${result.exitCode}: ${(result.stderr || result.stdout).slice(0, 300)}`,
          );
        }

        const parsed = parseOpenCodeJsonEvents(result.stdout);
        if (parsed.text.length === 0) {
          throw new Error('opencode CLI não retornou conteúdo de texto');
        }

        return {
          rawText: extractJsonObjectText(parsed.text),
          model: this.model,
          tokensIn: parsed.tokensIn,
          tokensOut: parsed.tokensOut,
          latencyMs,
          costUsd: parsed.costUsd,
          finishReason: parsed.finishReason,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt >= this.options.maxRetries) {
          throw lastError;
        }
        await sleep(1000 * 2 ** attempt + Math.random() * 250);
        attempt += 1;
      }
    }

    throw lastError ?? new Error('falha no opencode CLI');
  }
}
