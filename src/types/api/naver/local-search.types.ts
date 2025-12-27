/**
 * Naver Local Search API 타입 정의
 *
 * 네이버 로컬 검색 API 응답 타입
 * @see https://developers.naver.com/docs/serviceapi/search/local/local.md
 */

/**
 * 네이버 로컬 검색 API 응답 아이템
 */
export interface NaverLocalSearchItem {
  /** 업체, 기관명 */
  title: string;
  /** 업체, 기관의 웹페이지 링크 */
  link: string;
  /** 카테고리 */
  category: string;
  /** 업체, 기관에 대한 설명 */
  description: string;
  /** 전화번호 */
  telephone: string;
  /** 지번 주소 */
  address: string;
  /** 도로명 주소 */
  roadAddress: string;
  /** X좌표 (KATECH) */
  mapx: string;
  /** Y좌표 (KATECH) */
  mapy: string;
}

/**
 * 네이버 로컬 검색 API 응답
 */
export interface NaverLocalSearchResponse {
  /** 검색 결과를 생성한 시간 */
  lastBuildDate: string;
  /** 총 검색 결과 수 */
  total: number;
  /** 검색 시작 위치 */
  start: number;
  /** 한 번에 표시할 검색 결과 수 */
  display: number;
  /** 검색 결과 목록 */
  items: NaverLocalSearchItem[];
}

/**
 * 네이버 로컬 검색 API 에러 응답
 */
export interface NaverApiErrorResponse {
  /** 에러 메시지 */
  errorMessage: string;
  /** 에러 코드 */
  errorCode: string;
}
