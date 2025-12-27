/**
 * 식당 비교 분석 서비스
 *
 * 여러 식당의 위생, 평점, 가격 등을 비교 분석합니다.
 */

import type {
  CompareRestaurantsInput,
  CompareRestaurantsResult,
  ComparedRestaurant,
  ComparisonAnalysis,
  ComparisonCriteria,
  RestaurantIdentifier,
} from '../types/compare.types.js';
import {
  COMPARE_CONSTRAINTS,
  DEFAULT_CRITERIA,
} from '../types/compare.types.js';
import type { RestaurantIntelligenceService } from './restaurant-intelligence.service.js';
import type { RestaurantIntelligence } from '../types/restaurant-intelligence.types.js';

/**
 * 식당 비교 서비스 인터페이스
 */
export interface CompareRestaurantsService {
  /**
   * 여러 식당 비교 분석
   * @param input - 비교 입력 정보
   * @returns 비교 결과
   */
  compareRestaurants(
    input: CompareRestaurantsInput,
  ): Promise<CompareRestaurantsResult>;
}

/**
 * 입력 검증 오류
 */
export class CompareValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompareValidationError';
  }
}

/**
 * 식당 비교 서비스 구현
 */
export class CompareRestaurantsServiceImpl implements CompareRestaurantsService {
  constructor(
    private readonly intelligenceService: RestaurantIntelligenceService,
  ) {}

  /**
   * 여러 식당 비교 분석
   */
  async compareRestaurants(
    input: CompareRestaurantsInput,
  ): Promise<CompareRestaurantsResult> {
    // 입력 검증
    this.validateInput(input);

    const criteria = input.criteria ?? DEFAULT_CRITERIA;
    const { restaurants } = input;

    // 병렬로 모든 식당 정보 조회
    const results = await this.fetchAllRestaurants(restaurants);

    // 찾은/못찾은 식당 분류
    const found: string[] = [];
    const notFound: string[] = [];
    const foundRestaurants: RestaurantIntelligence[] = [];

    for (let i = 0; i < restaurants.length; i++) {
      const restaurant = restaurants[i];
      const result = results[i];

      if (result) {
        found.push(restaurant.name);
        foundRestaurants.push(result);
      } else {
        notFound.push(restaurant.name);
      }
    }

    // 2개 미만 찾은 경우
    if (foundRestaurants.length < COMPARE_CONSTRAINTS.MIN_RESTAURANTS) {
      return {
        status: 'partial',
        message: this.buildNotEnoughMessage(found, notFound),
        found,
        notFound,
        comparison: null,
      };
    }

    // 비교 대상 식당 정보 변환
    const comparedRestaurants = foundRestaurants.map((r) =>
      this.toComparedRestaurant(r),
    );

    // 분석 수행
    const analysis = this.analyzeRestaurants(comparedRestaurants, criteria);

    // 결과 반환
    const status = notFound.length === 0 ? 'complete' : 'partial';
    const message = this.buildResultMessage(found, notFound, status);

    return {
      status,
      message,
      found,
      notFound,
      comparison: {
        restaurants: comparedRestaurants,
        analysis,
      },
    };
  }

  /**
   * 입력 검증
   */
  private validateInput(input: CompareRestaurantsInput): void {
    const { restaurants, criteria } = input;

    // 식당 수 검증
    if (!restaurants || restaurants.length < COMPARE_CONSTRAINTS.MIN_RESTAURANTS) {
      throw new CompareValidationError(
        `최소 ${COMPARE_CONSTRAINTS.MIN_RESTAURANTS}개의 식당이 필요합니다.`,
      );
    }

    if (restaurants.length > COMPARE_CONSTRAINTS.MAX_RESTAURANTS) {
      throw new CompareValidationError(
        `최대 ${COMPARE_CONSTRAINTS.MAX_RESTAURANTS}개의 식당까지 비교할 수 있습니다.`,
      );
    }

    // 각 식당 정보 검증
    for (const restaurant of restaurants) {
      if (!restaurant.name?.trim()) {
        throw new CompareValidationError('식당명은 필수입니다.');
      }
      if (!restaurant.region?.trim()) {
        throw new CompareValidationError('지역명은 필수입니다.');
      }
    }

    // 비교 항목 검증
    if (criteria) {
      if (criteria.length < COMPARE_CONSTRAINTS.MIN_CRITERIA) {
        throw new CompareValidationError(
          `최소 ${COMPARE_CONSTRAINTS.MIN_CRITERIA}개의 비교 항목이 필요합니다.`,
        );
      }
      if (criteria.length > COMPARE_CONSTRAINTS.MAX_CRITERIA) {
        throw new CompareValidationError(
          `최대 ${COMPARE_CONSTRAINTS.MAX_CRITERIA}개의 비교 항목까지 선택할 수 있습니다.`,
        );
      }

      // 유효한 비교 항목인지 확인
      const validCriteria: ComparisonCriteria[] = [
        'hygiene',
        'rating',
        'price',
        'reviews',
      ];
      for (const c of criteria) {
        if (!validCriteria.includes(c)) {
          throw new CompareValidationError(`유효하지 않은 비교 항목: ${c}`);
        }
      }
    }
  }

  /**
   * 모든 식당 정보 병렬 조회
   */
  private async fetchAllRestaurants(
    restaurants: RestaurantIdentifier[],
  ): Promise<(RestaurantIntelligence | null)[]> {
    const promises = restaurants.map((r) =>
      this.intelligenceService
        .getRestaurantIntelligence(r.name, r.region)
        .catch(() => null),
    );

    return Promise.all(promises);
  }

  /**
   * RestaurantIntelligence를 ComparedRestaurant로 변환
   */
  private toComparedRestaurant(
    intelligence: RestaurantIntelligence,
  ): ComparedRestaurant {
    const totalReviewCount = this.calculateTotalReviewCount(intelligence);

    return {
      name: intelligence.name,
      address: intelligence.address,
      hygiene: {
        grade: intelligence.hygiene.grade,
        stars: intelligence.hygiene.stars,
        hasViolations: intelligence.hygiene.hasViolations,
      },
      rating: {
        kakao: intelligence.ratings.kakao?.score ?? null,
        naver: intelligence.ratings.naver?.score ?? null,
        combined: intelligence.ratings.combined,
        reviewCount: totalReviewCount,
      },
      priceRange: intelligence.priceRange,
      scores: {
        hygiene: intelligence.scores.hygiene,
        popularity: intelligence.scores.popularity,
        overall: intelligence.scores.overall,
      },
    };
  }

  /**
   * 총 리뷰 수 계산
   */
  private calculateTotalReviewCount(
    intelligence: RestaurantIntelligence,
  ): number {
    let count = 0;

    if (intelligence.ratings.kakao) {
      count += intelligence.ratings.kakao.reviews;
    }

    if (intelligence.ratings.naver) {
      count += intelligence.ratings.naver.reviews;
    }

    return count;
  }

  /**
   * 식당 비교 분석 수행
   */
  private analyzeRestaurants(
    restaurants: ComparedRestaurant[],
    criteria: ComparisonCriteria[],
  ): ComparisonAnalysis {
    const bestHygiene = criteria.includes('hygiene')
      ? this.findBestHygiene(restaurants)
      : null;

    const bestRating = criteria.includes('rating')
      ? this.findBestRating(restaurants)
      : null;

    const bestValue = criteria.includes('price')
      ? this.findBestValue(restaurants)
      : null;

    const recommendation = this.generateRecommendation(
      restaurants,
      bestHygiene,
      bestRating,
      bestValue,
    );

    return {
      bestHygiene,
      bestRating,
      bestValue,
      recommendation,
    };
  }

  /**
   * 위생 최우수 식당 찾기
   */
  private findBestHygiene(restaurants: ComparedRestaurant[]): string | null {
    if (restaurants.length === 0) return null;

    let best: ComparedRestaurant | null = null;

    for (const r of restaurants) {
      if (!best) {
        best = r;
        continue;
      }

      // 위생 점수로 비교
      if (r.scores.hygiene > best.scores.hygiene) {
        best = r;
      } else if (r.scores.hygiene === best.scores.hygiene) {
        // 동점이면 등급으로 비교
        const rGradeScore = this.getGradeScore(r.hygiene.grade);
        const bestGradeScore = this.getGradeScore(best.hygiene.grade);
        if (rGradeScore > bestGradeScore) {
          best = r;
        }
      }
    }

    return best?.name ?? null;
  }

  /**
   * 등급 점수 반환
   */
  private getGradeScore(grade: 'AAA' | 'AA' | 'A' | null): number {
    switch (grade) {
      case 'AAA':
        return 3;
      case 'AA':
        return 2;
      case 'A':
        return 1;
      default:
        return 0;
    }
  }

  /**
   * 평점 최고 식당 찾기
   */
  private findBestRating(restaurants: ComparedRestaurant[]): string | null {
    if (restaurants.length === 0) return null;

    let best: ComparedRestaurant | null = null;
    let bestScore = -1;

    for (const r of restaurants) {
      const score = r.rating.combined ?? 0;
      if (score > bestScore) {
        bestScore = score;
        best = r;
      } else if (score === bestScore && best) {
        // 동점이면 리뷰 수로 비교
        if (r.rating.reviewCount > best.rating.reviewCount) {
          best = r;
        }
      }
    }

    return best?.name ?? null;
  }

  /**
   * 가성비 최고 식당 찾기
   *
   * 가성비 = (종합 점수) / (가격 가중치)
   * - low: 1.0
   * - medium: 1.5
   * - high: 2.0
   * - null: 1.5 (중간으로 가정)
   */
  private findBestValue(restaurants: ComparedRestaurant[]): string | null {
    if (restaurants.length === 0) return null;

    let best: ComparedRestaurant | null = null;
    let bestValue = -1;

    for (const r of restaurants) {
      const priceWeight = this.getPriceWeight(r.priceRange);
      const value = r.scores.overall / priceWeight;

      if (value > bestValue) {
        bestValue = value;
        best = r;
      }
    }

    return best?.name ?? null;
  }

  /**
   * 가격대별 가중치 반환
   */
  private getPriceWeight(priceRange: 'low' | 'medium' | 'high' | null): number {
    switch (priceRange) {
      case 'low':
        return 1.0;
      case 'medium':
        return 1.5;
      case 'high':
        return 2.0;
      default:
        return 1.5; // 정보 없으면 중간으로 가정
    }
  }

  /**
   * 종합 추천 메시지 생성
   */
  private generateRecommendation(
    restaurants: ComparedRestaurant[],
    bestHygiene: string | null,
    bestRating: string | null,
    bestValue: string | null,
  ): string {
    if (restaurants.length === 0) {
      return '비교할 식당 정보가 없습니다.';
    }

    // 종합 점수 기준 최고 식당 찾기
    let bestOverall: ComparedRestaurant | null = null;
    for (const r of restaurants) {
      if (!bestOverall || r.scores.overall > bestOverall.scores.overall) {
        bestOverall = r;
      }
    }

    if (!bestOverall) {
      return '비교할 식당 정보가 없습니다.';
    }

    // 추천 메시지 구성
    const messages: string[] = [];

    // 위생과 평점 모두 1위인 경우
    if (bestHygiene === bestRating && bestHygiene === bestOverall.name) {
      return `위생과 평점 모두 고려 시 "${bestOverall.name}" 추천`;
    }

    // 위생 중시 추천
    if (bestHygiene) {
      messages.push(`위생 중시: "${bestHygiene}"`);
    }

    // 평점 중시 추천
    if (bestRating && bestRating !== bestHygiene) {
      messages.push(`평점 중시: "${bestRating}"`);
    }

    // 가성비 추천
    if (bestValue && bestValue !== bestHygiene && bestValue !== bestRating) {
      messages.push(`가성비: "${bestValue}"`);
    }

    // 종합 추천
    if (messages.length > 0) {
      return `${messages.join(', ')}. 종합적으로 "${bestOverall.name}" 추천`;
    }

    return `종합적으로 "${bestOverall.name}" 추천`;
  }

  /**
   * 식당을 찾지 못한 경우 메시지
   */
  private buildNotEnoughMessage(found: string[], _notFound: string[]): string {
    if (found.length === 0) {
      return '비교할 식당을 찾을 수 없습니다.';
    }

    if (found.length === 1) {
      return `"${found[0]}"만 찾았습니다. 비교를 위해 최소 2개의 식당이 필요합니다.`;
    }

    return `비교할 수 있는 식당이 부족합니다.`;
  }

  /**
   * 결과 메시지 생성
   */
  private buildResultMessage(
    found: string[],
    notFound: string[],
    status: 'complete' | 'partial',
  ): string {
    if (status === 'complete') {
      return `${found.length}개 식당 비교 완료`;
    }

    return `${found.length}개 식당 비교 완료 (${notFound.length}개 식당 미발견: ${notFound.join(', ')})`;
  }
}

/**
 * CompareRestaurantsService 팩토리 함수
 */
export function createCompareRestaurantsService(
  intelligenceService: RestaurantIntelligenceService,
): CompareRestaurantsService {
  return new CompareRestaurantsServiceImpl(intelligenceService);
}
