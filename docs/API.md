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

특정 지역 내 식당과 카페를 탐색합니다. (확장된 필터/정렬 기능 포함)

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
    },
    "minRating": {
      "type": "number",
      "description": "최소 평점 필터 (0-5)",
      "minimum": 0,
      "maximum": 5
    },
    "hygieneGrade": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["AAA", "AA", "A"]
      },
      "description": "위생등급 필터 (예: [\"AAA\", \"AA\"])"
    },
    "sortBy": {
      "type": "string",
      "enum": ["rating", "hygiene", "reviews", "distance"],
      "description": "정렬 기준"
    }
  },
  "required": ["area"]
}
```

#### 출력 스키마

```json
{
  "status": "ready | too_many | not_found",
  "totalCount": "number",
  "summary": {
    "avgRating": "number | null",
    "withHygieneGrade": "number",
    "cleanRatio": "string (예: '53%')",
    "gradeDistribution": {
      "AAA": "number",
      "AA": "number",
      "A": "number"
    }
  },
  "restaurants": [
    {
      "name": "string",
      "address": "string",
      "roadAddress": "string",
      "category": "string",
      "phone": "string",
      "hygiene": {
        "grade": "AAA | AA | A | null",
        "stars": "number (0-3)",
        "hasViolations": "boolean"
      },
      "ratings": {
        "kakao": "number | null",
        "naver": "number | null",
        "combined": "number | null"
      },
      "priceRange": "low | medium | high | null",
      "businessHours": "string | null"
    }
  ],
  "suggestions": ["string (지역 세분화 제안, too_many일 때)"],
  "message": "string"
}
```

#### 입력 제한

| 필드 | 제한 |
|------|------|
| `area` | 최대 50자, 한글 필수, 특수문자 불가 |
| `minRating` | 0-5 범위 |
| `hygieneGrade` | AAA, AA, A 중 선택 |

#### 응답 상태

| 상태 | 설명 |
|------|------|
| `ready` | 조회 가능 (50개 이하) |
| `too_many` | 결과 과다 (50개 초과) - 더 구체적인 지역 입력 필요 |
| `not_found` | 검색 결과 없음 |

#### 예시 요청

```
"역삼동 식당 중 평점 4점 이상만 보여줘"
"강남역 위생등급 AAA 카페 찾아줘"
"홍대입구 식당 평점순 정렬해서 보여줘"
```

#### 예시 응답 (ready)

```json
{
  "status": "ready",
  "totalCount": 15,
  "summary": {
    "avgRating": 4.2,
    "withHygieneGrade": 8,
    "cleanRatio": "53%",
    "gradeDistribution": {
      "AAA": 3,
      "AA": 4,
      "A": 1
    }
  },
  "restaurants": [
    {
      "name": "스타벅스 역삼역점",
      "address": "서울 강남구 역삼동 123-45",
      "roadAddress": "서울 강남구 테헤란로 123",
      "category": "카페 > 커피전문점",
      "phone": "02-1234-5678",
      "hygiene": {
        "grade": "AAA",
        "stars": 3,
        "hasViolations": false
      },
      "ratings": {
        "kakao": 4.3,
        "naver": 4.5,
        "combined": 4.4
      },
      "priceRange": "medium",
      "businessHours": "07:00 - 22:00"
    }
  ],
  "message": "\"역삼동\" 지역에서 15개의 식당을 찾았습니다."
}
```

#### 예시 응답 (too_many)

```json
{
  "status": "too_many",
  "totalCount": 156,
  "restaurants": [],
  "suggestions": ["강남구 역삼동", "강남구 삼성동", "강남구 청담동"],
  "message": "\"강남구\"에서 156개의 식당/카페가 검색되었습니다."
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

### 도구: `recommend_restaurants`

조건 기반 스마트 식당 추천 기능을 제공합니다.

#### 입력 스키마

```json
{
  "type": "object",
  "properties": {
    "area": {
      "type": "string",
      "description": "지역명 (필수) - 구/동/역 이름"
    },
    "purpose": {
      "type": "string",
      "enum": ["회식", "데이트", "가족모임", "혼밥", "비즈니스미팅"],
      "description": "방문 목적"
    },
    "category": {
      "type": "string",
      "enum": ["한식", "중식", "일식", "양식", "카페", "전체"],
      "description": "음식 카테고리"
    },
    "priority": {
      "type": "string",
      "enum": ["hygiene", "rating", "balanced"],
      "description": "우선순위 모드 (hygiene: 위생, rating: 평점, balanced: 균형)",
      "default": "balanced"
    },
    "budget": {
      "type": "string",
      "enum": ["low", "medium", "high", "any"],
      "description": "예산 수준",
      "default": "any"
    },
    "limit": {
      "type": "number",
      "description": "반환할 추천 식당 수",
      "default": 5,
      "minimum": 1,
      "maximum": 10
    }
  },
  "required": ["area"]
}
```

#### 출력 스키마

```json
{
  "status": "success | no_results | area_too_broad",
  "area": "string",
  "filters": {
    "purpose": "string | undefined",
    "category": "string | undefined",
    "priority": "string",
    "budget": "string | undefined"
  },
  "totalCandidates": "number",
  "recommendations": [
    {
      "rank": "number",
      "name": "string",
      "address": "string",
      "category": "string",
      "hygiene": {
        "grade": "AAA | AA | A | null",
        "stars": "number (0-3)",
        "hasViolations": "boolean"
      },
      "rating": {
        "combined": "number | null",
        "reviewCount": "number"
      },
      "priceRange": "low | medium | high | null",
      "scores": {
        "total": "number (0-100)",
        "hygiene": "number",
        "rating": "number",
        "reviews": "number",
        "purpose": "number"
      },
      "highlights": ["string"]
    }
  ],
  "message": "string"
}
```

#### 예시 요청

```
"강남역 회식 장소 추천해줘"
"역삼동 데이트 코스 일식집 추천해줘"
"홍대 가성비 좋은 한식집 위생 우선으로 추천해줘"
```

#### 예시 응답

```json
{
  "status": "success",
  "area": "역삼동",
  "filters": {
    "purpose": "회식",
    "category": "한식",
    "priority": "balanced",
    "budget": "any"
  },
  "totalCandidates": 25,
  "recommendations": [
    {
      "rank": 1,
      "name": "본가 역삼점",
      "address": "서울 강남구 역삼동 123-45",
      "category": "한식 > 삼겹살",
      "hygiene": {
        "grade": "AAA",
        "stars": 3,
        "hasViolations": false
      },
      "rating": {
        "combined": 4.5,
        "reviewCount": 320
      },
      "priceRange": "medium",
      "scores": {
        "total": 85,
        "hygiene": 35,
        "rating": 32,
        "reviews": 8,
        "purpose": 10
      },
      "highlights": ["AAA 등급", "평점 4.5", "행정처분 없음", "리뷰 320개"]
    }
  ],
  "message": "\"역삼동\" 회식 추천 Top 5 (균형 모드)"
}
```

---

### 도구: `compare_restaurants`

여러 식당을 비교 분석하여 최적의 선택을 돕습니다.

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
          "name": {
            "type": "string",
            "description": "식당명"
          },
          "region": {
            "type": "string",
            "description": "지역명"
          }
        },
        "required": ["name", "region"]
      },
      "description": "비교할 식당 목록 (최소 2개, 최대 5개)",
      "minItems": 2,
      "maxItems": 5
    },
    "criteria": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["hygiene", "rating", "price", "reviews"]
      },
      "description": "비교 항목 선택 (1~4개)",
      "default": ["hygiene", "rating", "price", "reviews"]
    }
  },
  "required": ["restaurants"]
}
```

#### 출력 스키마

```json
{
  "status": "complete | partial",
  "message": "string",
  "found": ["string"],
  "notFound": ["string"],
  "comparison": {
    "restaurants": [
      {
        "name": "string",
        "address": "string",
        "hygiene": {
          "grade": "AAA | AA | A | null",
          "stars": "number",
          "hasViolations": "boolean"
        },
        "rating": {
          "kakao": "number | null",
          "naver": "number | null",
          "combined": "number | null",
          "reviewCount": "number"
        },
        "priceRange": "low | medium | high | null",
        "scores": {
          "hygiene": "number",
          "popularity": "number",
          "overall": "number"
        }
      }
    ],
    "analysis": {
      "bestHygiene": "string | null",
      "bestRating": "string | null",
      "bestValue": "string | null",
      "recommendation": "string"
    }
  }
}
```

#### 예시 요청

```
"스타벅스 강남역점, 투썸플레이스 역삼점, 이디야 테헤란로점 비교해줘"
"본죽 강남점과 죽이야기 역삼점 위생등급 비교해줘"
```

#### 예시 응답

```json
{
  "status": "complete",
  "message": "3개 식당 비교 완료",
  "found": ["스타벅스 강남역점", "투썸플레이스 역삼점", "이디야 테헤란로점"],
  "notFound": [],
  "comparison": {
    "restaurants": [
      {
        "name": "스타벅스 강남역점",
        "address": "서울 강남구 강남대로 396",
        "hygiene": {
          "grade": "AAA",
          "stars": 3,
          "hasViolations": false
        },
        "rating": {
          "kakao": 4.3,
          "naver": 4.5,
          "combined": 4.4,
          "reviewCount": 520
        },
        "priceRange": "medium",
        "scores": {
          "hygiene": 95,
          "popularity": 88,
          "overall": 91
        }
      },
      {
        "name": "투썸플레이스 역삼점",
        "address": "서울 강남구 역삼동 123",
        "hygiene": {
          "grade": "AA",
          "stars": 2,
          "hasViolations": false
        },
        "rating": {
          "kakao": 4.1,
          "naver": 4.2,
          "combined": 4.15,
          "reviewCount": 280
        },
        "priceRange": "medium",
        "scores": {
          "hygiene": 80,
          "popularity": 72,
          "overall": 76
        }
      },
      {
        "name": "이디야 테헤란로점",
        "address": "서울 강남구 테헤란로 100",
        "hygiene": {
          "grade": "A",
          "stars": 1,
          "hasViolations": false
        },
        "rating": {
          "kakao": 4.0,
          "naver": 4.1,
          "combined": 4.05,
          "reviewCount": 150
        },
        "priceRange": "low",
        "scores": {
          "hygiene": 65,
          "popularity": 60,
          "overall": 62
        }
      }
    ],
    "analysis": {
      "bestHygiene": "스타벅스 강남역점",
      "bestRating": "스타벅스 강남역점",
      "bestValue": "이디야 테헤란로점",
      "recommendation": "위생과 평점 모두 고려 시 \"스타벅스 강남역점\" 추천"
    }
  }
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
