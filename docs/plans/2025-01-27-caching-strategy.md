# API 캐싱 전략 계획

## 개요

| 항목 | 현재 | 변경 후 |
|------|------|---------|
| 캐시 | 없음 | Vercel KV (Redis 호환) |
| TTL | N/A | 데이터별 차등 적용 |
| 비용 영향 | API 호출당 비용 | 캐시 히트 시 무료 |

## 타당성 분석

### 데이터 특성

| API | 데이터 | 변동 주기 | 권장 TTL |
|-----|--------|----------|----------|
| C004 (위생등급) | 식약처 공인 등급 | 연 1회 갱신 | 7일 |
| I2630 (행정처분) | 과거 이력 | 신규 처분 시 | 7일 |
| Kakao Map | 식당 목록 | 수시 변동 | 1일 |

### 캐싱 효과 예측

```
시나리오: "스타벅스 강남" 하루 100회 조회

Before:
  - API 호출: 100회 × 2 API = 200회/일

After (캐시 히트율 90% 가정):
  - API 호출: 10회 × 2 API = 20회/일
  - 절감: 90%
```

### Vercel 환경 고려사항

```
문제: Serverless는 인스턴스 격리 → In-memory 캐시 무효
해결: Vercel KV (Upstash Redis 기반) 사용
장점:
  - Vercel 네이티브 통합
  - 서버리스 호환 (HTTP 기반)
  - 무료 티어: 3,000 요청/일
```

## 아키텍처

### 캐시 레이어 구조

```
┌─────────────────────────────────────────────────────────┐
│                      MCP Tools                          │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                   CacheService                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  get(key) → cached? return : fetchAndCache()   │    │
│  └─────────────────────────────────────────────────┘    │
└────────────┬────────────────────────────┬───────────────┘
             │                            │
    ┌────────▼────────┐          ┌────────▼────────┐
    │   Vercel KV     │          │   External API  │
    │   (Redis)       │          │   (식약처/카카오) │
    └─────────────────┘          └─────────────────┘
```

### 캐시 키 설계

```typescript
// 위생등급: hygiene:{name}:{region}
"hygiene:스타벅스:강남구" → HygieneGradeItem

// 행정처분: violation:{name}:{region}
"violation:스타벅스:강남구" → ViolationHistory

// 지역 검색: area:{area}:{category}
"area:강남구:restaurant" → RestaurantInfo[]
```

## 구현 계획

### Phase 1: 인프라 설정
- [ ] Vercel KV 프로젝트 연결
- [ ] 환경 변수 설정 (`KV_REST_API_URL`, `KV_REST_API_TOKEN`)
- [ ] 의존성 추가 (`@vercel/kv`)

### Phase 2: CacheService 구현
- [ ] `src/services/cache.service.ts` 생성
- [ ] get/set/delete 메서드 구현
- [ ] TTL 설정 로직 추가

```typescript
// src/services/cache.service.ts
import { kv } from '@vercel/kv';

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

const TTL = {
  HYGIENE_GRADE: 7 * 24 * 60 * 60,  // 7일
  VIOLATION: 7 * 24 * 60 * 60,       // 7일
  KAKAO_MAP: 1 * 24 * 60 * 60,       // 1일
} as const;
```

### Phase 3: 서비스 래핑
- [ ] `HygieneGradeService` 캐시 적용
- [ ] `ViolationService` 캐시 적용
- [ ] `KakaoMapService` 캐시 적용

```typescript
// 캐시 적용 예시
async searchByName(name: string, region?: string) {
  const cacheKey = `hygiene:${name}:${region || 'all'}`;

  // 캐시 확인
  const cached = await this.cache.get<HygieneGradeSearchResult>(cacheKey);
  if (cached) return cached;

  // API 호출
  const result = await this.fetchFromApi(name, region);

  // 캐시 저장
  await this.cache.set(cacheKey, result, TTL.HYGIENE_GRADE);

  return result;
}
```

### Phase 4: 테스트 및 모니터링
- [ ] 캐시 서비스 단위 테스트
- [ ] 통합 테스트 (캐시 히트/미스 시나리오)
- [ ] Vercel Analytics로 캐시 효과 모니터링

## 파일 변경 목록

### 신규 파일
```
src/services/cache.service.ts      # 캐시 서비스
src/services/cache.service.test.ts # 캐시 테스트
```

### 수정 파일
```
src/services/hygiene-grade.service.ts  # 캐시 래핑
src/services/violation.service.ts      # 캐시 래핑
src/services/kakao-map.service.ts      # 캐시 래핑
src/providers/services.provider.ts     # DI 설정
package.json                           # @vercel/kv 추가
```

## 의존성

```json
{
  "dependencies": {
    "@vercel/kv": "^2.0.0"
  }
}
```

## 환경 변수

```bash
# Vercel KV (자동 설정됨)
KV_REST_API_URL=https://xxx.kv.vercel-storage.com
KV_REST_API_TOKEN=xxx
```

## 비용 분석

### Vercel KV 가격 (2024)

| 티어 | 요청/월 | 저장공간 | 가격 |
|------|---------|----------|------|
| Hobby | 3,000/일 | 256MB | 무료 |
| Pro | 150,000 | 1GB | $1/100k 추가요청 |

### 예상 사용량

```
일일 조회: 1,000회 (예상)
캐시 히트율: 80%
실제 KV 요청: 200회/일 (무료 티어 내)
```

## 대안 검토

| 옵션 | 장점 | 단점 |
|------|------|------|
| Vercel KV | 네이티브 통합, 간편 | Vercel 종속 |
| Upstash Redis | 유연, 다른 플랫폼 호환 | 별도 설정 필요 |
| In-memory | 무료, 빠름 | Cold start 시 손실 |

**선택: Vercel KV** - Vercel 배포 환경에 최적화

## 롤백 계획

캐시 장애 시:
1. 환경 변수 `CACHE_ENABLED=false`로 비활성화
2. 서비스는 API 직접 호출로 폴백
3. 캐시 서비스 복구 후 재활성화

## 결론

7일 TTL 캐싱 전략은 **적합합니다**:
- 위생등급/행정처분 데이터는 변동이 거의 없음
- API 호출 비용 및 latency 절감 효과 큼
- Vercel KV로 서버리스 환경에서도 안정적 운영 가능

단, Kakao Map 데이터는 1일 TTL을 권장합니다 (식당 오픈/폐업 반영).
