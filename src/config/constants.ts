/**
 * 식약처 API 관련 상수
 */
export const API_CONFIG = {
  BASE_URL: 'http://openapi.foodsafetykorea.go.kr/api',
  TIMEOUT: 10000,
  MAX_RESULTS: 100,
} as const;

/**
 * 카카오맵 API 관련 상수
 */
export const KAKAO_API_CONFIG = {
  BASE_URL: 'https://dapi.kakao.com/v2/local/search/keyword.json',
  TIMEOUT: 5000,
  MAX_RESULTS: 5,
  /** 식당 검색 시 페이지당 결과 수 */
  SEARCH_PAGE_SIZE: 5,
  /** 지역 검색 시 페이지당 결과 수 */
  AREA_PAGE_SIZE: 15,
  /** 지역 검색 최대 페이지 수 */
  MAX_PAGES: 3,
  CATEGORIES: {
    RESTAURANT: 'FD6',
    CAFE: 'CE7',
  },
} as const;

/**
 * 서비스 ID
 */
export const SERVICE_IDS = {
  HYGIENE_GRADE: 'C004',
  VIOLATION_FOOD_SERVICE: 'I2630',
  VIOLATION_ALL: 'I0470',
} as const;

/**
 * 위생 등급 매핑
 */
export const HYGIENE_GRADE_MAP = {
  매우우수: { grade: 'AAA', label: '매우 우수', stars: 3 },
  우수: { grade: 'AA', label: '우수', stars: 2 },
  좋음: { grade: 'A', label: '좋음', stars: 1 },
} as const;

/**
 * 에러 메시지
 */
export const ERROR_MESSAGES = {
  NOT_FOUND:
    '해당 조건으로 식당을 찾을 수 없습니다. 식당명이나 지역을 다시 확인해주세요.',
  API_ERROR:
    '현재 식약처 데이터를 조회할 수 없습니다. 잠시 후 다시 시도해주세요.',
  KAKAO_API_ERROR: '카카오맵 검색에 실패했습니다. 잠시 후 다시 시도해주세요.',
  KAKAO_NOT_FOUND:
    '해당 지역에서 식당을 찾을 수 없습니다. 식당명이나 지역을 다시 확인해주세요.',
  MISSING_RESTAURANT_NAME: '식당 이름을 알려주세요.',
  MISSING_REGION: '어느 지역의 식당인지 알려주시겠어요?',
  HYGIENE_NOT_REGISTERED: '이 식당은 위생등급이 아직 등록되지 않았습니다.',
} as const;

/**
 * 행정처분 관련 상수
 */
export const VIOLATION_CONFIG = {
  MAX_RECENT_ITEMS: 3,
} as const;

/**
 * 일괄 조회 관련 상수
 */
export const BULK_CONFIG = {
  /** 배치당 식당 수 */
  BATCH_SIZE: 5,
  /** 배치 간 딜레이 (ms) - Rate Limit 방지 */
  BATCH_DELAY_MS: 100,
} as const;
