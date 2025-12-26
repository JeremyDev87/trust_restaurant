/**
 * 식품안전나라 OpenAPI 클라이언트
 */

import { API_CONFIG } from '../config/constants.js';

/**
 * API 호출 옵션
 */
export interface ApiCallOptions {
  /** 서비스 ID (C004, I2630, I0470) */
  serviceId: string;
  /** 시작 인덱스 (1부터) */
  startIdx?: number;
  /** 종료 인덱스 */
  endIdx?: number;
  /** 추가 파라미터 (key=value 형식) */
  params?: Record<string, string>;
}

/**
 * API 에러
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API 클라이언트 클래스
 */
export class FoodSafetyApiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FOOD_API_KEY || '';
    this.baseUrl = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;

    if (!this.apiKey) {
      throw new Error(
        'API key is required. Set FOOD_API_KEY environment variable.',
      );
    }
  }

  /**
   * API URL 생성
   */
  buildUrl(options: ApiCallOptions): string {
    const {
      serviceId,
      startIdx = 1,
      endIdx = API_CONFIG.MAX_RESULTS,
      params = {},
    } = options;

    let url = `${this.baseUrl}/${this.apiKey}/${serviceId}/json/${startIdx}/${endIdx}`;

    // 추가 파라미터가 있으면 URL에 추가
    const paramEntries = Object.entries(params).filter(([, v]) => v);
    if (paramEntries.length > 0) {
      const paramString = paramEntries
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      url += `/${paramString}`;
    }

    return url;
  }

  /**
   * API 호출
   */
  async fetch<T>(options: ApiCallOptions): Promise<T> {
    const url = this.buildUrl(options);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new ApiError(
          `HTTP error: ${response.statusText}`,
          'HTTP_ERROR',
          response.status,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;

      // API 에러 응답 체크
      const serviceData = data[options.serviceId] as
        | { RESULT?: { CODE?: string; MSG?: string } }
        | undefined;
      if (serviceData?.RESULT?.CODE && serviceData.RESULT.CODE !== 'INFO-000') {
        throw new ApiError(
          serviceData.RESULT.MSG || 'API error',
          serviceData.RESULT.CODE,
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError('Request timeout', 'TIMEOUT');
        }
        throw new ApiError(error.message, 'NETWORK_ERROR');
      }

      throw new ApiError('Unknown error', 'UNKNOWN');
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * 기본 API 클라이언트 인스턴스 생성
 */
export function createApiClient(apiKey?: string): FoodSafetyApiClient {
  return new FoodSafetyApiClient(apiKey);
}
