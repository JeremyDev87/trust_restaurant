# HACCP API 연동 및 신뢰도 점수 개선 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 공공데이터포털 HACCP 인증업체 API를 연동하여 신뢰도 점수 정확도 향상

**Architecture:** GovDataClient 생성 → HACCP 서비스 구현 → 신뢰도 점수에 HACCP 지표 추가 → usecase 통합

**Tech Stack:** TypeScript, Zod, Vitest, 공공데이터포털 API

---

## Task 1: HACCP API 타입 정의

**Files:**
- Create: `src/types/api/gov-data/haccp.types.ts`
- Create: `src/types/api/gov-data/index.ts`
- Modify: `src/types/api/index.ts`

**Step 1: HACCP 타입 파일 생성**

```typescript
// src/types/api/gov-data/haccp.types.ts
/**
 * 공공데이터포털 HACCP 인증업체 API 타입
 * @see https://www.data.go.kr/data/15033311/openapi.do
 */

export interface HaccpApiResponse {
  header: {
    resultCode: string;
    resultMessage: string;
  };
  body: {
    numOfRows: string;
    pageNo: string;
    totalCount: string;
    items?: {
      item: HaccpCompanyItem | HaccpCompanyItem[];
    };
  };
}

export interface HaccpCompanyItem {
  /** 인증번호 */
  appointno: string;
  /** 식품/축산 구분 */
  productGb: string;
  /** 업체명 */
  company: string;
  /** 사업자번호 */
  companyNo: string;
  /** 대표자명 */
  ceoname: string;
  /** 주소 */
  worksaddr: string;
  /** 시도 */
  area1: string;
  /** 시군구 */
  area2: string;
  /** 업태명 */
  companykindNm: string;
  /** 업종명 */
  businesstypeNm: string;
  /** 인증일 */
  issuedate: string;
  /** 인증만료일 */
  issueenddate: string;
}

export interface HaccpSearchParams {
  /** 업체명 검색 */
  company?: string;
  /** 페이지 번호 */
  pageNo?: number;
  /** 페이지당 결과 수 */
  numOfRows?: number;
}
```

**Step 2: 인덱스 파일 생성**

```typescript
// src/types/api/gov-data/index.ts
export * from './haccp.types.js';
```

**Step 3: API 타입 인덱스 업데이트**

```typescript
// src/types/api/index.ts 에 추가
export * from './gov-data/index.js';
```

**Step 4: 커밋**

```bash
git add src/types/api/gov-data/
git commit -m "feat: add HACCP API type definitions"
```

---

## Task 2: 공공데이터포털 API 클라이언트

**Files:**
- Create: `src/utils/gov-data-client.ts`
- Create: `src/utils/gov-data-client.test.ts`

**Step 1: 테스트 작성**

```typescript
// src/utils/gov-data-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GovDataClient, createGovDataClient } from './gov-data-client.js';

describe('GovDataClient', () => {
  beforeEach(() => {
    vi.stubEnv('GOV_DATA_KEY', 'test-api-key');
  });

  describe('constructor', () => {
    it('should throw if no API key', () => {
      vi.stubEnv('GOV_DATA_KEY', '');
      expect(() => new GovDataClient()).toThrow('GOV_DATA_KEY');
    });

    it('should accept API key from constructor', () => {
      const client = new GovDataClient('custom-key');
      expect(client).toBeInstanceOf(GovDataClient);
    });
  });

  describe('buildUrl', () => {
    it('should build correct URL with params', () => {
      const client = new GovDataClient('test-key');
      const url = client.buildUrl('/TestService/getTest', {
        company: '스타벅스',
        pageNo: '1',
      });

      expect(url).toContain('apis.data.go.kr');
      expect(url).toContain('ServiceKey=test-key');
      expect(url).toContain('company=' + encodeURIComponent('스타벅스'));
    });
  });
});

describe('createGovDataClient', () => {
  it('should create client instance', () => {
    vi.stubEnv('GOV_DATA_KEY', 'test-key');
    const client = createGovDataClient();
    expect(client).toBeInstanceOf(GovDataClient);
  });
});
```

**Step 2: 클라이언트 구현**

```typescript
// src/utils/gov-data-client.ts
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

  async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
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
```

**Step 3: 테스트 실행**

```bash
npm run test:run -- src/utils/gov-data-client.test.ts
```

**Step 4: 커밋**

```bash
git add src/utils/gov-data-client.ts src/utils/gov-data-client.test.ts
git commit -m "feat: add GovDataClient for public data portal API"
```

---

## Task 3: HACCP 서비스 구현

**Files:**
- Create: `src/services/haccp.service.ts`
- Create: `src/services/haccp.service.test.ts`

**Step 1: 테스트 작성**

```typescript
// src/services/haccp.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HaccpService, createHaccpService } from './haccp.service.js';
import { GovDataClient } from '../utils/gov-data-client.js';
import type { HaccpApiResponse } from '../types/api/gov-data/haccp.types.js';

describe('HaccpService', () => {
  let mockClient: GovDataClient;
  let service: HaccpService;

  const mockResponse: HaccpApiResponse = {
    header: { resultCode: '00', resultMessage: 'NORMAL SERVICE' },
    body: {
      numOfRows: '10',
      pageNo: '1',
      totalCount: '1',
      items: {
        item: {
          appointno: '2020-6-0001',
          productGb: '식품',
          company: '스타벅스코리아',
          companyNo: '123-45-67890',
          ceoname: '홍길동',
          worksaddr: '서울특별시 중구 세종대로 100',
          area1: '서울특별시',
          area2: '중구',
          companykindNm: '식품제조업',
          businesstypeNm: '커피',
          issuedate: '2020-01-15',
          issueenddate: '2025-01-14',
        },
      },
    },
  };

  beforeEach(() => {
    mockClient = { fetch: vi.fn() } as unknown as GovDataClient;
    service = new HaccpService(mockClient);
  });

  describe('searchByName', () => {
    it('should return certification info when found', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockResponse);

      const result = await service.searchByName('스타벅스');

      expect(result.totalCount).toBe(1);
      expect(result.items[0].company).toBe('스타벅스코리아');
      expect(result.items[0].isCertified).toBe(true);
    });

    it('should return empty when not found', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce({
        header: { resultCode: '00', resultMessage: 'NORMAL SERVICE' },
        body: { numOfRows: '10', pageNo: '1', totalCount: '0' },
      });

      const result = await service.searchByName('존재하지않는업체');

      expect(result.totalCount).toBe(0);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('isCompanyCertified', () => {
    it('should return true for certified company', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockResponse);

      const result = await service.isCompanyCertified('스타벅스');

      expect(result).toBe(true);
    });

    it('should return false for non-certified company', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce({
        header: { resultCode: '00', resultMessage: 'NORMAL SERVICE' },
        body: { numOfRows: '10', pageNo: '1', totalCount: '0' },
      });

      const result = await service.isCompanyCertified('미인증업체');

      expect(result).toBe(false);
    });
  });
});
```

**Step 2: 서비스 구현**

```typescript
// src/services/haccp.service.ts
/**
 * HACCP 인증업체 조회 서비스
 */

import type {
  HaccpApiResponse,
  HaccpCompanyItem,
  HaccpSearchParams,
} from '../types/api/gov-data/haccp.types.js';
import { GovDataClient, createGovDataClient } from '../utils/gov-data-client.js';

const HACCP_API_ENDPOINT = '/B553748/CertCompanyListService2/getCertCompanyListService2';

export interface HaccpCertification {
  certificationNo: string;
  company: string;
  address: string;
  certifiedDate: string;
  expirationDate: string;
  isCertified: boolean;
}

export interface HaccpSearchResult {
  totalCount: number;
  items: HaccpCertification[];
}

export class HaccpService {
  constructor(private readonly client: GovDataClient) {}

  async searchByName(companyName: string, params?: HaccpSearchParams): Promise<HaccpSearchResult> {
    const response = await this.client.fetch<HaccpApiResponse>(HACCP_API_ENDPOINT, {
      company: companyName,
      pageNo: String(params?.pageNo || 1),
      numOfRows: String(params?.numOfRows || 10),
    });

    const totalCount = parseInt(response.body.totalCount, 10) || 0;

    if (totalCount === 0 || !response.body.items) {
      return { totalCount: 0, items: [] };
    }

    const rawItems = response.body.items.item;
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    return {
      totalCount,
      items: items.map(this.mapToCertification),
    };
  }

  async isCompanyCertified(companyName: string): Promise<boolean> {
    const result = await this.searchByName(companyName, { numOfRows: 1 });
    return result.totalCount > 0;
  }

  private mapToCertification(item: HaccpCompanyItem): HaccpCertification {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const expDate = item.issueenddate?.replace(/-/g, '') || '';

    return {
      certificationNo: item.appointno,
      company: item.company,
      address: item.worksaddr,
      certifiedDate: item.issuedate,
      expirationDate: item.issueenddate,
      isCertified: expDate >= today,
    };
  }
}

export function createHaccpService(client?: GovDataClient): HaccpService {
  return new HaccpService(client || createGovDataClient());
}
```

**Step 3: 테스트 실행**

```bash
npm run test:run -- src/services/haccp.service.test.ts
```

**Step 4: 커밋**

```bash
git add src/services/haccp.service.ts src/services/haccp.service.test.ts
git commit -m "feat: add HACCP certification service"
```

---

## Task 4: 신뢰도 점수 타입 및 가중치 수정

**Files:**
- Modify: `src/types/trust-score.types.ts`
- Modify: `src/services/trust-score.service.ts`
- Modify: `src/services/trust-score.service.test.ts`

**Step 1: 타입 수정**

```typescript
// src/types/trust-score.types.ts - 전체 교체
/**
 * 신뢰도 점수 시스템 타입 정의 (v2 - HACCP 추가)
 */

export type TrustGrade = 'A' | 'B' | 'C' | 'D';

export interface TrustIndicatorScores {
  hygieneGrade: number;
  violationHistory: number;
  haccp: number;
  franchise: number;
}

export interface TrustIndicatorDetails {
  hygieneGrade: string | null;
  violationCount: number;
  isHaccpCertified: boolean;
  isFranchise: boolean;
}

export interface TrustScoreResult {
  score: number;
  grade: TrustGrade;
  message: string;
  indicatorScores: TrustIndicatorScores;
  details: TrustIndicatorDetails;
}

export const TRUST_SCORE_WEIGHTS = {
  hygieneGrade: 0.35,
  violationHistory: 0.30,
  haccp: 0.25,
  franchise: 0.10,
} as const;

export const TRUST_GRADE_MESSAGES: Record<TrustGrade, string> = {
  A: '안심하고 가세요',
  B: '가도 됩니다',
  C: '참고하세요',
  D: '주의가 필요합니다',
} as const;
```

**Step 2: 서비스 로직 수정**

```typescript
// src/services/trust-score.service.ts - 전체 교체
/**
 * 신뢰도 점수 계산 서비스 (v2 - HACCP 추가)
 */

import type {
  TrustScoreResult,
  TrustIndicatorScores,
  TrustIndicatorDetails,
  TrustGrade,
} from '../types/trust-score.types.js';
import {
  TRUST_SCORE_WEIGHTS,
  TRUST_GRADE_MESSAGES,
} from '../types/trust-score.types.js';

export const calculateIndicatorScore = {
  hygieneGrade(grade: string | null): number {
    switch (grade) {
      case 'AAA': return 100;
      case 'AA': return 80;
      case 'A': return 60;
      default: return 40;
    }
  },

  violationHistory(count: number): number {
    if (count === 0) return 100;
    if (count === 1) return 60;
    return 20;
  },

  haccp(isCertified: boolean): number {
    return isCertified ? 100 : 40;
  },

  franchise(isFranchise: boolean): number {
    return isFranchise ? 70 : 50;
  },
};

export function determineGrade(score: number): TrustGrade {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

export interface TrustScoreInput {
  hygieneGrade: string | null;
  violationCount: number;
  isHaccpCertified: boolean;
  isFranchise: boolean;
}

export function calculateTrustScore(input: TrustScoreInput): TrustScoreResult {
  const indicatorScores: TrustIndicatorScores = {
    hygieneGrade: calculateIndicatorScore.hygieneGrade(input.hygieneGrade),
    violationHistory: calculateIndicatorScore.violationHistory(input.violationCount),
    haccp: calculateIndicatorScore.haccp(input.isHaccpCertified),
    franchise: calculateIndicatorScore.franchise(input.isFranchise),
  };

  const score = Math.round(
    indicatorScores.hygieneGrade * TRUST_SCORE_WEIGHTS.hygieneGrade +
    indicatorScores.violationHistory * TRUST_SCORE_WEIGHTS.violationHistory +
    indicatorScores.haccp * TRUST_SCORE_WEIGHTS.haccp +
    indicatorScores.franchise * TRUST_SCORE_WEIGHTS.franchise
  );

  const grade = determineGrade(score);

  const details: TrustIndicatorDetails = {
    hygieneGrade: input.hygieneGrade,
    violationCount: input.violationCount,
    isHaccpCertified: input.isHaccpCertified,
    isFranchise: input.isFranchise,
  };

  return {
    score,
    grade,
    message: TRUST_GRADE_MESSAGES[grade],
    indicatorScores,
    details,
  };
}
```

**Step 3: 테스트 수정**

```typescript
// src/services/trust-score.service.test.ts - 전체 교체
import { describe, it, expect } from 'vitest';
import {
  calculateIndicatorScore,
  calculateTrustScore,
  determineGrade,
} from './trust-score.service.js';

describe('calculateIndicatorScore', () => {
  describe('hygieneGrade', () => {
    it('should return 100 for AAA', () => {
      expect(calculateIndicatorScore.hygieneGrade('AAA')).toBe(100);
    });
    it('should return 80 for AA', () => {
      expect(calculateIndicatorScore.hygieneGrade('AA')).toBe(80);
    });
    it('should return 60 for A', () => {
      expect(calculateIndicatorScore.hygieneGrade('A')).toBe(60);
    });
    it('should return 40 for null', () => {
      expect(calculateIndicatorScore.hygieneGrade(null)).toBe(40);
    });
  });

  describe('haccp', () => {
    it('should return 100 for certified', () => {
      expect(calculateIndicatorScore.haccp(true)).toBe(100);
    });
    it('should return 40 for not certified', () => {
      expect(calculateIndicatorScore.haccp(false)).toBe(40);
    });
  });
});

describe('calculateTrustScore', () => {
  it('should calculate A grade for excellent restaurant', () => {
    const result = calculateTrustScore({
      hygieneGrade: 'AAA',
      violationCount: 0,
      isHaccpCertified: true,
      isFranchise: true,
    });

    expect(result.grade).toBe('A');
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it('should calculate lower grade for poor indicators', () => {
    const result = calculateTrustScore({
      hygieneGrade: null,
      violationCount: 3,
      isHaccpCertified: false,
      isFranchise: false,
    });

    expect(result.grade).toBe('D');
    expect(result.score).toBeLessThan(40);
  });
});

describe('determineGrade', () => {
  it('should return A for 80+', () => expect(determineGrade(80)).toBe('A'));
  it('should return B for 60-79', () => expect(determineGrade(65)).toBe('B'));
  it('should return C for 40-59', () => expect(determineGrade(45)).toBe('C'));
  it('should return D for <40', () => expect(determineGrade(30)).toBe('D'));
});
```

**Step 4: 테스트 실행**

```bash
npm run test:run -- src/services/trust-score.service.test.ts
```

**Step 5: 커밋**

```bash
git add src/types/trust-score.types.ts src/services/trust-score.service.ts src/services/trust-score.service.test.ts
git commit -m "feat: update trust score with HACCP indicator"
```

---

## Task 5: 포맷터 업데이트

**Files:**
- Modify: `src/formatters/trust-score-formatter.ts`
- Modify: `src/formatters/trust-score-formatter.test.ts`

**Step 1: 포맷터 수정**

지표 이름에 HACCP 추가:

```typescript
// src/formatters/trust-score-formatter.ts 의 INDICATOR_NAMES 수정
const INDICATOR_NAMES = {
  hygieneGrade: '위생등급',
  violationHistory: '행정처분',
  haccp: 'HACCP인증',
  franchise: '프랜차이즈',
} as const;
```

**Step 2: 테스트 수정**

mock 데이터 업데이트:

```typescript
// 테스트의 mockResult 수정
const mockResult: TrustScoreResult = {
  score: 75,
  grade: 'B',
  message: '가도 됩니다',
  indicatorScores: {
    hygieneGrade: 80,
    violationHistory: 100,
    haccp: 40,
    franchise: 70,
  },
  details: {
    hygieneGrade: 'AA',
    violationCount: 0,
    isHaccpCertified: false,
    isFranchise: true,
  },
};
```

**Step 3: 테스트 실행**

```bash
npm run test:run -- src/formatters/trust-score-formatter.test.ts
```

**Step 4: 커밋**

```bash
git add src/formatters/trust-score-formatter.ts src/formatters/trust-score-formatter.test.ts
git commit -m "feat: update trust score formatter with HACCP indicator"
```

---

## Task 6: Usecase 통합

**Files:**
- Modify: `src/application/restaurant-hygiene.usecase.ts`

**Step 1: HACCP 서비스 import 및 통합**

buildSuccessResult 함수에서 HACCP 조회 추가:

```typescript
// import 추가
import { createHaccpService, type HaccpService } from '../services/haccp.service.js';

// HygieneQueryServices 인터페이스에 추가
haccpService?: HaccpService;

// getServices 함수에 추가
const haccpService = injected?.haccpService || createHaccpService();

// buildSuccessResult 파라미터에 추가
isHaccpCertified: boolean = false

// calculateTrustScore 호출 수정
const trustScore = calculateTrustScore({
  hygieneGrade: hygieneGrade.grade,
  violationCount: violations.total_count,
  isHaccpCertified,
  isFranchise: isFranchise(name),
});
```

**Step 2: 전체 테스트 실행**

```bash
npm run test:run
npm run typecheck
npm run build
```

**Step 3: 커밋**

```bash
git add src/application/restaurant-hygiene.usecase.ts
git commit -m "feat: integrate HACCP service into restaurant hygiene query"
```

---

## Task 7: 최종 검증

**Step 1: 전체 테스트**

```bash
npm run test:run
```

**Step 2: 타입체크**

```bash
npm run typecheck
```

**Step 3: 빌드**

```bash
npm run build
```

**Step 4: 수동 테스트 (선택)**

```bash
# MCP 서버 실행 후 스타벅스 조회 테스트
```
