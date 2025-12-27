/**
 * 식당 추천 타입 정의
 *
 * 조건 기반 스마트 추천 도구를 위한 입력/출력 타입
 */

import type { IntelligenceHygieneGrade } from './restaurant-intelligence.types.js';
import type { PriceRange } from './naver-place.types.js';

/**
 * 추천 목적
 */
export type RecommendPurpose =
  | '회식'
  | '데이트'
  | '가족모임'
  | '혼밥'
  | '비즈니스미팅';

/**
 * 카테고리 필터
 */
export type RecommendCategory =
  | '한식'
  | '중식'
  | '일식'
  | '양식'
  | '카페'
  | '전체';

/**
 * 추천 우선순위 모드
 */
export type RecommendPriority = 'hygiene' | 'rating' | 'balanced';

/**
 * 예산 수준
 */
export type RecommendBudget = 'low' | 'medium' | 'high' | 'any';

/**
 * 식당 추천 입력 스키마
 */
export interface RecommendRestaurantsInput {
  /** 지역명 (필수) */
  area: string;
  /** 목적 (회식, 데이트, 가족모임, 혼밥, 비즈니스미팅) */
  purpose?: RecommendPurpose;
  /** 카테고리 (한식, 중식, 일식, 양식, 카페, 전체) */
  category?: RecommendCategory;
  /** 우선순위 (hygiene: 위생, rating: 평점, balanced: 균형) */
  priority?: RecommendPriority;
  /** 예산 (low, medium, high, any) */
  budget?: RecommendBudget;
  /** 반환 개수 (기본 5, 최대 10) */
  limit?: number;
}

/**
 * 추천 결과 상태
 */
export type RecommendStatus = 'success' | 'no_results' | 'area_too_broad';

/**
 * 적용된 필터 정보
 */
export interface RecommendFilters {
  /** 목적 */
  purpose?: string;
  /** 카테고리 */
  category?: string;
  /** 우선순위 모드 */
  priority: string;
  /** 예산 */
  budget?: string;
}

/**
 * 추천 식당의 위생 정보
 */
export interface RecommendHygieneInfo {
  /** 위생등급 (AAA, AA, A, null) */
  grade: IntelligenceHygieneGrade;
  /** 별점 (0-3) */
  stars: number;
  /** 행정처분 유무 */
  hasViolations: boolean;
}

/**
 * 추천 식당의 평점 정보
 */
export interface RecommendRatingInfo {
  /** 통합 평점 */
  combined: number | null;
  /** 총 리뷰 수 */
  reviewCount: number;
}

/**
 * 추천 점수 정보
 */
export interface RecommendScores {
  /** 최종 추천 점수 (0-100) */
  total: number;
  /** 위생 점수 기여분 */
  hygiene: number;
  /** 평점 점수 기여분 */
  rating: number;
  /** 리뷰 수 점수 기여분 */
  reviews: number;
  /** 목적 적합도 기여분 */
  purpose: number;
}

/**
 * 추천 식당 정보
 */
export interface RecommendedRestaurant {
  /** 순위 */
  rank: number;
  /** 식당명 */
  name: string;
  /** 주소 */
  address: string;
  /** 카테고리 */
  category: string;
  /** 위생 정보 */
  hygiene: RecommendHygieneInfo;
  /** 평점 정보 */
  rating: RecommendRatingInfo;
  /** 가격대 */
  priceRange: PriceRange;
  /** 점수 정보 */
  scores: RecommendScores;
  /** 추천 이유 (예: "AAA 등급", "평점 4.5", "행정처분 없음") */
  highlights: string[];
}

/**
 * 식당 추천 결과 스키마
 */
export interface RecommendRestaurantsResult {
  /** 결과 상태 */
  status: RecommendStatus;
  /** 검색 지역 */
  area: string;
  /** 적용된 필터 */
  filters: RecommendFilters;
  /** 총 후보 수 */
  totalCandidates: number;
  /** 추천 식당 목록 */
  recommendations: RecommendedRestaurant[];
  /** 결과 메시지 */
  message: string;
}

/**
 * 추천 제약 조건
 */
export const RECOMMEND_CONSTRAINTS = {
  /** 기본 반환 개수 */
  DEFAULT_LIMIT: 5,
  /** 최대 반환 개수 */
  MAX_LIMIT: 10,
  /** 최소 반환 개수 */
  MIN_LIMIT: 1,
} as const;

/**
 * 기본 우선순위
 */
export const DEFAULT_PRIORITY: RecommendPriority = 'balanced';

/**
 * 기본 예산
 */
export const DEFAULT_BUDGET: RecommendBudget = 'any';

/**
 * 목적별 선호 카테고리
 */
export const PURPOSE_PREFERENCES: Record<RecommendPurpose, string[]> = {
  회식: ['한식', '고기', '삼겹살', '회', '일식', '곱창', '돼지고기', '소고기'],
  데이트: ['이탈리안', '프렌치', '분위기', '와인', '스테이크', '파스타', '양식'],
  가족모임: ['한정식', '중식', '뷔페', '한식', '갈비', '정식'],
  혼밥: ['라멘', '덮밥', '국수', '분식', '우동', '카레', '백반'],
  비즈니스미팅: ['한정식', '일식', '스테이크', '호텔', '고급', '정식', '코스'],
};

/**
 * 우선순위별 가중치
 */
export interface ScoreWeights {
  /** 위생등급 가중치 (0-1) */
  hygiene: number;
  /** 플랫폼 평점 가중치 (0-1) */
  rating: number;
  /** 리뷰 수 가중치 (0-1) */
  reviews: number;
  /** 행정처분 감점 가중치 (0-1) */
  violationPenalty: number;
  /** 목적 적합도 가중치 (0-1) */
  purpose: number;
}

/**
 * 우선순위별 가중치 설정
 */
export const PRIORITY_WEIGHTS: Record<RecommendPriority, ScoreWeights> = {
  hygiene: {
    hygiene: 0.5,
    rating: 0.2,
    reviews: 0.1,
    violationPenalty: 0.2,
    purpose: 0.2,
  },
  rating: {
    hygiene: 0.2,
    rating: 0.5,
    reviews: 0.15,
    violationPenalty: 0.1,
    purpose: 0.15,
  },
  balanced: {
    hygiene: 0.35,
    rating: 0.35,
    reviews: 0.1,
    violationPenalty: 0.15,
    purpose: 0.15,
  },
};
