/**
 * 공공데이터포털 API 클라이언트
 */

const GOV_DATA_BASE_URL = 'https://apis.data.go.kr';
const DEFAULT_TIMEOUT = 10000;

export class GovDataApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'GovDataApiError';
  }
}

export class GovDataClient {
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOV_DATA_KEY || '';
    this.timeout = DEFAULT_TIMEOUT;

    if (!this.apiKey) {
      throw new Error(
        'API key is required. Set GOV_DATA_KEY environment variable.',
      );
    }
  }

  buildUrl(endpoint: string, params: Record<string, string> = {}): string {
    const url = new URL(endpoint, GOV_DATA_BASE_URL);
    url.searchParams.set('ServiceKey', this.apiKey);
    url.searchParams.set('returnType', 'json');

    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  async fetch<T>(
    endpoint: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new GovDataApiError(
          `HTTP error: ${response.statusText}`,
          'HTTP_ERROR',
          response.status,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof GovDataApiError) throw error;

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new GovDataApiError('Request timeout', 'TIMEOUT');
        }
        throw new GovDataApiError(error.message, 'NETWORK_ERROR');
      }

      throw new GovDataApiError('Unknown error', 'UNKNOWN');
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export function createGovDataClient(apiKey?: string): GovDataClient {
  return new GovDataClient(apiKey);
}
