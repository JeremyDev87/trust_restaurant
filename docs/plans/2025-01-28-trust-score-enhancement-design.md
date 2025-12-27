# 신뢰도 점수 시스템 개선 설계

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** HACCP 인증 데이터를 추가하여 신뢰도 점수의 정확도 향상

**Architecture:** 공공데이터포털 HACCP API 연동 → 신뢰도 지표 추가 → 가중치 재조정

**Tech Stack:** TypeScript, Zod, 공공데이터포털 API

---

## 1. 현황 분석

### 현재 신뢰도 지표 (6개)
| 지표 | 가중치 | 데이터 소스 | 상태 |
|------|--------|-------------|------|
| 위생등급 | 25% | 식품안전나라 C004 | ✅ 활용 중 |
| 행정처분 | 20% | 식품안전나라 I2630 | ✅ 활용 중 |
| 영업기간 | 20% | - | ❌ 데이터 없음 |
| 평점 | 20% | - | ❌ API 없음 |
| 리뷰수 | 10% | - | ❌ API 없음 |
| 프랜차이즈 | 5% | 자체 감지 | ✅ 활용 중 |

### 문제점
- 6개 지표 중 3개(영업기간, 평점, 리뷰수)가 null/0으로 계산됨
- 실제로는 3개 지표(50%)만 유효하게 작동

---

## 2. 개선안

### 추가할 데이터 소스

#### HACCP 인증업체 API
- **URL:** `https://apis.data.go.kr/B553748/CertCompanyListService2/getCertCompanyListService2`
- **인증:** `GOV_DATA_KEY` (.env)
- **검색:** 업체명(`company`) 파라미터로 조회
- **응답 필드:**
  - `appointno`: 인증번호
  - `company`: 업체명
  - `worksaddr`: 주소
  - `issuedate`: 인증일
  - `issueenddate`: 인증 만료일

### 개선된 지표 구조 (5개)
| 지표 | 가중치 | 데이터 소스 | 점수 산정 |
|------|--------|-------------|----------|
| 위생등급 | 35% | C004 | AAA=100, AA=80, A=60, 없음=40 |
| 행정처분 | 30% | I2630 | 0건=100, 1건=60, 2건+=20 |
| HACCP인증 | 20% | 공공데이터포털 | 인증=100, 미인증=40 |
| 프랜차이즈 | 10% | 자체 감지 | 프랜차이즈=70, 개인=50 |
| 영업상태 | 5% | LOCALDATA (향후) | 정상=100, 휴업=50 |

### 가중치 변경 이유
- 데이터 확보 가능한 지표에 집중
- 위생 관련 지표(위생등급+행정처분+HACCP) = 85%로 핵심화
- 평점/리뷰는 공식 API 없으므로 제거

---

## 3. 구현 계획

### Phase 1: HACCP API 연동
1. `src/types/api/gov-data/haccp.types.ts` - API 타입 정의
2. `src/utils/gov-data-client.ts` - 공공데이터포털 API 클라이언트
3. `src/services/haccp.service.ts` - HACCP 조회 서비스
4. `src/services/haccp.service.test.ts` - 테스트

### Phase 2: 신뢰도 점수 개선
1. `src/types/trust-score.types.ts` - 지표 추가 (haccp)
2. `src/services/trust-score.service.ts` - 계산 로직 수정
3. `src/application/restaurant-hygiene.usecase.ts` - HACCP 조회 통합

### Phase 3: 검증
1. 기존 테스트 통과 확인
2. HACCP 인증 업체 조회 테스트
3. 신뢰도 점수 계산 검증

---

## 4. API 호출 예시

### 요청
```
GET https://apis.data.go.kr/B553748/CertCompanyListService2/getCertCompanyListService2
  ?ServiceKey={GOV_DATA_KEY}
  &company=스타벅스
  &returnType=json
  &numOfRows=10
```

### 응답
```json
{
  "header": {
    "resultCode": "00",
    "resultMessage": "NORMAL SERVICE"
  },
  "body": {
    "totalCount": "5",
    "items": {
      "item": [
        {
          "appointno": "2020-6-0001",
          "company": "스타벅스코리아",
          "worksaddr": "서울특별시 중구...",
          "issuedate": "2020-01-15",
          "issueenddate": "2025-01-14"
        }
      ]
    }
  }
}
```

---

## 5. 파일 구조

```
src/
├── types/
│   ├── api/
│   │   └── gov-data/
│   │       ├── haccp.types.ts      # 신규
│   │       └── index.ts            # 신규
│   └── trust-score.types.ts        # 수정
├── utils/
│   └── gov-data-client.ts          # 신규
├── services/
│   ├── haccp.service.ts            # 신규
│   ├── haccp.service.test.ts       # 신규
│   └── trust-score.service.ts      # 수정
└── application/
    └── restaurant-hygiene.usecase.ts  # 수정
```

---

## 6. 환경 변수

```env
# 기존
FOOD_API_KEY=...
KAKAO_REST_API_KEY=...

# 신규
GOV_DATA_KEY=...  # 공공데이터포털 인증키
```
