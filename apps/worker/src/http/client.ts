export interface FetchResult {
  status: number;
  body: string;
  url: string;
}

export interface HttpClientOptions {
  userAgent: string;
  intervalMs: number;
  maxRetries: number;
  timeoutMs?: number;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class HttpClient {
  private readonly lastRequestByHost = new Map<string, number>();

  constructor(private readonly options: HttpClientOptions) {}

  private async waitForHost(host: string): Promise<void> {
    const last = this.lastRequestByHost.get(host) ?? 0;
    const elapsed = Date.now() - last;
    const remaining = this.options.intervalMs - elapsed;
    if (remaining > 0) {
      await sleep(remaining);
    }
    this.lastRequestByHost.set(host, Date.now());
  }

  async get(url: string): Promise<FetchResult> {
    const host = new URL(url).host;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.options.maxRetries) {
      await this.waitForHost(host);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 20_000);
      try {
        const response = await fetch(url, {
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            'user-agent': this.options.userAgent,
            accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
            'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
          },
        });
        const body = await response.text();
        if (response.ok) {
          return { status: response.status, body, url: response.url };
        }
        if (!RETRYABLE_STATUS.has(response.status) || attempt === this.options.maxRetries) {
          throw new Error(`HTTP ${response.status} em ${url}`);
        }
        const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10);
        const baseDelay = response.status === 429 ? 5000 : 400;
        const delay = Number.isFinite(retryAfter)
          ? Math.max(retryAfter * 1000, baseDelay * 2 ** attempt)
          : baseDelay * 2 ** attempt + Math.random() * 250;
        await sleep(delay);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt === this.options.maxRetries) {
          throw lastError;
        }
        await sleep(400 * 2 ** attempt + Math.random() * 200);
      } finally {
        clearTimeout(timeout);
      }
      attempt += 1;
    }

    throw lastError ?? new Error(`falha ao buscar ${url}`);
  }
}
