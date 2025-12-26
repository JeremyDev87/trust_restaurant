# Clean Plate MCP 프로젝트 개선 계획

## 개요

Clean Plate MCP 프로젝트의 현재 상태를 분석하고 보완이 필요한 영역을 식별했습니다.
이 문서는 발견된 문제점과 개선 방안을 우선순위별로 정리합니다.

**분석 일자**: 2025-12-26
**현재 테스트 수**: 145개
**테스트 상태**: 전체 통과

---

## 1. 테스트 커버리지 개선 (우선순위: 높음)

### 현재 상태

| 영역 | 커버리지 | 상태 |
|------|----------|------|
| src/utils | 97.77% | 양호 |
| src/formatters | 94.06% | 양호 |
| src/services/hygiene-grade.service.ts | 82.35% | 보통 |
| src/services/violation.service.ts | 88.57% | 보통 |
| src/services/kakao-map.service.ts | 46.17% | 미흡 |
| src/services/cache.service.ts | 36.19% | 미흡 |
| src/services/bulk-hygiene.service.ts | 0% | 없음 |
| src/core/restaurant-hygiene.core.ts | 0% | 없음 |
| src/modules/* (NestJS) | 0% | 없음 |
| src/providers/* | 0% | 없음 |

### 개선 항목

#### 1.1 핵심 비즈니스 로직 테스트 추가
```
파일: tests/unit/core/restaurant-hygiene.core.test.ts
우선순위: 매우 높음
예상 테스트 수: 20-30개
```
- 카카오맵 검색 결과별 분기 테스트
- 식약처 API 폴백 로직 테스트
- 에러 핸들링 테스트 (KakaoApiError, ApiError)
- 성공/실패 결과 빌드 테스트

#### 1.2 캐시 서비스 테스트 보강
```
파일: src/services/cache.service.test.ts
우선순위: 높음
예상 테스트 수: 15-20개
```
- VercelKVCacheService 동작 테스트
- MemoryCache TTL 만료 테스트
- 환경변수에 따른 분기 테스트
- buildCacheKey 함수 테스트

#### 1.3 Bulk 위생정보 서비스 테스트
```
파일: src/services/bulk-hygiene.service.test.ts
우선순위: 높음
예상 테스트 수: 15-20개
```
- 필터 조건별 테스트 (all, clean, with_violations, no_grade)
- 배치 처리 로직 테스트
- Rate Limit 딜레이 테스트

#### 1.4 NestJS 모듈 테스트
```
파일: src/modules/hygiene/hygiene.controller.test.ts
파일: src/modules/mcp/mcp.controller.test.ts
우선순위: 중간
예상 테스트 수: 각 10-15개
```
- 컨트롤러 엔드포인트 테스트
- JSON-RPC 핸들링 테스트
- 에러 응답 테스트

#### 1.5 E2E 테스트 추가
```
파일: tests/e2e/mcp-flow.test.ts
파일: tests/e2e/rest-api.test.ts
우선순위: 중간
예상 테스트 수: 10-15개
```
- 전체 요청-응답 플로우 테스트
- Vercel 배포 환경 시뮬레이션

---

## 2. 코어 로직 캐싱 미적용 수정 (우선순위: 높음)

### 현재 문제

`src/core/restaurant-hygiene.core.ts`에서 서비스 인스턴스를 캐시 없이 생성:

```typescript
// 현재 코드 (캐싱 미적용)
const kakaoMapService = createKakaoMapService();
const apiClient = createApiClient();
const hygieneService = createHygieneGradeService(apiClient);
const violationService = createViolationService(apiClient);
```

### 해결 방안

옵션 A: 함수 파라미터로 서비스 주입
```typescript
export async function queryRestaurantHygiene(
  params: HygieneQueryParams,
  services?: {
    kakaoMapService?: KakaoMapService;
    hygieneService?: HygieneGradeService;
    violationService?: ViolationService;
  }
): Promise<HygieneQueryResult>
```

옵션 B: 모듈 레벨 서비스 초기화
```typescript
// core/services.ts
let cacheService: CacheService | null = null;

export function initializeCoreServices(cache?: CacheService) {
  cacheService = cache;
}

export function getCoreServices() {
  const cache = cacheService || createCacheService();
  // ... 서비스 생성 with cache
}
```

**권장**: 옵션 A (테스트 용이성, 명시적 의존성)

---

## 3. 입력 유효성 검사 강화 (우선순위: 중간)

### 현재 문제

MCP 컨트롤러에서 입력값 검증 없이 바로 사용:

```typescript
case 'tools/call':
  const toolName = (params as { name: string })?.name;
  const toolArgs = (params as { arguments: Record<string, unknown> })?.arguments || {};
  result = await executeTool(toolName, toolArgs);
```

### 해결 방안

Zod 스키마로 입력 검증:

```typescript
// schemas/mcp.schema.ts
import { z } from 'zod';

export const getRestaurantHygieneSchema = z.object({
  restaurant_name: z.string().min(1).max(100),
  region: z.string().min(1).max(50),
  include_history: z.boolean().optional().default(true),
});

export const searchAreaRestaurantsSchema = z.object({
  area: z.string().min(1).max(50),
  category: z.enum(['restaurant', 'cafe', 'all']).optional().default('all'),
});
```

---

## 4. 에러 핸들링 표준화 (우선순위: 중간)

### 현재 문제

- 일관되지 않은 에러 처리 패턴
- console.error 사용 (구조화된 로깅 없음)
- 에러 추적 불가

### 해결 방안

#### 4.1 구조화된 로거 도입
```typescript
// utils/logger.ts
interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export const logger = {
  info: (message: string, metadata?: Record<string, unknown>) => {...},
  warn: (message: string, metadata?: Record<string, unknown>) => {...},
  error: (message: string, error?: Error, metadata?: Record<string, unknown>) => {...},
};
```

#### 4.2 NestJS Exception Filter 활용
```typescript
// filters/http-exception.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // 표준화된 에러 응답 생성
    // 로깅
  }
}
```

---

## 5. API 문서 업데이트 (우선순위: 중간)

### 현재 문제

- docs/API.md에 새로운 도구(search_area_restaurants, get_bulk_hygiene_info) 미반영
- README.md에 캐싱 설정 안내 없음
- 환경변수 설명에 KV_REST_API_URL, KV_REST_API_TOKEN 누락

### 해결 항목

1. **docs/API.md 업데이트**
   - search_area_restaurants 도구 문서 추가
   - get_bulk_hygiene_info 도구 문서 추가
   - 필터 옵션 설명

2. **README.md 업데이트**
   - 캐싱 설정 섹션 추가
   - Upstash Redis / Vercel KV 설정 안내
   - 환경변수 전체 목록 업데이트

3. **CHANGELOG.md 업데이트**
   - 최근 기능 추가 내역 반영

---

## 6. 성능 모니터링 추가 (우선순위: 낮음)

### 현재 문제

- API 호출 시간 측정 없음
- 캐시 히트율 모니터링 없음
- 에러율 추적 불가

### 해결 방안

```typescript
// utils/metrics.ts
export interface ApiMetrics {
  totalCalls: number;
  cacheHits: number;
  cacheMisses: number;
  avgResponseTime: number;
  errorCount: number;
}

// Vercel Analytics 또는 자체 메트릭 수집
```

---

## 7. 보안 강화 (우선순위: 낮음)

### 현재 상태

- API 키가 환경변수로 관리됨 (양호)
- HTTPS 강제 (Vercel 기본 제공)

### 개선 항목

1. **Rate Limiting 강화**
   - 현재: 배치 간 100ms 딜레이
   - 개선: IP 기반 요청 제한 (예: 분당 60회)

2. **입력 새니타이징**
   - 특수문자 처리
   - 최대 길이 제한

---

## 8. 코드 품질 개선 (우선순위: 낮음)

### 현재 문제

1. **싱글톤 캐시 서비스**
   - 테스트 시 상태 공유 문제 가능
   - 현재 resetCacheService() 존재하지만 완전하지 않음

2. **타입 안정성**
   - 일부 any 타입 사용
   - strict null check 강화 여지

### 해결 방안

```typescript
// 테스트용 목 주입 패턴
export function createTestCacheService(): CacheService {
  return new MemoryCache() as unknown as CacheService;
}
```

---

## 구현 로드맵

### Phase 1: 테스트 커버리지 (1-2주)
1. [ ] core/restaurant-hygiene.core.test.ts 작성
2. [ ] cache.service.test.ts 보강
3. [ ] bulk-hygiene.service.test.ts 작성
4. [ ] 커버리지 70% 이상 달성

### Phase 2: 캐싱 및 검증 (1주)
5. [ ] 코어 로직 캐싱 적용
6. [ ] Zod 스키마 검증 추가
7. [ ] 기존 테스트 통과 확인

### Phase 3: 문서화 (2-3일)
8. [ ] API.md 업데이트
9. [ ] README.md 업데이트
10. [ ] CHANGELOG.md 작성

### Phase 4: 선택적 개선 (필요시)
11. [ ] NestJS 컨트롤러 테스트
12. [ ] 구조화된 로깅
13. [ ] 성능 메트릭

---

## 성공 기준

| 항목 | 현재 | 목표 |
|------|------|------|
| 전체 테스트 커버리지 | ~50% | 70%+ |
| 코어 로직 테스트 | 0% | 80%+ |
| 서비스 레이어 테스트 | ~60% | 80%+ |
| 문서 완성도 | 부분적 | 완전 |
| 캐시 적용 범위 | HTTP만 | 전체 |

---

## 리스크

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| 코어 로직 수정 시 회귀 | 높음 | 기존 145개 테스트 유지 |
| 캐싱 변경으로 동작 변화 | 중간 | 통합 테스트로 검증 |
| 문서 업데이트 누락 | 낮음 | 체크리스트 사용 |
