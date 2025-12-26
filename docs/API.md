# Clean Plate MCP API 문서

## 개요

Clean Plate MCP는 두 가지 인터페이스를 제공합니다:

1. **MCP (Model Context Protocol)**: Claude Desktop, Claude Code 등 AI 클라이언트용
2. **REST API**: 웹 애플리케이션 통합용

---

## MCP 인터페이스

### 도구: `get_restaurant_hygiene`

식당의 위생등급과 행정처분 이력을 조회합니다.

#### 입력 스키마

```json
{
  "type": "object",
  "properties": {
    "restaurant_name": {
      "type": "string",
      "description": "식당/음식점/카페 상호명 (예: 스타벅스, 맥도날드, 본죽)"
    },
    "region": {
      "type": "string",
      "description": "지역명 - 시/구/동/역 이름 (예: 강남구, 역삼동, 역삼역)"
    },
    "include_history": {
      "type": "boolean",
      "description": "행정처분 이력 포함 여부",
      "default": true
    }
  },
  "required": ["restaurant_name", "region"]
}
```

#### 출력 스키마

```json
{
  "restaurant": {
    "name": "string",
    "address": "string",
    "business_type": "string",
    "phone": "string (optional)",
    "category": "string (optional)"
  },
  "hygiene_grade": {
    "has_grade": "boolean",
    "grade": "string | null (AAA, AA, A)",
    "grade_label": "string | null (매우 우수, 우수, 좋음)",
    "grade_date": "string | null (YYYY-MM-DD)",
    "valid_until": "string | null (YYYY-MM-DD)",
    "stars": "number (0-3)"
  },
  "violations": {
    "total_count": "number",
    "recent_items": [
      {
        "date": "string (YYYY-MM-DD)",
        "type": "string",
        "content": "string",
        "reason": "string"
      }
    ],
    "has_more": "boolean"
  }
}
```

#### 입력 제한

| 필드 | 제한 |
|------|------|
| `restaurant_name` | 최대 100자, 특수문자 불가 (`< > ' " \` ;`) |
| `region` | 최대 50자, 한글 필수, 특수문자 불가 |

#### 예시 요청

```
"스타벅스 강남역점 위생등급 알려줘"
"종로구 본죽 위생정보 조회해줘"
"역삼동 맥도날드 행정처분 이력 확인해줘"
```

#### 예시 응답

**성공 (위생등급 있음)**:
```json
{
  "restaurant": {
    "name": "스타벅스 강남역점",
    "address": "서울 강남구 강남대로 396",
    "business_type": "휴게음식점",
    "category": "음식점 > 카페 > 커피전문점"
  },
  "hygiene_grade": {
    "has_grade": true,
    "grade": "AAA",
    "grade_label": "매우 우수",
    "grade_date": "2024-01-15",
    "valid_until": "2026-01-14",
    "stars": 3
  },
  "violations": {
    "total_count": 0,
    "recent_items": [],
    "has_more": false
  }
}
```

**성공 (위생등급 없음)**:
```json
{
  "restaurant": {
    "name": "동네분식",
    "address": "서울 강남구 역삼동 123-45",
    "business_type": "일반음식점"
  },
  "hygiene_grade": {
    "has_grade": false,
    "grade": null,
    "grade_label": null,
    "grade_date": null,
    "valid_until": null,
    "stars": 0
  },
  "violations": {
    "total_count": 0,
    "recent_items": [],
    "has_more": false
  }
}
```

---

### 도구: `search_area_restaurants`

특정 지역 내 식당과 카페를 탐색합니다.

#### 입력 스키마

```json
{
  "type": "object",
  "properties": {
    "area": {
      "type": "string",
      "description": "지역명 - 구/동/역/장소 이름 (예: 강남구, 역삼동, 역삼역)"
    },
    "category": {
      "type": "string",
      "enum": ["restaurant", "cafe", "all"],
      "description": "카테고리 필터",
      "default": "all"
    }
  },
  "required": ["area"]
}
```

#### 입력 제한

| 필드 | 제한 |
|------|------|
| `area` | 최대 50자, 한글 필수, 특수문자 불가 |

#### 응답 상태

| 상태 | 설명 |
|------|------|
| `ready` | 조회 가능 (50개 이하) |
| `too_many` | 결과 과다 (50개 초과) - 더 구체적인 지역 입력 필요 |
| `not_found` | 검색 결과 없음 |

#### 예시 응답 (too_many)

```json
{
  "status": "too_many",
  "total_count": 156,
  "message": "\"강남구\"에서 156개의 식당/카페가 검색되었습니다.",
  "suggestions": ["강남구 역삼동", "강남구 삼성동", "강남구 청담동"]
}
```

---

### 도구: `get_bulk_hygiene_info`

여러 식당의 위생정보를 일괄 조회하고 필터링합니다.

#### 입력 스키마

```json
{
  "type": "object",
  "properties": {
    "restaurants": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "address": { "type": "string" }
        }
      },
      "description": "조회할 식당 목록"
    },
    "filter": {
      "type": "string",
      "enum": ["all", "clean", "with_violations", "no_grade"],
      "description": "필터 옵션",
      "default": "all"
    },
    "limit": {
      "type": "number",
      "description": "반환할 최대 식당 수",
      "default": 10
    }
  },
  "required": ["restaurants"]
}
```

#### 입력 제한

| 필드 | 제한 |
|------|------|
| `restaurants` | 최대 50개 |
| `restaurants[].name` | 최대 100자, 특수문자 불가 |
| `restaurants[].address` | 최대 200자, 특수문자 불가 |
| `limit` | 1-100 |

#### 필터 옵션

| 필터 | 설명 |
|------|------|
| `all` | 모든 식당 |
| `clean` | 깨끗한 식당 (AAA/AA 등급 + 행정처분 없음) |
| `with_violations` | 행정처분 이력이 있는 식당 |
| `no_grade` | 위생등급 미등록 식당 |

#### 예시 응답

```json
{
  "total_checked": 10,
  "matched_count": 3,
  "results": [
    {
      "restaurant": { "name": "스타벅스", "address": "..." },
      "hygieneGrade": { "hygieneGrade": { "grade": "AAA", ... } },
      "violations": { "total_count": 0 },
      "matchReason": "exact"
    }
  ]
}
```

---

## REST API

### 기본 URL

- 로컬: `http://localhost:3000`
- 프로덕션: `https://your-server.com`

### 엔드포인트

#### POST /api/restaurant-hygiene

식당 위생 정보를 조회합니다.

**요청**:
```bash
curl -X POST https://your-server.com/api/restaurant-hygiene \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_name": "스타벅스",
    "region": "강남구",
    "include_history": true
  }'
```

**성공 응답** (200):
```json
{
  "success": true,
  "data": {
    "restaurant": { ... },
    "hygiene_grade": { ... },
    "violations": { ... }
  },
  "summary": "⭐⭐⭐ 위생등급: 매우 우수 (AAA)\n✅ 행정처분: 최근 3년간 처분 이력이 없습니다."
}
```

**에러 응답** (404 - 복수 결과):
```json
{
  "success": false,
  "error": {
    "code": "MULTIPLE_RESULTS",
    "message": "\"스타벅스\" (강남구)에 해당하는 식당이 5곳 있습니다.",
    "candidates": [
      {
        "name": "스타벅스 강남R점",
        "address": "서울 강남구 강남대로 390",
        "category": "음식점 > 카페 > 커피전문점"
      }
    ]
  }
}
```

**에러 응답** (404 - 검색 결과 없음):
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "\"없는식당\" (강남구)에 해당하는 식당을 찾을 수 없습니다."
  }
}
```

---

## 에러 코드

| 코드 | HTTP | 설명 |
|------|------|------|
| `INVALID_REQUEST` | 400 | 잘못된 입력 (누락, 형식 오류, 제한 초과) |
| `NOT_FOUND` | 404 | 식당을 찾을 수 없음 |
| `MULTIPLE_RESULTS` | 404 | 복수의 식당이 검색됨 (더 구체적인 검색 필요) |
| `API_ERROR` | 500 | 식약처 API 오류 |
| `KAKAO_API_ERROR` | 500 | 카카오맵 API 오류 |
| `UNKNOWN_ERROR` | 500 | 알 수 없는 오류 |

### INVALID_REQUEST 상세

입력 검증 실패 시 상세 정보가 포함됩니다:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "지역명에 한글을 포함해주세요",
    "details": [
      { "field": "region", "message": "지역명에 한글을 포함해주세요" }
    ]
  }
}
```

---

## 위생등급 정보

| 등급 | 코드 | 라벨 | 별점 |
|------|------|------|------|
| 매우 우수 | AAA | 매우 우수 | ⭐⭐⭐ (3) |
| 우수 | AA | 우수 | ⭐⭐ (2) |
| 좋음 | A | 좋음 | ⭐ (1) |
| 미등록 | - | - | (0) |

---

## 데이터 출처

- **위생등급**: 식품안전나라 OpenAPI (C004)
- **행정처분**: 식품안전나라 OpenAPI (I2630)
- **식당 검색**: 카카오 로컬 API (선택)
