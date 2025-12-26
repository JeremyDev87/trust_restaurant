# API 연결 테스트 계획서

## 1. 개요

### 1.1 목적
식품안전나라 OpenAPI 3종에 대한 연결 및 데이터 수신 테스트를 통해 클린 플레이트 MCP 서비스 구현 가능성을 검증한다.

### 1.2 대상 API

| API ID | 서비스명 | 용도 | 기능 매핑 |
|--------|----------|------|-----------|
| C004 | 식품접객업소 위생등급 지정현황 | 위생 등급 조회 | F001 위생등급 |
| I2630 | 행정처분결과(식품접객업) | 식당 전용 처분 이력 | F001 행정처분 |
| I0470 | 행정처분결과 | 전체 식품업체 처분 이력 | F001 행정처분 (보조) |

### 1.3 API 공통 정보

**Base URL:**
```
http://openapi.foodsafetykorea.go.kr/api/{keyId}/{serviceId}/{dataType}/{startIdx}/{endIdx}
```

**인증:** `.env` 파일의 `food_api_key` 사용

**응답 형식:** JSON (xml도 지원)

---

## 2. API 상세 스펙

### 2.1 C004 - 식품접객업소 위생등급 지정현황

#### 설명
음식점 위생등급제에 따라 위생수준이 우수한 업소에 부여된 등급 정보 제공

#### 요청 파라미터

| 변수명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| keyId | STRING | Y | 발급된 인증키 |
| serviceId | STRING | Y | 서비스명 (C004) |
| dataType | STRING | Y | xml 또는 json |
| startIdx | STRING | Y | 요청 시작 위치 |
| endIdx | STRING | Y | 요청 종료 위치 |
| UPSO_NM | STRING | N | 업소명 |
| HG_ASGN_LV | STRING | N | 지정등급 (매우우수/우수/좋음) |
| LCNS_NO | STRING | N | 인허가번호 |

#### 응답 필드

| 필드명 | 설명 | 서비스 활용 |
|--------|------|-------------|
| BSSH_NM | 업소명 | 식당 이름 표시 |
| ADDR | 주소 | 지역 매칭, 주소 표시 |
| HG_ASGN_LV | 지정등급 | ★ 등급 표시 |
| HG_ASGN_NM | 지정기관 | 참고 정보 |
| ASGN_FROM | 지정시작일자 | 등급 유효성 확인 |
| TELNO | 업소전화번호 | 참고 정보 |
| WRKR_REG_NO | 사업자등록번호 | 업소 식별 |

#### 호출 예시
```
http://openapi.foodsafetykorea.go.kr/api/{keyId}/C004/json/1/5/UPSO_NM=마라탕
```

---

### 2.2 I2630 - 행정처분결과(식품접객업)

#### 설명
식품위생법 등 위반으로 행정처분을 받은 식품접객업(식당)에 대한 정보 제공

#### 요청 파라미터

| 변수명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| keyId | STRING | Y | 발급된 인증키 |
| serviceId | STRING | Y | 서비스명 (I2630) |
| dataType | STRING | Y | xml 또는 json |
| startIdx | STRING | Y | 요청 시작 위치 |
| endIdx | STRING | Y | 요청 종료 위치 |
| DSPS_DCSNDT | STRING | N | 처분확정일자 (YYYYMMDD) |
| LCNS_NO | STRING | N | 인허가번호 |

#### 응답 필드

| 필드명 | 설명 | 서비스 활용 |
|--------|------|-------------|
| PRCSCITYPOINT_BSSHNM | 업소명 | 식당 이름 매칭 |
| ADDR | 주소 | 지역 매칭 |
| INDUTY_CD_NM | 업종 | 업종 필터링 |
| DSPS_DCSNDT | 처분확정일자 | 날짜 표시 |
| DSPS_TYPECD_NM | 처분유형 | 처분 종류 표시 |
| DSPSCN | 처분내용 | 상세 내용 표시 |
| VILTCN | 위반일자및위반내용 | 위반 사유 표시 |
| DSPS_BGNDT | 처분시작일 | 영업정지 기간 |
| DSPS_ENDDT | 처분종료일 | 영업정지 기간 |
| PUBLIC_DT | 공개기한 | 데이터 유효성 |

#### 호출 예시
```
http://openapi.foodsafetykorea.go.kr/api/{keyId}/I2630/json/1/10
```

---

### 2.3 I0470 - 행정처분결과

#### 설명
식품위생법 등 위반으로 행정처분을 받은 전체 식품 관련 업체 정보 제공

#### 요청 파라미터
I2630과 동일

#### 응답 필드
I2630과 동일

#### 호출 예시
```
http://openapi.foodsafetykorea.go.kr/api/{keyId}/I0470/json/1/10
```

#### I2630 vs I0470 비교

| 구분 | I2630 | I0470 |
|------|-------|-------|
| 범위 | 식품접객업(식당) 전용 | 전체 식품업체 |
| 데이터량 | 상대적 적음 | 많음 |
| 활용 | 메인 조회 | 보조/백업 |

---

## 3. 테스트 계획

### 3.1 테스트 단계

| 단계 | 목적 | 성공 기준 |
|------|------|-----------|
| 1. 연결 테스트 | API 접근 가능 여부 확인 | HTTP 200 응답 |
| 2. 인증 테스트 | API 키 유효성 확인 | 인증 오류 없음 |
| 3. 기본 조회 | 데이터 수신 확인 | JSON 파싱 성공 |
| 4. 검색 테스트 | 파라미터 필터링 확인 | 필터된 결과 반환 |
| 5. 에러 핸들링 | 예외 상황 대응 확인 | 에러 메시지 파싱 |

### 3.2 테스트 케이스

#### TC-001: C004 기본 연결
```bash
# 요청
curl "http://openapi.foodsafetykorea.go.kr/api/${API_KEY}/C004/json/1/5"

# 예상 응답
{
  "C004": {
    "total_count": "...",
    "row": [...]
  }
}
```

#### TC-002: C004 업소명 검색
```bash
# 요청
curl "http://openapi.foodsafetykorea.go.kr/api/${API_KEY}/C004/json/1/10/UPSO_NM=마라탕"

# 검증
- 응답 내 BSSH_NM 필드에 "마라탕" 포함 여부
```

#### TC-003: C004 등급별 검색
```bash
# 요청
curl "http://openapi.foodsafetykorea.go.kr/api/${API_KEY}/C004/json/1/10/HG_ASGN_LV=매우우수"

# 검증
- 응답 내 HG_ASGN_LV 값이 모두 "매우우수"
```

#### TC-004: I2630 기본 연결
```bash
# 요청
curl "http://openapi.foodsafetykorea.go.kr/api/${API_KEY}/I2630/json/1/5"

# 예상 응답
{
  "I2630": {
    "total_count": "...",
    "row": [...]
  }
}
```

#### TC-005: I0470 기본 연결
```bash
# 요청
curl "http://openapi.foodsafetykorea.go.kr/api/${API_KEY}/I0470/json/1/5"

# 예상 응답
{
  "I0470": {
    "total_count": "...",
    "row": [...]
  }
}
```

#### TC-006: 잘못된 API 키
```bash
# 요청
curl "http://openapi.foodsafetykorea.go.kr/api/INVALID_KEY/C004/json/1/5"

# 검증
- 인증 오류 응답 확인
- 에러 메시지 파싱 가능 여부
```

#### TC-007: 검색 결과 없음
```bash
# 요청
curl "http://openapi.foodsafetykorea.go.kr/api/${API_KEY}/C004/json/1/10/UPSO_NM=존재하지않는식당명12345"

# 검증
- total_count: 0 또는 빈 row 배열
- 에러 없이 정상 응답
```

### 3.3 테스트 우선순위

| 우선순위 | API | 테스트 케이스 | 이유 |
|----------|-----|---------------|------|
| P0 | C004 | TC-001, TC-002 | 핵심 기능 (위생등급) |
| P0 | I2630 | TC-004 | 핵심 기능 (행정처분) |
| P1 | C004 | TC-003 | 등급 필터링 |
| P1 | I0470 | TC-005 | 보조 데이터 |
| P2 | 공통 | TC-006, TC-007 | 에러 처리 |

---

## 4. 테스트 환경

### 4.1 필수 환경
- Node.js 또는 curl
- `.env` 파일에 `food_api_key` 설정

### 4.2 환경 변수
```bash
# .env
food_api_key=YOUR_API_KEY
```

### 4.3 테스트 실행 방법

#### Option A: curl 직접 실행
```bash
export API_KEY=$(grep food_api_key .env | cut -d'=' -f2)
curl "http://openapi.foodsafetykorea.go.kr/api/${API_KEY}/C004/json/1/5"
```

#### Option B: 테스트 스크립트 (추후 작성)
```bash
npm run test:api
```

---

## 5. 예상 이슈 및 대응

| 이슈 | 가능성 | 대응 방안 |
|------|--------|-----------|
| API 호출 한도 초과 | 중 | 캐싱 전략 수립, 호출 최적화 |
| 업소명 검색 불일치 | 높음 | 퍼지 매칭, 복수 결과 처리 |
| 응답 지연 | 중 | 타임아웃 설정, 로딩 상태 표시 |
| 데이터 불일치 (I2630 vs I0470) | 낮음 | I2630 우선, I0470 보조 활용 |

---

## 6. 테스트 결과 (2025-01-06 실행)

### 6.1 테스트 결과 요약

| TC | API | 테스트명 | 결과 | 비고 |
|----|-----|----------|------|------|
| TC-001 | C004 | 기본 연결 | ✅ PASS | total_count: 42,223 |
| TC-002 | C004 | 업소명 검색 | ✅ PASS | "스타벅스" 검색 시 2,059건 |
| TC-004 | I2630 | 기본 연결 | ✅ PASS | total_count: 2,950 |
| TC-005 | I0470 | 기본 연결 | ✅ PASS | total_count: 2,835 |

### 6.2 데이터 현황

| API | 데이터 건수 | 설명 |
|-----|------------|------|
| C004 | 42,223건 | 위생등급 보유 업소 |
| I2630 | 2,950건 | 식품접객업 행정처분 |
| I0470 | 2,835건 | 전체 식품업체 행정처분 |

### 6.3 응답 샘플

#### C004 위생등급 응답 예시
```json
{
  "BSSH_NM": "스타벅스 선릉로점",
  "ADDR": "서울특별시 강남구 선릉로93길 22",
  "HG_ASGN_LV": "매우우수",
  "ASGN_FROM": "20240810",
  "ASGN_TO": "20260809",
  "INDUTY_NM": "휴게음식점"
}
```

#### I2630 행정처분 응답 예시
```json
{
  "PRCSCITYPOINT_BSSHNM": "야간비행",
  "ADDR": "경기도 화성시 동탄오산로 86-11",
  "INDUTY_CD_NM": "일반음식점",
  "DSPS_DCSNDT": "20251224",
  "DSPS_TYPECD_NM": "영업정지",
  "DSPS_BGNDT": "20260105",
  "DSPS_ENDDT": "20260107",
  "VILTCN": "청소년에게 주류를 제공하는 행위",
  "DSPSCN": "영업정지(기소유예처분으로 행정처분1/2감경)"
}
```

### 6.4 발견 사항

| 항목 | 내용 | 영향 |
|------|------|------|
| 업소명 필드 불일치 | C004: `BSSH_NM`, I2630: `PRCSCITYPOINT_BSSHNM` | 필드 매핑 필요 |
| I2630 > I0470 | 식품접객업 전용 API가 더 많은 데이터 보유 | I2630 메인 사용 권장 |
| 주소 검색 미지원 | ADDR 필드로 직접 검색 불가 | 전체 조회 후 클라이언트 필터링 필요 |

---

## 7. 다음 단계

1. ~~테스트 실행~~ ✅ 완료
2. ~~결과 기록~~ ✅ 완료
3. **타입 정의** - TypeScript 인터페이스 작성
4. **MCP 도구 구현** - 테스트 결과 기반 구현

---

## 변경 이력

| 버전 | 일자 | 작성자 | 내용 |
|------|------|--------|------|
| 1.0 | 2025-01-06 | - | 최초 작성 |
| 1.1 | 2025-01-06 | - | 테스트 결과 추가 |
