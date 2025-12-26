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

**입력 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `restaurant_name` | string | ✅ | 식당 상호명 |
| `region` | string | ✅ | 지역명 (시/구/동) |
| `include_history` | boolean | | 행정처분 이력 포함 (기본: true) |

**예시:**

```
"스타벅스 강남역점 위생등급 알려줘"
"종로구 본죽 위생정보 조회해줘"
```

**응답:**

```json
{
  "restaurant": {
    "name": "스타벅스 강남역점",
    "address": "서울 강남구 강남대로 396",
    "business_type": "휴게음식점",
    "category": "카페 > 커피전문점"
  },
  "hygiene_grade": {
    "has_grade": true,
    "grade": "AAA",
    "grade_label": "매우 우수",
    "stars": 3
  },
  "violations": {
    "total_count": 0,
    "recent_items": []
  }
}
```

### REST API

#### POST /api/restaurant-hygiene

```bash
curl -X POST https://your-server.com/api/restaurant-hygiene \
  -H "Content-Type: application/json" \
  -d '{"restaurant_name": "스타벅스", "region": "강남구"}'
```

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
│   ├── services/             # API 서비스
│   │   ├── hygiene-grade.service.ts
│   │   ├── violation.service.ts
│   │   └── kakao-map.service.ts
│   ├── modules/              # NestJS 모듈
│   │   ├── hygiene/          # REST API
│   │   └── mcp/              # MCP HTTP
│   ├── utils/                # 유틸리티
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
