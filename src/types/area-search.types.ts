/**
 * 지역 기반 검색 타입 정의
 */

import type { RestaurantInfo } from './kakao-map.types.js';
import type {
  ViolationHistory,
  HygieneGrade,
} from './domain/restaurant.types.js';

/**
 * 위생등급 정보 (HygieneGrade의 별칭, 하위 호환성 유지)
 * @deprecated HygieneGrade를 직접 사용하세요
 */
export type HygieneGradeInfo = HygieneGrade;

/**
 * 지역 검색 상태
 */
export type AreaSearchStatus = 'ready' | 'too_many' | 'not_found';

/**
 * 지역 내 식당 검색 결과
 */
export interface AreaSearchResult {
  /** 검색 상태 */
  status: AreaSearchStatus;
  /** 총 검색 결과 수 */
  totalCount: number;
  /** 식당 목록 (status='ready'일 때) */
  restaurants: RestaurantInfo[];
  /** 지역 세분화 제안 (status='too_many'일 때) */
  suggestions?: string[];
  /** 상태 설명 메시지 */
  message: string;
}

/**
 * 위생정보 필터 타입
 */
export type HygieneFilter = 'all' | 'clean' | 'with_violations' | 'no_grade';

/**
 * 위생등급 업소 정보 (서비스에서 반환하는 형태)
 */
export interface HygieneGradeItem {
  name: string;
  address: string;
  licenseNo: string;
  businessType: string;
  hygieneGrade: HygieneGrade;
}

/**
 * 식당 위생정보 (일괄 조회용)
 */
export interface RestaurantHygieneInfo {
  /** 식당 기본 정보 */
  restaurant: RestaurantInfo;
  /** 위생등급 정보 */
  hygieneGrade?: HygieneGradeItem;
  /** 행정처분 이력 */
  violations?: ViolationHistory;
  /** 필터 매칭 이유 */
  matchReason: string;
}

/**
 * 일괄 위생정보 조회 결과
 */
export interface BulkHygieneResult {
  /** 조회 시도한 총 식당 수 */
  totalChecked: number;
  /** 필터 조건에 매칭된 식당 수 */
  matchedCount: number;
  /** 조회 결과 목록 */
  results: RestaurantHygieneInfo[];
}

/**
 * 지역 검색 MCP 도구 입력
 */
export interface SearchAreaRestaurantsInput {
  /** 지역명 (예: "강남구", "역삼역", "홍대입구") */
  area: string;
  /** 카테고리 필터 */
  category?: 'restaurant' | 'cafe' | 'all';
}

/**
 * 일괄 위생정보 조회 MCP 도구 입력
 */
export interface GetBulkHygieneInfoInput {
  /** 조회할 식당 목록 */
  restaurants: Array<{
    name: string;
    address: string;
  }>;
  /** 필터 옵션 */
  filter?: HygieneFilter;
  /** 반환할 최대 개수 */
  limit?: number;
}
