# Vercel HTTPS 배포 설계

## 1. 개요

| 항목 | 내용 |
|------|------|
| 목적 | Clean Plate MCP 서버를 Vercel로 배포하여 HTTPS로 제공 |
| 대상 클라이언트 | Claude Desktop/Code + 커스텀 웹 앱 |
| 인증 | 공개 API (Rate Limit만 적용) |

## 2. 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Edge/Serverless               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐     ┌─────────────────────────┐   │
│  │ /api/mcp        │     │ /api/restaurant-hygiene │   │
│  │ (SSE Transport) │     │ (REST API)              │   │
│  └────────┬────────┘     └───────────┬─────────────┘   │
│           │                          │                  │
│           └──────────┬───────────────┘                  │
│                      ▼                                  │
│           ┌─────────────────────┐                       │
│           │   Core Service      │                       │
│           │ (공통 비즈니스 로직)  │                       │
│           └──────────┬──────────┘                       │
│                      ▼                                  │
│           ┌─────────────────────┐                       │
│           │  Food Safety API    │                       │
│           │  (식약처 공공데이터)  │                       │
│           └─────────────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

### 엔드포인트 구성

| 엔드포인트 | 용도 | Transport |
|-----------|------|-----------|
| `/api/mcp` | Claude Desktop/Code | MCP SSE |
| `/api/restaurant-hygiene` | 커스텀 웹 앱 | REST API |

## 3. API 명세

### 3.1 REST API

#### `POST /api/restaurant-hygiene`

**Request:**
```json
{
  "restaurant_name": "스타벅스",
  "region": "강남구",
  "include_history": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "restaurant": {
      "name": "스타벅스 선릉로점",
      "address": "서울특별시 강남구 선릉로93길 22",
      "business_type": "휴게음식점"
    },
    "hygiene_grade": {
      "has_grade": true,
      "grade": "AAA",
      "grade_label": "매우 우수",
      "grade_date": "2024-08-10",
      "valid_until": "2026-08-09",
      "stars": 3
    },
    "violations": {
      "total_count": 0,
      "recent_items": [],
      "has_more": false
    }
  },
  "summary": "🏆 위생등급: ★★★ 매우 우수 (AAA)\n✅ 행정처분: 최근 3년간 처분 이력이 없습니다."
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "해당 식당을 찾을 수 없습니다."
  }
}
```

**Response (429 Too Many Requests):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "요청 한도 초과. 잠시 후 다시 시도해주세요."
  }
}
```

### 3.2 MCP SSE Endpoint

#### `GET /api/mcp`
- SSE 연결 수립 (Claude 클라이언트용)

#### `POST /api/mcp`
- JSON-RPC 메시지 전송
- 기존 `get_restaurant_hygiene` 도구 지원

### 3.3 Rate Limiting

| 제한 | 값 |
|------|-----|
| 요청/분 | 60회 |
| 요청/일 | 1,000회 |

## 4. 파일 구조

```
trust_restaurant/
├── api/                              # Vercel Serverless Functions
│   ├── mcp.ts                        # MCP SSE 엔드포인트
│   └── restaurant-hygiene.ts         # REST API 엔드포인트
├── src/
│   ├── core/                         # 공통 비즈니스 로직 (신규)
│   │   └── restaurant-hygiene.core.ts
│   ├── services/                     # 기존 서비스 (재사용)
│   │   ├── hygiene-grade.service.ts
│   │   └── violation.service.ts
│   ├── formatters/                   # 기존 포맷터 (재사용)
│   │   ├── summary-formatter.ts
│   │   └── term-converter.ts
│   ├── utils/                        # 기존 유틸리티 (재사용)
│   │   ├── api-client.ts
│   │   └── address-matcher.ts
│   └── index.ts                      # 기존 CLI용 (유지)
├── vercel.json                       # Vercel 설정
├── package.json                      # scripts 수정
└── .env                              # 로컬 개발용
```

## 5. 구현 계획

### Phase 1: 코어 서비스 추출
1. `src/index.ts`의 비즈니스 로직을 `src/core/restaurant-hygiene.core.ts`로 추출
2. 재사용 가능한 함수로 리팩토링
3. 기존 테스트 유지

### Phase 2: REST API 구현
1. `api/restaurant-hygiene.ts` 생성
2. 입력 검증 (Zod 사용)
3. 에러 핸들링
4. CORS 설정

### Phase 3: MCP SSE 엔드포인트 구현
1. `api/mcp.ts` 생성
2. SSEServerTransport 설정
3. 기존 MCP 도구 연결

### Phase 4: Vercel 설정 및 배포
1. `vercel.json` 생성
2. 환경변수 설정
3. 프리뷰 배포 및 테스트
4. 프로덕션 배포

## 6. Vercel 설정

### vercel.json
```json
{
  "buildCommand": "npm run build:vercel",
  "functions": {
    "api/*.ts": {
      "runtime": "@vercel/node@3"
    }
  }
}
```

### 환경변수
| 변수 | 설명 |
|------|------|
| `FOOD_API_KEY` | 식약처 공공데이터 API 키 |

## 7. 배포 절차

```bash
# 1. Vercel CLI 설치 (최초 1회)
npm i -g vercel

# 2. Vercel 로그인
vercel login

# 3. 프로젝트 연결
vercel link

# 4. 환경변수 설정
vercel env add FOOD_API_KEY

# 5. 프리뷰 배포
vercel

# 6. 프로덕션 배포
vercel --prod
```

## 8. 클라이언트 설정

### 웹 앱에서 사용

```javascript
const response = await fetch('https://your-app.vercel.app/api/restaurant-hygiene', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    restaurant_name: '스타벅스',
    region: '강남구'
  })
});

const result = await response.json();
console.log(result.summary);
```

### Claude Desktop에서 사용

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "clean-plate-remote": {
      "url": "https://your-app.vercel.app/api/mcp"
    }
  }
}
```

## 9. 테스트

### REST API 테스트
```bash
curl -X POST https://your-app.vercel.app/api/restaurant-hygiene \
  -H "Content-Type: application/json" \
  -d '{"restaurant_name":"스타벅스","region":"강남구"}'
```

### MCP 연결 테스트
Claude Desktop 재시작 후 도구 목록에서 `get_restaurant_hygiene` 확인

## 10. 체크리스트

### 구현
- [ ] `src/core/restaurant-hygiene.core.ts` 생성
- [ ] `api/restaurant-hygiene.ts` 생성
- [ ] `api/mcp.ts` 생성
- [ ] `vercel.json` 생성
- [ ] `package.json` 스크립트 수정

### 테스트
- [ ] 로컬 테스트 통과
- [ ] Vercel 프리뷰 배포 테스트
- [ ] REST API 응답 확인
- [ ] MCP SSE 연결 확인

### 배포
- [ ] 환경변수 설정
- [ ] 프로덕션 배포
- [ ] Claude Desktop 연결 테스트
