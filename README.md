# Clean Plate MCP

식약처 공인 데이터 기반 식당 위생 정보 조회 MCP 서버

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)

## 개요

Clean Plate MCP는 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)를 지원하는 식당 위생 정보 조회 서버입니다. Claude Desktop, Claude Code 등 MCP 클라이언트에서 식당의 위생등급과 행정처분 이력을 조회할 수 있습니다.

### 주요 기능

- **위생등급 조회**: 식약처 공인 위생등급 (AAA/AA/A) 확인
- **행정처분 이력**: 최근 3년간 행정처분 내역 조회
- **카카오맵 연동**: 정확한 식당 검색을 위한 카카오맵 API 통합
- **다중 인터페이스**: MCP (stdio/HTTP) 및 REST API 지원
- **스마트 추천**: 목적, 카테고리, 우선순위 기반 맞춤형 식당 추천
- **식당 비교**: 여러 식당의 위생등급, 평점, 가성비 비교 분석
- **강화된 검색**: 평점/위생등급 필터 및 정렬 기능 지원

## 설치

### 요구 사항

- Node.js 18.0.0 이상
- npm 또는 yarn

### 로컬 설치

```bash
# 저장소 클론
git clone https://github.com/username/clean-plate-mcp.git
cd clean-plate-mcp

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일을 편집하여 API 키 입력

# 빌드
npm run build
```

## 환경변수 설정

`.env` 파일에 다음 환경변수를 설정하세요:

```env
# 식품안전나라 API 키 (필수)
# https://www.foodsafetykorea.go.kr/api/openApiInfo.do 에서 발급
FOOD_API_KEY=your_food_safety_api_key

# 카카오맵 API 키 (선택, 검색 정확도 향상)
# https://developers.kakao.com 에서 발급
KAKAO_API_KEY=your_kakao_api_key
```

## 사용법

### MCP 서버 (stdio)

Claude Desktop 또는 Claude Code에서 사용:

```bash
# 직접 실행
npm start

# 또는 npx로 실행
npx clean-plate-mcp
```

#### Claude Desktop 설정

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "clean-plate": {
      "command": "node",
      "args": ["/path/to/clean-plate-mcp/dist/index.js"],
      "env": {
        "FOOD_API_KEY": "your_api_key",
        "KAKAO_API_KEY": "your_kakao_key"
      }
    }
  }
}
```

### REST API 서버

```bash
# 개발 모드
npm run dev:server

# 프로덕션
npm run start:server
```

서버가 `http://localhost:3000`에서 실행됩니다.

### 원격 MCP (HTTP)

Vercel 등에 배포된 서버를 사용할 경우:

```json
{
  "mcpServers": {
    "clean-plate": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://your-server.com/api/mcp"]
    }
  }
}
```

## API

### MCP 도구

#### `get_restaurant_hygiene`

식당의 위생 정보를 조회합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `restaurant_name` | string | ✅ | 식당 상호명 (최대 100자) |
| `region` | string | ✅ | 지역명 (최대 50자, 한글 필수) |
| `include_history` | boolean | | 행정처분 이력 포함 (기본: true) |

```
"스타벅스 강남역점 위생등급 알려줘"
"종로구 본죽 위생정보 조회해줘"
```

#### `search_area_restaurants`

특정 지역 내 식당/카페를 탐색합니다. (확장된 필터/정렬 기능 포함)

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `area` | string | ✅ | 지역명 (구/동/역) |
| `category` | string | | `restaurant`, `cafe`, `all` (기본) |
| `minRating` | number | | 최소 평점 필터 (0-5) |
| `hygieneGrade` | array | | 위생등급 필터 (AAA, AA, A) |
| `sortBy` | string | | 정렬: `rating`, `hygiene`, `reviews`, `distance` |

```
"강남역 근처 식당 찾아줘"
"홍대 카페 목록 보여줘"
"역삼동 평점 4점 이상 AAA 등급 식당 찾아줘"
```

#### `get_bulk_hygiene_info`

여러 식당의 위생정보를 일괄 조회합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `restaurants` | array | ✅ | 식당 목록 (최대 50개) |
| `filter` | string | | `all`, `clean`, `with_violations`, `no_grade` |
| `limit` | number | | 반환 개수 (기본 10, 최대 100) |

```
"검색된 식당 중 깨끗한 곳만 알려줘"
```

#### `recommend_restaurants`

조건 기반 스마트 식당 추천 기능을 제공합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `area` | string | ✅ | 지역명 (구/동/역) |
| `purpose` | string | | 목적: `회식`, `데이트`, `가족모임`, `혼밥`, `비즈니스미팅` |
| `category` | string | | 카테고리: `한식`, `중식`, `일식`, `양식`, `카페`, `전체` |
| `priority` | string | | 우선순위: `hygiene`, `rating`, `balanced` (기본) |
| `budget` | string | | 예산: `low`, `medium`, `high`, `any` (기본) |
| `limit` | number | | 반환 개수 (기본 5, 최대 10) |

```
"강남역 회식 장소 추천해줘"
"역삼동 데이트 일식집 위생 우선으로 추천해줘"
```

#### `compare_restaurants`

여러 식당을 비교 분석합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `restaurants` | array | ✅ | 비교할 식당 목록 (2-5개) |
| `criteria` | array | | 비교 항목: `hygiene`, `rating`, `price`, `reviews` |

```
"스타벅스 강남점과 투썸 역삼점 비교해줘"
"본죽, 죽이야기, 본죽&비빔밥 위생등급 비교해줘"
```

### REST API

#### POST /api/restaurant-hygiene

```bash
curl -X POST https://your-server.com/api/restaurant-hygiene \
  -H "Content-Type: application/json" \
  -d '{"restaurant_name": "스타벅스", "region": "강남구"}'
```

자세한 API 문서는 [docs/API.md](docs/API.md)를 참조하세요.

## 개발

```bash
# 개발 모드 (MCP stdio)
npm run dev

# 개발 모드 (REST 서버)
npm run dev:server

# 테스트
npm test

# 테스트 (단일 실행)
npm run test:run

# 테스트 커버리지
npm run test:coverage

# 린트
npm run lint

# 타입 체크
npm run typecheck
```

## 프로젝트 구조

```
clean-plate-mcp/
├── src/
│   ├── index.ts              # MCP stdio 서버 진입점
│   ├── main.ts               # NestJS 서버 진입점
│   ├── core/                 # 비즈니스 로직
│   │   └── restaurant-hygiene.core.ts
│   ├── services/             # API 서비스
│   │   ├── hygiene-grade.service.ts
│   │   ├── violation.service.ts
│   │   ├── kakao-map.service.ts
│   │   ├── cache.service.ts
│   │   └── bulk-hygiene.service.ts
│   ├── modules/              # NestJS 모듈
│   │   ├── hygiene/          # REST API
│   │   └── mcp/              # MCP HTTP
│   ├── providers/            # NestJS DI 프로바이더
│   ├── utils/                # 유틸리티
│   │   ├── validation.ts     # 입력 검증
│   │   ├── api-client.ts     # API 클라이언트
│   │   └── address-matcher.ts
│   ├── types/                # 타입 정의
│   └── config/               # 설정
├── tests/                    # 통합 테스트
├── api/                      # Vercel 서버리스
└── docs/                     # 문서
```

## 데이터 출처

- **위생등급**: [식품안전나라 OpenAPI](https://www.foodsafetykorea.go.kr/api/openApiInfo.do) (C004)
- **행정처분**: [식품안전나라 OpenAPI](https://www.foodsafetykorea.go.kr/api/openApiInfo.do) (I2630)
- **식당 검색**: [카카오 로컬 API](https://developers.kakao.com/docs/latest/ko/local/dev-guide)

## 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE)를 따릅니다.

## 기여

기여를 환영합니다! [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.
