/**
 * 식당 비교 분석 타입 정의
 *
 * 여러 식당을 비교 분석하기 위한 입력/출력 타입
 */

import type { IntelligenceHygieneGrade } from './restaurant-intelligence.types.js';
import type { PriceRange } from './naver-place.types.js';

/**
 * 비교 항목 타입
 */
export type ComparisonCriteria = 'hygiene' | 'rating' | 'price' | 'reviews';

/**
 * 비교할 식당 정보
 */
export interface RestaurantIdentifier {
  /** 식당명 */
  name: string;
  /** 지역명 */
  region: string;
}

/**
 * 식당 비교 입력 스키마
 */
export interface CompareRestaurantsInput {
  /** 비교할 식당 목록 (최소 2개, 최대 5개) */
  restaurants: RestaurantIdentifier[];
  /** 비교 항목 선택 (1~4개, 기본값: 전체) */
  criteria?: ComparisonCriteria[];
}

/**
 * 비교 대상 식당의 위생 정보
 */
export interface ComparedHygieneInfo {
  /** 위생등급 (AAA, AA, A, null) */
  grade: IntelligenceHygieneGrade;
  /** 별점 (0-3) */
  stars: number;
  /** 행정처분 유무 */
  hasViolations: boolean;
}

/**
 * 비교 대상 식당의 평점 정보
 */
export interface ComparedRatingInfo {
  /** 카카오 평점 */
  kakao: number | null;
  /** 네이버 평점 */
  naver: number | null;
  /** 통합 평점 */
  combined: number | null;
  /** 총 리뷰 수 */
  reviewCount: number;
}

/**
 * 비교 대상 식당의 점수 정보
 */
export interface ComparedScoresInfo {
  /** 위생 점수 (0-100) */
  hygiene: number;
  /** 인기도 점수 (0-100) */
  popularity: number;
  /** 종합 점수 (0-100) */
  overall: number;
}

/**
 * 비교 대상 식당 정보
 */
export interface ComparedRestaurant {
  /** 식당명 */
  name: string;
  /** 주소 */
  address: string;
  /** 위생 정보 */
  hygiene: ComparedHygieneInfo;
  /** 평점 정보 */
  rating: ComparedRatingInfo;
  /** 가격대 */
  priceRange: PriceRange;
  /** 점수 정보 */
  scores: ComparedScoresInfo;
}

/**
 * 비교 분석 결과
 */
export interface ComparisonAnalysis {
  /** 위생 최우수 식당명 */
  bestHygiene: string | null;
  /** 평점 최고 식당명 */
  bestRating: string | null;
  /** 가성비 최고 식당명 */
  bestValue: string | null;
  /** 종합 추천 메시지 */
  recommendation: string;
}

/**
 * 비교 결과
 */
export interface ComparisonResult {
  /** 비교 대상 식당 목록 */
  restaurants: ComparedRestaurant[];
  /** 분석 결과 */
  analysis: ComparisonAnalysis;
}

/**
 * 비교 결과 상태
 */
export type CompareStatus = 'complete' | 'partial';

/**
 * 식당 비교 결과 스키마
 */
export interface CompareRestaurantsResult {
  /** 결과 상태 (complete: 전체 검색됨, partial: 일부만 검색됨) */
  status: CompareStatus;
  /** 결과 메시지 */
  message: string;
  /** 찾은 식당 목록 */
  found: string[];
  /** 찾지 못한 식당 목록 */
  notFound: string[];
  /** 비교 결과 (2개 이상 찾은 경우에만 존재) */
  comparison: ComparisonResult | null;
}

/**
 * 비교 제약 조건
 */
export const COMPARE_CONSTRAINTS = {
  /** 최소 식당 수 */
  MIN_RESTAURANTS: 2,
  /** 최대 식당 수 */
  MAX_RESTAURANTS: 5,
  /** 최소 비교 항목 수 */
  MIN_CRITERIA: 1,
  /** 최대 비교 항목 수 */
  MAX_CRITERIA: 4,
} as const;

/**
 * 기본 비교 항목
 */
export const DEFAULT_CRITERIA: ComparisonCriteria[] = [
  'hygiene',
  'rating',
  'price',
  'reviews',
];
