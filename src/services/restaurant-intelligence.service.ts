/**
 * 식당 종합 정보 서비스
 *
 * 여러 데이터 소스(카카오, 네이버, 식약처)의 정보를 통합하여
 * 식당의 종합 정보를 제공합니다.
 */

import type {
  RestaurantIntelligence,
  HygieneInfo,
  RatingsInfo,
  ScoresInfo,
  IntelligenceHygieneGrade,
} from '../types/restaurant-intelligence.types.js';
import type { KakaoMapService } from './kakao-map.service.js';
import type { NaverPlaceService } from './naver-place.service.js';
import type { HygieneGradeService, HygieneGradeItem } from './hygiene-grade.service.js';
import type { ViolationService } from './violation.service.js';
import {
  type CacheService,
  buildCacheKey,
  CACHE_TTL,
  CACHE_PREFIX,
} from './cache.service.js';
import { withCacheNullable } from '../utils/cache-wrapper.js';

/**
 * 점수 계산 상수
 */
const SCORE_CONFIG = {
  /** 등급별 기본 점수 */
  GRADE_SCORES: {
    AAA: 100,
    AA: 80,
    A: 60,
    NONE: 40,
  } as const,
  /** 행정처분당 감점 */
  VIOLATION_PENALTY: 20,
  /** 최대 행정처분 감점 */
  MAX_VIOLATION_PENALTY: 40,
  /** 평점 없을 때 기본 인기도 점수 */
  DEFAULT_POPULARITY_SCORE: 50,
  /** 위생 점수 가중치 */
  HYGIENE_WEIGHT: 0.6,
  /** 인기도 점수 가중치 */
  POPULARITY_WEIGHT: 0.4,
} as const;

/**
 * 식당 종합 정보 서비스 인터페이스
 */
export interface RestaurantIntelligenceService {
  /**
   * 식당 종합 정보 조회
   * @param name - 식당명
   * @param region - 지역명
   * @returns 통합 식당 정보 또는 null
   */
  getRestaurantIntelligence(
    name: string,
    region: string,
  ): Promise<RestaurantIntelligence | null>;
}

/**
 * 식당 종합 정보 서비스 구현
 */
export class RestaurantIntelligenceServiceImpl
  implements RestaurantIntelligenceService
{
  constructor(
    private readonly kakaoMapService: KakaoMapService,
    private readonly hygieneGradeService: HygieneGradeService,
    private readonly violationService: ViolationService,
    private readonly naverPlaceService?: NaverPlaceService,
    private readonly cache?: CacheService,
  ) {}

  /**
   * 식당 종합 정보 조회
   */
  async getRestaurantIntelligence(
    name: string,
    region: string,
  ): Promise<RestaurantIntelligence | null> {
    // 입력값 검증
    if (!name?.trim() || !region?.trim()) {
      return null;
    }

    const cacheKey = buildCacheKey(
      CACHE_PREFIX.RESTAURANT_INTELLIGENCE,
      name,
      region,
    );

    return withCacheNullable(
      {
        cache: this.cache,
        key: cacheKey,
        ttl: CACHE_TTL.RESTAURANT_INTELLIGENCE,
      },
      async () => this.fetchRestaurantIntelligence(name, region),
    );
  }

  /**
   * 데이터 소스에서 식당 정보 수집 및 통합
   */
  private async fetchRestaurantIntelligence(
    name: string,
    region: string,
  ): Promise<RestaurantIntelligence | null> {
    // 카카오맵에서 기본 정보 조회
    const kakaoResults = await this.kakaoMapService.searchRestaurant(
      name,
      region,
    );

    if (kakaoResults.length === 0) {
      return null;
    }

    // 첫 번째 결과 사용 (가장 정확한 매칭)
    const restaurant = kakaoResults[0];

    // 병렬로 추가 정보 조회
    const [hygieneResult, violationResult, naverResult] = await Promise.all([
      this.hygieneGradeService.findExactMatch(name, region).catch(() => null),
      this.violationService
        .getViolationsForRestaurant(name, region)
        .catch(() => ({ total_count: 0, recent_items: [], has_more: false })),
      this.naverPlaceService
        ?.searchPlace(name, restaurant.address)
        .catch(() => null) ?? Promise.resolve(null),
    ]);

    // 위생 정보 구성
    const hygiene = this.buildHygieneInfo(hygieneResult, violationResult.total_count);

    // 평점 정보 구성
    const ratings = this.buildRatingsInfo(naverResult);

    // 점수 계산
    const scores = this.calculateScores(hygiene, ratings);

    return {
      name: restaurant.name,
      address: restaurant.roadAddress || restaurant.address,
      category: restaurant.category,
      phone: restaurant.phone || undefined,
      placeUrl: restaurant.placeUrl,
      hygiene,
      ratings,
      priceRange: naverResult?.priceRange ?? null,
      businessHours: naverResult?.businessHours ?? null,
      scores,
    };
  }

  /**
   * 위생 정보 구성
   */
  private buildHygieneInfo(
    hygieneResult: HygieneGradeItem | null,
    violationCount: number,
  ): HygieneInfo {
    if (!hygieneResult || !hygieneResult.hygieneGrade.has_grade) {
      return {
        grade: null,
        gradeLabel: null,
        stars: 0,
        hasViolations: violationCount > 0,
        violationCount,
      };
    }

    const { grade, grade_label, stars } = hygieneResult.hygieneGrade;

    return {
      grade: grade as IntelligenceHygieneGrade,
      gradeLabel: grade_label,
      stars,
      hasViolations: violationCount > 0,
      violationCount,
    };
  }

  /**
   * 평점 정보 구성
   */
  private buildRatingsInfo(
    naverResult: { score: number | null; reviewCount: number } | null,
  ): RatingsInfo {
    // 현재 카카오 API는 평점을 제공하지 않음
    const kakaoRating = null;

    const naverRating = naverResult
      ? {
          score: naverResult.score,
          reviews: naverResult.reviewCount,
        }
      : null;

    // 가중 평균 계산
    const combined = this.calculateCombinedRating(kakaoRating, naverRating);

    return {
      kakao: kakaoRating,
      naver: naverRating,
      combined,
    };
  }

  /**
   * 가중 평균 평점 계산
   */
  private calculateCombinedRating(
    kakao: { score: number | null; reviews: number } | null,
    naver: { score: number | null; reviews: number } | null,
  ): number | null {
    const ratings: { score: number; reviews: number }[] = [];

    if (kakao?.score !== null && kakao?.score !== undefined) {
      ratings.push({ score: kakao.score, reviews: kakao.reviews });
    }

    if (naver?.score !== null && naver?.score !== undefined) {
      ratings.push({ score: naver.score, reviews: naver.reviews });
    }

    if (ratings.length === 0) {
      return null;
    }

    // 리뷰 수 기반 가중 평균
    const totalReviews = ratings.reduce((sum, r) => sum + r.reviews, 0);

    if (totalReviews === 0) {
      // 리뷰 수가 없으면 단순 평균
      const sum = ratings.reduce((s, r) => s + r.score, 0);
      return Math.round((sum / ratings.length) * 10) / 10;
    }

    const weightedSum = ratings.reduce(
      (sum, r) => sum + r.score * r.reviews,
      0,
    );
    return Math.round((weightedSum / totalReviews) * 10) / 10;
  }

  /**
   * 점수 계산
   */
  private calculateScores(
    hygiene: HygieneInfo,
    ratings: RatingsInfo,
  ): ScoresInfo {
    const hygieneScore = this.calculateHygieneScore(hygiene);
    const popularityScore = this.calculatePopularityScore(ratings);
    const overallScore = this.calculateOverallScore(hygieneScore, popularityScore);

    return {
      hygiene: hygieneScore,
      popularity: popularityScore,
      overall: overallScore,
    };
  }

  /**
   * 위생 점수 계산 (0-100)
   *
   * 계산 공식:
   * - AAA: 100점
   * - AA: 80점
   * - A: 60점
   * - 없음: 40점
   * - 행정처분: -20점씩 (최대 -40)
   */
  private calculateHygieneScore(hygiene: HygieneInfo): number {
    let baseScore: number;

    switch (hygiene.grade) {
      case 'AAA':
        baseScore = SCORE_CONFIG.GRADE_SCORES.AAA;
        break;
      case 'AA':
        baseScore = SCORE_CONFIG.GRADE_SCORES.AA;
        break;
      case 'A':
        baseScore = SCORE_CONFIG.GRADE_SCORES.A;
        break;
      default:
        baseScore = SCORE_CONFIG.GRADE_SCORES.NONE;
    }

    // 행정처분 감점
    const violationPenalty = Math.min(
      hygiene.violationCount * SCORE_CONFIG.VIOLATION_PENALTY,
      SCORE_CONFIG.MAX_VIOLATION_PENALTY,
    );

    return Math.max(0, baseScore - violationPenalty);
  }

  /**
   * 인기도 점수 계산 (0-100)
   *
   * 계산 공식:
   * - combinedRating * 20 (5점 만점 -> 100점)
   * - 평점 없으면: 50점 (중립)
   */
  private calculatePopularityScore(ratings: RatingsInfo): number {
    if (ratings.combined === null) {
      return SCORE_CONFIG.DEFAULT_POPULARITY_SCORE;
    }

    // 5점 만점 -> 100점 변환
    return Math.min(100, Math.round(ratings.combined * 20));
  }

  /**
   * 종합 점수 계산 (0-100)
   *
   * 계산 공식:
   * - (hygieneScore * 0.6) + (popularityScore * 0.4)
   */
  private calculateOverallScore(
    hygieneScore: number,
    popularityScore: number,
  ): number {
    const weighted =
      hygieneScore * SCORE_CONFIG.HYGIENE_WEIGHT +
      popularityScore * SCORE_CONFIG.POPULARITY_WEIGHT;

    return Math.round(weighted);
  }
}

/**
 * RestaurantIntelligenceService 팩토리 함수
 */
export function createRestaurantIntelligenceService(
  kakaoMapService: KakaoMapService,
  hygieneGradeService: HygieneGradeService,
  violationService: ViolationService,
  naverPlaceService?: NaverPlaceService,
  cache?: CacheService,
): RestaurantIntelligenceService {
  return new RestaurantIntelligenceServiceImpl(
    kakaoMapService,
    hygieneGradeService,
    violationService,
    naverPlaceService,
    cache,
  );
}
