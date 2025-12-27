/**
 * 식당 종합 정보 타입 정의
 *
 * 여러 데이터 소스(카카오, 네이버, 식약처)를 통합한 식당 정보
 */

import type { PriceRange } from './naver-place.types.js';

/**
 * 위생등급 타입 (종합 정보용)
 */
export type IntelligenceHygieneGrade = 'AAA' | 'AA' | 'A' | null;

/**
 * 위생 정보
 */
export interface HygieneInfo {
  /** 위생등급 (AAA, AA, A, null) */
  grade: IntelligenceHygieneGrade;
  /** 등급 레이블 (매우 우수, 우수, 좋음) */
  gradeLabel: string | null;
  /** 별점 (0-3) */
  stars: number;
  /** 행정처분 유무 */
  hasViolations: boolean;
  /** 행정처분 건수 */
  violationCount: number;
}

/**
 * 플랫폼별 평점 정보
 */
export interface PlatformRating {
  /** 평점 (0-5, null이면 없음) */
  score: number | null;
  /** 리뷰 수 */
  reviews: number;
}

/**
 * 통합 평점 정보
 */
export interface RatingsInfo {
  /** 카카오 평점 */
  kakao: PlatformRating | null;
  /** 네이버 평점 */
  naver: PlatformRating | null;
  /** 가중 평균 점수 (데이터 있을 때만) */
  combined: number | null;
}

/**
 * 점수 정보
 */
export interface ScoresInfo {
  /** 위생 점수 (0-100) */
  hygiene: number;
  /** 인기도 점수 (0-100) */
  popularity: number;
  /** 종합 점수 (0-100) */
  overall: number;
}

/**
 * 식당 종합 정보
 */
export interface RestaurantIntelligence {
  // 기본 정보
  /** 식당명 */
  name: string;
  /** 주소 */
  address: string;
  /** 카테고리 */
  category: string;
  /** 전화번호 */
  phone?: string;
  /** 장소 URL (카카오맵) */
  placeUrl?: string;

  // 위생 정보 (식약처)
  /** 위생 정보 */
  hygiene: HygieneInfo;

  // 평점 정보 (카카오 + 네이버)
  /** 평점 정보 */
  ratings: RatingsInfo;

  // 부가 정보
  /** 가격대 */
  priceRange: PriceRange;
  /** 영업시간 */
  businessHours: string | null;

  // 통합 점수 (0-100)
  /** 점수 정보 */
  scores: ScoresInfo;
}
