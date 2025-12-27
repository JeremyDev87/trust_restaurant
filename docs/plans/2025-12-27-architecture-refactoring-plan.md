# 아키텍처 리팩토링 계획

> 작성일: 2025-12-27

## 개요

trust-restaurant MCP 서버의 현재 아키텍처를 분석하고, 클린 아키텍처 원칙에 맞게 리팩토링하기 위한 계획을 수립한다.

---

## 현재 아키텍처

### 디렉토리 구조

```
src/
├── index.ts              # MCP Stdio 진입점 (CLI용)
├── main.ts               # NestJS HTTP 서버 진입점 (Vercel용)
├── app.module.ts         # NestJS 루트 모듈
├── config/               # 설정 상수
│   ├── constants.ts
│   └── area-suggestions.ts
├── core/                 # 비즈니스 로직
│   └── restaurant-hygiene.core.ts
├── formatters/           # 출력 포맷터
│   ├── compare-formatter.ts
│   ├── recommend-formatter.ts
│   ├── summary-formatter.ts
│   └── term-converter.ts
├── modules/              # NestJS 모듈
│   ├── hygiene/          # REST API 모듈
│   └── mcp/              # MCP HTTP 핸들러
├── providers/            # NestJS DI 프로바이더
│   ├── api-client.provider.ts
│   └── services.provider.ts
├── services/             # 서비스 레이어
│   ├── bulk-hygiene.service.ts
│   ├── cache.service.ts
│   ├── compare-restaurants.service.ts
│   ├── enhanced-area-search.service.ts
│   ├── hygiene-grade.service.ts
│   ├── kakao-map.service.ts
│   ├── naver-place.service.ts
│   ├── recommend-restaurants.service.ts
│   ├── restaurant-intelligence.service.ts
│   └── violation.service.ts
├── types/                # 타입 정의
│   ├── api/              # 외부 API 응답 타입
│   ├── domain/           # 도메인 모델
│   └── *.types.ts        # 기능별 타입
└── utils/                # 유틸리티
    ├── api-client.ts
    ├── address-matcher.ts
    ├── cache-wrapper.ts
    ├── date-formatter.ts
    ├── error-handler.ts
    └── validation.ts
```

### 진입점

| 파일 | 용도 | 프로토콜 |
|-----|------|---------|
| `src/index.ts` | CLI 실행 | MCP over Stdio |
| `src/main.ts` | 서버 실행 | MCP over HTTP (Vercel) |

---

## 문제점 분석

### 1. 심각한 코드 중복 (DRY 위반)

`src/index.ts`와 `src/modules/mcp/mcp.controller.ts`에 동일한 코드가 중복 존재:

| 중복 항목 | index.ts | mcp.controller.ts |
|----------|----------|-------------------|
| 도구 정의 | Zod 스키마 (150줄) | JSON Schema 객체 (120줄) |
| 도구 실행 | 인라인 핸들러 (200줄) | `executeTool()` 함수 (180줄) |
| 서비스 초기화 | 모듈 레벨 (10줄) | 모듈 레벨 (10줄) |
| 응답 포맷팅 | 동일 로직 | 동일 로직 복사 |

**영향**:
- 도구 추가/수정 시 2곳을 동시에 수정해야 함
- 불일치 발생 위험
- 유지보수 비용 증가

### 2. 새 기능 미통합

Phase 1-5에서 구현한 서비스들이 MCP 도구로 등록되지 않음:

| 서비스 | 구현 상태 | MCP 도구 등록 |
|-------|----------|--------------|
| `RestaurantIntelligenceService` | ✅ 완료 | ❌ 미등록 |
| `EnhancedAreaSearchService` | ✅ 완료 | ❌ 미등록 |
| `CompareRestaurantsService` | ✅ 완료 | ❌ 미등록 |
| `RecommendRestaurantsService` | ✅ 완료 | ❌ 미등록 |

### 3. 혼합된 패러다임

```
index.ts          → 직접 서비스 생성 (factory 함수)
mcp.controller.ts → 직접 서비스 생성 (DI 미사용)
providers/        → NestJS DI 정의 (실제로 사용 안됨)
```

DI 프로바이더가 정의되어 있지만, 실제 컨트롤러에서는 사용하지 않고 직접 서비스를 생성함.

### 4. 레이어 경계 불명확

```
core/
└── restaurant-hygiene.core.ts  # 비즈니스 로직 + 서비스 조합 + 에러 처리

services/
├── hygiene-grade.service.ts    # API 클라이언트 + 비즈니스 로직
├── kakao-map.service.ts        # API 클라이언트 + 데이터 변환
└── ...
```

- `core/`와 `services/`의 역할 구분이 모호
- 서비스가 API 클라이언트 역할과 비즈니스 로직을 함께 담당

### 5. 타입 분산

```
types/
├── api/                    # 외부 API 응답 (잘 구조화됨)
│   ├── c004.types.ts
│   ├── i2630.types.ts
│   └── common.types.ts
├── domain/                 # 도메인 모델 (일부만)
│   └── restaurant.types.ts
├── kakao-map.types.ts      # 기능별 (루트에 산재)
├── naver-place.types.ts
├── area-search.types.ts
├── compare.types.ts
├── recommend.types.ts
└── restaurant-intelligence.types.ts
```

---

## 리팩토링 계획

### Phase 1: 도구 정의 통합 (핵심)

**목표**: 도구 정의와 핸들러를 한 곳에서 관리

**변경 전**:
```
src/index.ts                    # 도구 정의 + 핸들러 (Zod)
src/modules/mcp/mcp.controller.ts  # 도구 정의 + 핸들러 (JSON Schema)
```

**변경 후**:
```
src/tools/
├── index.ts                        # 도구 레지스트리 (export all)
├── registry.ts                     # 도구 등록/조회 로직
├── definitions/
│   ├── get-restaurant-hygiene.def.ts
│   ├── search-area-restaurants.def.ts
│   ├── get-bulk-hygiene-info.def.ts
│   ├── compare-restaurants.def.ts      # 신규
│   └── recommend-restaurants.def.ts    # 신규
└── handlers/
    ├── get-restaurant-hygiene.handler.ts
    ├── search-area-restaurants.handler.ts
    ├── get-bulk-hygiene-info.handler.ts
    ├── compare-restaurants.handler.ts   # 신규
    └── recommend-restaurants.handler.ts # 신규
```

**도구 정의 형식**:
```typescript
// src/tools/definitions/get-restaurant-hygiene.def.ts
import { z } from 'zod';

export const getRestaurantHygieneDef = {
  name: 'get_restaurant_hygiene',
  title: '식당 위생 정보 조회',
  description: '식당의 위생등급과 행정처분 이력을 조회합니다...',

  // Zod 스키마 (MCP SDK용)
  inputSchema: {
    restaurant_name: z.string().describe('식당명'),
    region: z.string().describe('지역명'),
    include_history: z.boolean().optional().default(true),
  },

  // JSON Schema 자동 생성 (HTTP API용)
  toJsonSchema() {
    return zodToJsonSchema(this.inputSchema);
  },
};
```

**핸들러 형식**:
```typescript
// src/tools/handlers/get-restaurant-hygiene.handler.ts
import type { ToolContext } from '../types';

export async function handleGetRestaurantHygiene(
  args: { restaurant_name: string; region: string; include_history?: boolean },
  ctx: ToolContext,
): Promise<ToolResult> {
  // 비즈니스 로직 호출
  const result = await ctx.services.hygieneQuery.execute(args);

  // 응답 포맷팅
  return formatToolResponse(result);
}
```

**효과**:
- 도구 추가 시 1곳만 수정
- `index.ts`와 `mcp.controller.ts` 모두 동일 소스 사용
- 스키마 불일치 방지

---

### Phase 2: 서비스 계층 정리

**목표**: 서비스 역할을 명확히 분리

**변경 전**:
```
services/
├── kakao-map.service.ts      # API 클라이언트 + 데이터 변환
├── hygiene-grade.service.ts  # API 클라이언트 + 비즈니스 로직
└── ...
```

**변경 후**:
```
src/
├── clients/                  # 외부 API 클라이언트 (인프라 계층)
│   ├── food-safety-api.client.ts
│   ├── kakao-map.client.ts
│   └── naver-place.client.ts
│
├── services/                 # 도메인 서비스 (도메인 계층)
│   ├── hygiene-grade.service.ts
│   ├── violation.service.ts
│   ├── restaurant-search.service.ts
│   └── cache.service.ts
│
└── application/              # 애플리케이션 서비스 (유스케이스)
    ├── restaurant-hygiene.usecase.ts  # core/ 이동
    ├── compare-restaurants.usecase.ts
    ├── recommend-restaurants.usecase.ts
    └── area-search.usecase.ts
```

**역할 분리**:

| 계층 | 역할 | 예시 |
|-----|------|-----|
| `clients/` | 외부 API 호출, 응답 파싱 | HTTP 요청, 에러 처리 |
| `services/` | 도메인 로직, 데이터 변환 | 점수 계산, 필터링 |
| `application/` | 유스케이스 조합, 트랜잭션 | 여러 서비스 조합 |

---

### Phase 3: DI 통합

**목표**: NestJS DI를 일관되게 사용

**변경 전**:
```typescript
// mcp.controller.ts
const cacheService = createCacheService();  // 직접 생성
const apiClient = createApiClient();
const kakaoMapService = createKakaoMapService(undefined, cacheService);
```

**변경 후**:
```typescript
// mcp.controller.ts
@Controller('api/mcp')
export class McpController {
  constructor(
    @Inject(TOOL_REGISTRY_TOKEN)
    private readonly toolRegistry: ToolRegistry,

    @Inject(TOOL_CONTEXT_TOKEN)
    private readonly toolContext: ToolContext,
  ) {}

  async handleToolCall(name: string, args: unknown) {
    const handler = this.toolRegistry.getHandler(name);
    return handler(args, this.toolContext);
  }
}
```

**ToolContext 정의**:
```typescript
// src/tools/types.ts
export interface ToolContext {
  services: {
    cache: CacheService;
    kakaoMap: KakaoMapService;
    naverPlace: NaverPlaceService;
    hygieneGrade: HygieneGradeService;
    violation: ViolationService;
    bulkHygiene: BulkHygieneService;
    intelligence: RestaurantIntelligenceService;
    compare: CompareRestaurantsService;
    recommend: RecommendRestaurantsService;
  };
}
```

---

### Phase 4: 타입 정리

**목표**: 타입을 역할별로 구조화

**변경 전**:
```
types/
├── api/
├── domain/
├── kakao-map.types.ts      # 루트에 산재
├── naver-place.types.ts
├── area-search.types.ts
└── ...
```

**변경 후**:
```
src/types/
├── api/                    # 외부 API 응답 타입
│   ├── food-safety/
│   │   ├── c004.types.ts
│   │   ├── i2630.types.ts
│   │   └── common.types.ts
│   ├── kakao/
│   │   └── local-search.types.ts
│   └── naver/
│       └── place-search.types.ts
│
├── domain/                 # 도메인 모델
│   ├── restaurant.types.ts
│   ├── hygiene.types.ts
│   ├── violation.types.ts
│   └── rating.types.ts
│
└── tools/                  # MCP 도구 입출력
    ├── inputs.types.ts
    ├── outputs.types.ts
    └── common.types.ts
```

---

### Phase 5: 새 도구 등록

**목표**: 구현된 서비스들을 MCP 도구로 등록

**등록할 도구**:

| 도구명 | 서비스 | 설명 |
|-------|--------|------|
| `compare_restaurants` | `CompareRestaurantsService` | 식당 비교 |
| `recommend_restaurants` | `RecommendRestaurantsService` | 식당 추천 |
| `search_area_enhanced` | `EnhancedAreaSearchService` | 고급 지역 검색 |
| `get_restaurant_intelligence` | `RestaurantIntelligenceService` | 통합 정보 조회 |

**예시 - compare_restaurants**:
```typescript
// src/tools/definitions/compare-restaurants.def.ts
export const compareRestaurantsDef = {
  name: 'compare_restaurants',
  title: '식당 비교',
  description: '여러 식당의 위생등급, 평점, 가격대를 비교합니다.',
  inputSchema: {
    restaurants: z.array(z.object({
      name: z.string(),
      address: z.string(),
    })).min(2).max(5),
    criteria: z.array(z.enum(['hygiene', 'rating', 'price', 'reviews']))
      .optional()
      .default(['hygiene', 'rating']),
  },
};
```

---

## 구현 우선순위

| 순위 | Phase | 이유 |
|-----|-------|------|
| 1 | Phase 1 (도구 통합) | 가장 심각한 중복 제거, 즉시 효과 |
| 2 | Phase 5 (새 도구 등록) | 구현된 기능 활성화, 사용자 가치 |
| 3 | Phase 3 (DI 통합) | 테스트 용이성, 유지보수성 |
| 4 | Phase 2 (서비스 정리) | 점진적 개선 |
| 5 | Phase 4 (타입 정리) | 점진적 개선 |

---

## 예상 작업량

| Phase | 예상 작업 | 영향 범위 |
|-------|----------|----------|
| Phase 1 | 새 파일 10개, 수정 2개 | 중간 |
| Phase 2 | 파일 이동/분리 15개 | 큼 |
| Phase 3 | 수정 5개 | 작음 |
| Phase 4 | 파일 이동 10개 | 중간 |
| Phase 5 | 새 파일 8개 | 작음 |

---

## 리스크 및 대응

| 리스크 | 대응 방안 |
|-------|----------|
| 리팩토링 중 기존 기능 손상 | 각 Phase 후 전체 테스트 실행 |
| 배포 환경 호환성 | Vercel 배포 테스트 포함 |
| 타입 변경으로 인한 연쇄 수정 | 점진적 마이그레이션, 타입 별칭 활용 |

---

## 완료 기준

- [ ] 모든 테스트 통과 (531개)
- [ ] TypeScript 컴파일 에러 없음
- [ ] ESLint 통과
- [ ] 새 도구 4개 등록 및 동작 확인
- [ ] Vercel 배포 정상 동작
