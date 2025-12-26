# F001 식당 위생 정보 조회 - 구현 계획서

## 1. 개요

### 1.1 목적
F001 기능정의서에 따라 MCP 도구 `get_restaurant_hygiene`를 구현한다.

### 1.2 참조 문서
- [F001-식당위생정보조회.md](../feature/F001-식당위생정보조회.md)
- [API 테스트 계획서](./2025-01-06-api-test-plan.md)

### 1.3 프로젝트 컨텍스트

| 항목 | 값 |
|------|-----|
| 프로젝트 타입 | MCP 서버 |
| 언어 | TypeScript |
| 테스트 전략 | TDD (90% 커버리지) |
| 파일 네이밍 | kebab-case |
| 함수 네이밍 | camelCase |

---

## 2. 범위

### 2.1 In Scope
- MCP Tool: `get_restaurant_hygiene` 구현
- C004 API 연동 (위생등급 조회)
- I2630 API 연동 (행정처분 조회)
- TypeScript 타입 정의
- 에러 핸들링 (E-001 ~ E-004)
- 단위 테스트

### 2.2 Out of Scope
- F002 AI 요약 응답 (별도 구현)
- 응답 캐싱 (Phase 2)
- 주변 추천 기능 (PRD에서 제외)

---

## 3. 아키텍처

### 3.1 디렉토리 구조

```
src/
├── index.ts                       # MCP 서버 엔트리포인트
├── tools/
│   └── get-restaurant-hygiene.ts  # F001 MCP 도구
├── services/
│   ├── hygiene-grade.service.ts   # C004 API 서비스
│   └── violation.service.ts       # I2630 API 서비스
├── types/
│   ├── api/
│   │   ├── c004.types.ts          # C004 API 응답 타입
│   │   └── i2630.types.ts         # I2630 API 응답 타입
│   └── domain/
│       └── restaurant.types.ts    # 도메인 타입
├── utils/
│   ├── api-client.ts              # HTTP 클라이언트
│   └── address-matcher.ts         # 주소 매칭 유틸
└── config/
    └── constants.ts               # 상수 정의
```

### 3.2 데이터 흐름

```
┌─────────────────┐
│   MCP Client    │
│  (Claude, etc)  │
└────────┬────────┘
         │ get_restaurant_hygiene
         │ { restaurant_name, region }
         ▼
┌─────────────────┐
│   MCP Server    │
│   (index.ts)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  get-restaurant-hygiene.ts     │
│  - 입력 검증                     │
│  - 서비스 호출                   │
│  - 응답 포맷팅                   │
└────────┬────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ C004   │ │ I2630  │
│Service │ │Service │
└────┬───┘ └────┬───┘
     │          │
     ▼          ▼
┌─────────────────┐
│ 식품안전나라 API │
└─────────────────┘
```

### 3.3 컴포넌트 설명

| 컴포넌트 | 책임 |
|----------|------|
| `index.ts` | MCP 서버 초기화, 도구 등록 |
| `get-restaurant-hygiene.ts` | 입력 검증, 서비스 오케스트레이션, 응답 포맷팅 |
| `hygiene-grade.service.ts` | C004 API 호출, 업소명/주소 기반 필터링 |
| `violation.service.ts` | I2630 API 호출, 업소명/주소 기반 필터링 |
| `api-client.ts` | HTTP 요청, 에러 핸들링, 재시도 로직 |
| `address-matcher.ts` | 주소 문자열 매칭 로직 |

---

## 4. 타입 정의

### 4.1 API 응답 타입

#### C004 (위생등급)
```typescript
// src/types/api/c004.types.ts

interface C004Response {
  C004: {
    total_count: string;
    row: C004Row[];
    RESULT: {
      MSG: string;
      CODE: string;
    };
  };
}

interface C004Row {
  BSSH_NM: string;        // 업소명
  ADDR: string;           // 주소
  HG_ASGN_LV: string;     // 지정등급 (매우우수/우수/좋음)
  ASGN_FROM: string;      // 지정시작일 (YYYYMMDD)
  ASGN_TO: string;        // 지정종료일 (YYYYMMDD)
  INDUTY_NM: string;      // 업종
  LCNS_NO: string;        // 인허가번호
  TELNO: string;          // 전화번호
  WRKR_REG_NO: string;    // 사업자등록번호
}
```

#### I2630 (행정처분)
```typescript
// src/types/api/i2630.types.ts

interface I2630Response {
  I2630: {
    total_count: string;
    row: I2630Row[];
    RESULT: {
      MSG: string;
      CODE: string;
    };
  };
}

interface I2630Row {
  PRCSCITYPOINT_BSSHNM: string;  // 업소명
  ADDR: string;                   // 주소
  INDUTY_CD_NM: string;          // 업종
  DSPS_DCSNDT: string;           // 처분확정일자 (YYYYMMDD)
  DSPS_TYPECD_NM: string;        // 처분유형
  DSPSCN: string;                // 처분내용
  VILTCN: string;                // 위반내용
  DSPS_BGNDT: string;            // 처분시작일
  DSPS_ENDDT: string;            // 처분종료일
  PUBLIC_DT: string;             // 공개기한
  LCNS_NO: string;               // 인허가번호
}
```

### 4.2 도메인 타입

```typescript
// src/types/domain/restaurant.types.ts

interface RestaurantHygieneResult {
  restaurant: {
    name: string;
    address: string;
    business_type: string;
  };
  hygiene_grade: {
    has_grade: boolean;
    grade: 'AAA' | 'AA' | 'A' | null;
    grade_label: '매우 우수' | '우수' | '좋음' | null;
    grade_date: string | null;
    valid_until: string | null;
    stars: 3 | 2 | 1 | 0;
  };
  violations: {
    total_count: number;
    recent_items: ViolationItem[];
    has_more: boolean;
  };
}

interface ViolationItem {
  date: string;           // YYYY-MM-DD
  type: string;           // 처분유형
  content: string;        // 처분내용
  reason: string;         // 위반사유
  period?: {
    start: string;
    end: string;
  };
}

// MCP Tool 입력
interface GetRestaurantHygieneInput {
  restaurant_name: string;
  region: string;
  include_history?: boolean;
}

// 에러 타입
type HygieneError =
  | { code: 'NOT_FOUND'; message: string }
  | { code: 'MULTIPLE_RESULTS'; message: string; candidates: RestaurantCandidate[] }
  | { code: 'API_ERROR'; message: string }
  | { code: 'INVALID_INPUT'; message: string; missing_field: string };

interface RestaurantCandidate {
  name: string;
  address: string;
}
```

---

## 5. 구현 단계

### Phase 1: 프로젝트 초기화

| 단계 | 작업 | 산출물 |
|------|------|--------|
| 1.1 | TypeScript 프로젝트 설정 | `package.json`, `tsconfig.json` |
| 1.2 | MCP SDK 설치 | `@modelcontextprotocol/sdk` |
| 1.3 | 테스트 환경 구성 | `vitest.config.ts` |
| 1.4 | 린트/포맷터 설정 | `eslint.config.js` (기존) |

**의존성:**
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0"
  }
}
```

---

### Phase 2: 타입 정의 (TDD)

| 단계 | 작업 | 테스트 |
|------|------|--------|
| 2.1 | C004 API 응답 타입 | 타입 검증 테스트 |
| 2.2 | I2630 API 응답 타입 | 타입 검증 테스트 |
| 2.3 | 도메인 타입 | 변환 함수 테스트 |

---

### Phase 3: API 서비스 구현 (TDD)

#### 3.1 api-client.ts
```typescript
// 테스트 케이스
describe('ApiClient', () => {
  it('should make GET request with API key', async () => {});
  it('should handle API error response', async () => {});
  it('should timeout after 10 seconds', async () => {});
});
```

#### 3.2 hygiene-grade.service.ts
```typescript
// 테스트 케이스
describe('HygieneGradeService', () => {
  describe('searchByName', () => {
    it('should return hygiene grade for exact match', async () => {});
    it('should filter by region', async () => {});
    it('should return null when not found', async () => {});
  });

  describe('gradeMapping', () => {
    it('should map 매우우수 to AAA with 3 stars', () => {});
    it('should map 우수 to AA with 2 stars', () => {});
    it('should map 좋음 to A with 1 star', () => {});
  });
});
```

#### 3.3 violation.service.ts
```typescript
// 테스트 케이스
describe('ViolationService', () => {
  describe('searchByName', () => {
    it('should return violations for matching restaurant', async () => {});
    it('should sort by date descending', async () => {});
    it('should limit to 3 recent items', async () => {});
  });

  describe('formatViolation', () => {
    it('should format date to YYYY-MM-DD', () => {});
    it('should include period for 영업정지', () => {});
  });
});
```

#### 3.4 address-matcher.ts
```typescript
// 테스트 케이스
describe('AddressMatcher', () => {
  it('should match 종로구 in full address', () => {});
  it('should match 종로 as partial region', () => {});
  it('should be case insensitive for district names', () => {});
});
```

---

### Phase 4: MCP 도구 구현

#### 4.1 도구 등록
```typescript
// src/index.ts
const server = new Server({
  name: 'clean-plate-mcp',
  version: '1.0.0',
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_restaurant_hygiene',
      description: '식당의 위생등급과 행정처분 이력을 조회합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          restaurant_name: {
            type: 'string',
            description: '식당 상호명',
          },
          region: {
            type: 'string',
            description: '지역명 (시/구/동)',
          },
          include_history: {
            type: 'boolean',
            description: '행정처분 이력 포함 여부',
            default: true,
          },
        },
        required: ['restaurant_name', 'region'],
      },
    },
  ],
}));
```

#### 4.2 도구 핸들러
```typescript
// 테스트 케이스
describe('get_restaurant_hygiene', () => {
  describe('정상 시나리오', () => {
    it('S-001: 위생 등급 보유 식당 조회', async () => {});
    it('S-002: 위생 등급 미보유 식당 조회', async () => {});
    it('S-003: 처분 이력 다수 존재', async () => {});
  });

  describe('예외 시나리오', () => {
    it('E-001: 식당을 찾을 수 없음', async () => {});
    it('E-002: 동일 이름 식당 다수 존재', async () => {});
    it('E-003: API 호출 실패', async () => {});
    it('E-004: 필수 정보 누락', async () => {});
  });
});
```

---

### Phase 5: 에러 핸들링

| 에러 코드 | 상황 | 응답 |
|-----------|------|------|
| E-001 | 검색 결과 없음 | `{ code: 'NOT_FOUND', message: '해당 조건으로 식당을 찾을 수 없습니다.' }` |
| E-002 | 중복 결과 | `{ code: 'MULTIPLE_RESULTS', candidates: [...] }` |
| E-003 | API 오류 | `{ code: 'API_ERROR', message: '식약처 데이터를 조회할 수 없습니다.' }` |
| E-004 | 입력 누락 | `{ code: 'INVALID_INPUT', missing_field: 'region' }` |

---

## 6. 테스트 전략

### 6.1 테스트 레벨

| 레벨 | 대상 | 도구 |
|------|------|------|
| Unit | 서비스, 유틸 | Vitest |
| Integration | API 연동 | Vitest + MSW |
| E2E | MCP 도구 전체 흐름 | MCP Inspector |

### 6.2 목 데이터

```typescript
// tests/fixtures/c004-sample.json
// tests/fixtures/i2630-sample.json
// tests/fixtures/error-responses.json
```

### 6.3 커버리지 목표

| 영역 | 목표 |
|------|------|
| 전체 | 90% |
| 서비스 | 95% |
| 유틸 | 95% |
| 도구 핸들러 | 85% |

---

## 7. 구현 체크리스트

### Phase 1: 프로젝트 초기화
- [ ] `package.json` 생성 및 의존성 설치
- [ ] `tsconfig.json` 설정
- [ ] `vitest.config.ts` 설정
- [ ] 디렉토리 구조 생성

### Phase 2: 타입 정의
- [ ] `src/types/api/c004.types.ts`
- [ ] `src/types/api/i2630.types.ts`
- [ ] `src/types/domain/restaurant.types.ts`
- [ ] 타입 테스트 작성

### Phase 3: API 서비스
- [ ] `src/utils/api-client.ts` + 테스트
- [ ] `src/utils/address-matcher.ts` + 테스트
- [ ] `src/services/hygiene-grade.service.ts` + 테스트
- [ ] `src/services/violation.service.ts` + 테스트

### Phase 4: MCP 도구
- [ ] `src/index.ts` (서버 설정)
- [ ] `src/tools/get-restaurant-hygiene.ts` + 테스트
- [ ] 정상 시나리오 테스트 (S-001 ~ S-003)
- [ ] 예외 시나리오 테스트 (E-001 ~ E-004)

### Phase 5: 마무리
- [ ] 통합 테스트
- [ ] 커버리지 90% 달성
- [ ] MCP Inspector로 수동 테스트
- [ ] 문서 업데이트

---

## 8. 위험 요소 및 대응

| 위험 | 가능성 | 영향 | 대응 |
|------|--------|------|------|
| API 호출 한도 초과 | 중 | 높음 | 테스트 시 목 사용, 프로덕션 캐싱 검토 |
| 업소명 매칭 실패 | 높음 | 중 | 퍼지 매칭 알고리즘 적용 |
| 주소 파싱 복잡성 | 중 | 중 | 단계적 매칭 (구 → 동 → 상세) |
| API 응답 구조 변경 | 낮음 | 높음 | 타입 가드, 방어적 파싱 |

---

## 9. 일정 (예상)

| Phase | 작업 | 예상 소요 |
|-------|------|-----------|
| 1 | 프로젝트 초기화 | - |
| 2 | 타입 정의 | - |
| 3 | API 서비스 구현 | - |
| 4 | MCP 도구 구현 | - |
| 5 | 테스트 및 마무리 | - |

---

## 변경 이력

| 버전 | 일자 | 내용 |
|------|------|------|
| 1.0 | 2025-01-06 | 최초 작성 |
