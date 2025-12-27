/**
 * 식당 추천 서비스
 *
 * 조건 기반 스마트 추천 알고리즘을 제공합니다.
 */

import type {
  RecommendRestaurantsInput,
  RecommendRestaurantsResult,
  RecommendedRestaurant,
  RecommendScores,
  RecommendPriority,
  RecommendBudget,
  RecommendPurpose,
  RecommendCategory,
  ScoreWeights,
} from '../types/recommend.types.js';
import {
  RECOMMEND_CONSTRAINTS,
  DEFAULT_PRIORITY,
  DEFAULT_BUDGET,
  PRIORITY_WEIGHTS,
  PURPOSE_PREFERENCES,
} from '../types/recommend.types.js';
import type { EnhancedAreaSearchService } from './enhanced-area-search.service.js';
import type { RestaurantIntelligenceService } from './restaurant-intelligence.service.js';
import type {
  EnhancedRestaurantInfo,
  EnhancedAreaSearchResult,
} from '../types/area-search.types.js';
import type { RestaurantIntelligence } from '../types/restaurant-intelligence.types.js';

/**
 * 식당 추천 서비스 인터페이스
 */
export interface RecommendRestaurantsService {
  /**
   * 조건 기반 식당 추천
   * @param input - 추천 입력 정보
   * @returns 추천 결과
   */
  recommendRestaurants(
    input: RecommendRestaurantsInput,
  ): Promise<RecommendRestaurantsResult>;
}

/**
 * 입력 검증 오류
 */
export class RecommendValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecommendValidationError';
  }
}

/**
 * 후보 식당 정보 (내부 처리용)
 */
interface CandidateRestaurant {
  restaurant: EnhancedRestaurantInfo;
  intelligence: RestaurantIntelligence | null;
  scores: RecommendScores;
  highlights: string[];
}

/**
 * 식당 추천 서비스 구현
 */
export class RecommendRestaurantsServiceImpl implements RecommendRestaurantsService {
  constructor(
    private readonly areaSearchService: EnhancedAreaSearchService,
    private readonly intelligenceService: RestaurantIntelligenceService,
  ) {}

  /**
   * 조건 기반 식당 추천
   */
  async recommendRestaurants(
    input: RecommendRestaurantsInput,
  ): Promise<RecommendRestaurantsResult> {
    // 입력 검증
    this.validateInput(input);

    const {
      area,
      purpose,
      category,
      priority = DEFAULT_PRIORITY,
      budget = DEFAULT_BUDGET,
      limit = RECOMMEND_CONSTRAINTS.DEFAULT_LIMIT,
    } = input;

    // 1. 지역 검색
    const searchResult = await this.areaSearchService.searchArea({
      area,
      category: category === '카페' ? 'cafe' : 'restaurant',
    });

    // 검색 결과 처리
    if (searchResult.status === 'not_found') {
      return this.buildNoResultsResponse(area, input);
    }

    if (searchResult.status === 'too_many') {
      return this.buildAreaTooBroadResponse(area, input, searchResult);
    }

    // 2. 카테고리 필터 적용
    let filteredRestaurants = this.filterByCategory(
      searchResult.restaurants,
      category,
    );

    // 3. 예산 필터 적용
    filteredRestaurants = this.filterByBudget(filteredRestaurants, budget);

    if (filteredRestaurants.length === 0) {
      return this.buildNoResultsResponse(area, input);
    }

    // 4. 후보 식당들의 점수 계산
    const candidates = await this.scoreCandidates(
      filteredRestaurants,
      area,
      priority,
      purpose,
    );

    // 5. 점수 기준 정렬 및 상위 N개 선택
    const topCandidates = candidates
      .sort((a, b) => b.scores.total - a.scores.total)
      .slice(0, Math.min(limit, RECOMMEND_CONSTRAINTS.MAX_LIMIT));

    // 6. 추천 결과 생성
    const recommendations = topCandidates.map((candidate, index) =>
      this.toRecommendedRestaurant(candidate, index + 1),
    );

    return {
      status: 'success',
      area,
      filters: {
        purpose,
        category,
        priority,
        budget,
      },
      totalCandidates: filteredRestaurants.length,
      recommendations,
      message: this.buildSuccessMessage(
        area,
        recommendations.length,
        priority,
        purpose,
      ),
    };
  }

  /**
   * 입력 검증
   */
  private validateInput(input: RecommendRestaurantsInput): void {
    if (!input.area?.trim()) {
      throw new RecommendValidationError('지역명은 필수입니다.');
    }

    if (input.limit !== undefined) {
      if (input.limit < RECOMMEND_CONSTRAINTS.MIN_LIMIT) {
        throw new RecommendValidationError(
          `최소 ${RECOMMEND_CONSTRAINTS.MIN_LIMIT}개 이상 요청해야 합니다.`,
        );
      }
      if (input.limit > RECOMMEND_CONSTRAINTS.MAX_LIMIT) {
        throw new RecommendValidationError(
          `최대 ${RECOMMEND_CONSTRAINTS.MAX_LIMIT}개까지 요청할 수 있습니다.`,
        );
      }
    }

    // 유효한 우선순위 검증
    if (input.priority) {
      const validPriorities: RecommendPriority[] = [
        'hygiene',
        'rating',
        'balanced',
      ];
      if (!validPriorities.includes(input.priority)) {
        throw new RecommendValidationError(
          `유효하지 않은 우선순위: ${input.priority}`,
        );
      }
    }

    // 유효한 예산 검증
    if (input.budget) {
      const validBudgets: RecommendBudget[] = ['low', 'medium', 'high', 'any'];
      if (!validBudgets.includes(input.budget)) {
        throw new RecommendValidationError(
          `유효하지 않은 예산: ${input.budget}`,
        );
      }
    }

    // 유효한 목적 검증
    if (input.purpose) {
      const validPurposes: RecommendPurpose[] = [
        '회식',
        '데이트',
        '가족모임',
        '혼밥',
        '비즈니스미팅',
      ];
      if (!validPurposes.includes(input.purpose)) {
        throw new RecommendValidationError(
          `유효하지 않은 목적: ${input.purpose}`,
        );
      }
    }

    // 유효한 카테고리 검증
    if (input.category) {
      const validCategories: RecommendCategory[] = [
        '한식',
        '중식',
        '일식',
        '양식',
        '카페',
        '전체',
      ];
      if (!validCategories.includes(input.category)) {
        throw new RecommendValidationError(
          `유효하지 않은 카테고리: ${input.category}`,
        );
      }
    }
  }

  /**
   * 카테고리 필터 적용
   */
  private filterByCategory(
    restaurants: EnhancedRestaurantInfo[],
    category?: RecommendCategory,
  ): EnhancedRestaurantInfo[] {
    if (!category || category === '전체') {
      return restaurants;
    }

    const categoryKeywords: Record<string, string[]> = {
      한식: [
        '한식',
        '한정식',
        '국밥',
        '찌개',
        '불고기',
        '갈비',
        '비빔밥',
        '삼겹살',
      ],
      중식: ['중식', '중국', '짜장', '짬뽕', '탕수육', '양꼬치'],
      일식: [
        '일식',
        '일본',
        '초밥',
        '스시',
        '라멘',
        '우동',
        '돈까스',
        '사시미',
      ],
      양식: [
        '양식',
        '이탈리안',
        '파스타',
        '스테이크',
        '피자',
        '프렌치',
        '햄버거',
      ],
      카페: ['카페', '커피', '디저트', '베이커리', '케이크'],
    };

    const keywords = categoryKeywords[category] || [];

    return restaurants.filter(r => {
      const categoryLower = r.category.toLowerCase();
      return keywords.some(keyword => categoryLower.includes(keyword));
    });
  }

  /**
   * 예산 필터 적용
   */
  private filterByBudget(
    restaurants: EnhancedRestaurantInfo[],
    budget: RecommendBudget,
  ): EnhancedRestaurantInfo[] {
    if (budget === 'any') {
      return restaurants;
    }

    return restaurants.filter(r => {
      // 가격 정보가 없으면 포함 (정보 없음은 필터링하지 않음)
      if (!r.priceRange) {
        return true;
      }

      return r.priceRange === budget;
    });
  }

  /**
   * 후보 식당들의 점수 계산
   */
  private async scoreCandidates(
    restaurants: EnhancedRestaurantInfo[],
    area: string,
    priority: RecommendPriority,
    purpose?: RecommendPurpose,
  ): Promise<CandidateRestaurant[]> {
    const weights = PRIORITY_WEIGHTS[priority];

    // 병렬로 intelligence 조회
    const intelligencePromises = restaurants.map(restaurant =>
      this.intelligenceService
        .getRestaurantIntelligence(restaurant.name, area)
        .catch(() => null),
    );

    const intelligenceResults = await Promise.all(intelligencePromises);

    // 점수 계산
    return restaurants.map((restaurant, index) => {
      const intelligence = intelligenceResults[index];
      const scores = this.calculateScores(
        restaurant,
        intelligence,
        weights,
        purpose,
      );
      const highlights = this.generateHighlights(restaurant, intelligence);

      return {
        restaurant,
        intelligence,
        scores,
        highlights,
      };
    });
  }

  /**
   * 점수 계산
   */
  private calculateScores(
    restaurant: EnhancedRestaurantInfo,
    intelligence: RestaurantIntelligence | null,
    weights: ScoreWeights,
    purpose?: RecommendPurpose,
  ): RecommendScores {
    // 위생 점수 (0-100)
    const hygieneScore = this.calculateHygieneScore(restaurant, intelligence);

    // 평점 점수 (0-100)
    const ratingScore = this.calculateRatingScore(restaurant, intelligence);

    // 리뷰 수 점수 (0-100)
    const reviewsScore = this.calculateReviewsScore(intelligence);

    // 행정처분 감점 (0-100, 높을수록 감점이 많음)
    const violationPenalty = this.calculateViolationPenalty(
      restaurant,
      intelligence,
    );

    // 목적 적합도 점수 (0-100)
    const purposeScore = this.calculatePurposeScore(restaurant, purpose);

    // 가중치 적용된 개별 점수 기여분
    const hygieneContribution = hygieneScore * weights.hygiene;
    const ratingContribution = ratingScore * weights.rating;
    const reviewsContribution = reviewsScore * weights.reviews;
    const violationDeduction = violationPenalty * weights.violationPenalty;
    const purposeContribution = purposeScore * weights.purpose;

    // 총점 계산 (감점 적용)
    const total = Math.max(
      0,
      Math.round(
        hygieneContribution +
          ratingContribution +
          reviewsContribution +
          purposeContribution -
          violationDeduction,
      ),
    );

    return {
      total,
      hygiene: Math.round(hygieneContribution),
      rating: Math.round(ratingContribution),
      reviews: Math.round(reviewsContribution),
      purpose: Math.round(purposeContribution),
    };
  }

  /**
   * 위생 점수 계산 (0-100)
   */
  private calculateHygieneScore(
    restaurant: EnhancedRestaurantInfo,
    intelligence: RestaurantIntelligence | null,
  ): number {
    const grade = intelligence?.hygiene.grade ?? restaurant.hygiene?.grade;

    switch (grade) {
      case 'AAA':
        return 100;
      case 'AA':
        return 80;
      case 'A':
        return 60;
      default:
        return 40; // 등급 없음
    }
  }

  /**
   * 평점 점수 계산 (0-100)
   */
  private calculateRatingScore(
    restaurant: EnhancedRestaurantInfo,
    intelligence: RestaurantIntelligence | null,
  ): number {
    const rating =
      intelligence?.ratings.combined ?? restaurant.ratings?.combined;

    if (rating === null || rating === undefined) {
      return 50; // 평점 없으면 중립
    }

    // 5점 만점 -> 100점 변환
    return Math.min(100, Math.round(rating * 20));
  }

  /**
   * 리뷰 수 점수 계산 (0-100)
   */
  private calculateReviewsScore(
    intelligence: RestaurantIntelligence | null,
  ): number {
    if (!intelligence) {
      return 50;
    }

    const kakaoReviews = intelligence.ratings.kakao?.reviews ?? 0;
    const naverReviews = intelligence.ratings.naver?.reviews ?? 0;
    const totalReviews = kakaoReviews + naverReviews;

    // 리뷰 수에 따른 점수 (로그 스케일)
    // 0: 30점, 10: 50점, 100: 70점, 500: 85점, 1000+: 100점
    if (totalReviews === 0) return 30;
    if (totalReviews >= 1000) return 100;

    const logScore = Math.log10(totalReviews + 1) * 25;
    return Math.min(100, Math.round(30 + logScore));
  }

  /**
   * 행정처분 감점 계산 (0-100)
   */
  private calculateViolationPenalty(
    restaurant: EnhancedRestaurantInfo,
    intelligence: RestaurantIntelligence | null,
  ): number {
    const hasViolations =
      intelligence?.hygiene.hasViolations ?? restaurant.hygiene?.hasViolations;
    const violationCount = intelligence?.hygiene.violationCount ?? 0;

    if (!hasViolations) {
      return 0; // 감점 없음
    }

    // 행정처분 건수에 따른 감점
    // 1건: 50점, 2건: 75점, 3건 이상: 100점
    return Math.min(100, violationCount * 50);
  }

  /**
   * 목적 적합도 점수 계산 (0-100)
   */
  private calculatePurposeScore(
    restaurant: EnhancedRestaurantInfo,
    purpose?: RecommendPurpose,
  ): number {
    if (!purpose) {
      return 50; // 목적 없으면 중립
    }

    const preferredCategories = PURPOSE_PREFERENCES[purpose] || [];
    const categoryLower = restaurant.category.toLowerCase();

    // 완전 매칭
    const exactMatch = preferredCategories.some(pref =>
      categoryLower.includes(pref.toLowerCase()),
    );
    if (exactMatch) {
      return 100;
    }

    // 부분 매칭 (카테고리 키워드 일부 포함)
    const partialMatch = preferredCategories.some(pref => {
      const prefWords = pref.split('');
      return prefWords.some(
        word => word.length >= 2 && categoryLower.includes(word),
      );
    });

    if (partialMatch) {
      return 60;
    }

    return 30; // 매칭 없음
  }

  /**
   * 추천 이유 생성
   */
  private generateHighlights(
    restaurant: EnhancedRestaurantInfo,
    intelligence: RestaurantIntelligence | null,
  ): string[] {
    const highlights: string[] = [];

    // 위생등급
    const grade = intelligence?.hygiene.grade ?? restaurant.hygiene?.grade;
    if (grade) {
      highlights.push(`${grade} 등급`);
    }

    // 평점
    const rating =
      intelligence?.ratings.combined ?? restaurant.ratings?.combined;
    if (rating !== null && rating !== undefined) {
      highlights.push(`평점 ${rating.toFixed(1)}`);
    }

    // 행정처분
    const hasViolations =
      intelligence?.hygiene.hasViolations ?? restaurant.hygiene?.hasViolations;
    if (!hasViolations) {
      highlights.push('행정처분 없음');
    }

    // 리뷰 수
    if (intelligence) {
      const totalReviews =
        (intelligence.ratings.kakao?.reviews ?? 0) +
        (intelligence.ratings.naver?.reviews ?? 0);
      if (totalReviews >= 100) {
        highlights.push(`리뷰 ${totalReviews}개`);
      }
    }

    // 가격대
    const priceRange = intelligence?.priceRange ?? restaurant.priceRange;
    if (priceRange === 'low') {
      highlights.push('가성비 좋음');
    }

    return highlights;
  }

  /**
   * CandidateRestaurant -> RecommendedRestaurant 변환
   */
  private toRecommendedRestaurant(
    candidate: CandidateRestaurant,
    rank: number,
  ): RecommendedRestaurant {
    const { restaurant, intelligence, scores, highlights } = candidate;

    const totalReviews = intelligence
      ? (intelligence.ratings.kakao?.reviews ?? 0) +
        (intelligence.ratings.naver?.reviews ?? 0)
      : 0;

    return {
      rank,
      name: restaurant.name,
      address: restaurant.roadAddress || restaurant.address,
      category: restaurant.category,
      hygiene: {
        grade: intelligence?.hygiene.grade ?? restaurant.hygiene?.grade ?? null,
        stars: intelligence?.hygiene.stars ?? restaurant.hygiene?.stars ?? 0,
        hasViolations:
          intelligence?.hygiene.hasViolations ??
          restaurant.hygiene?.hasViolations ??
          false,
      },
      rating: {
        combined:
          intelligence?.ratings.combined ??
          restaurant.ratings?.combined ??
          null,
        reviewCount: totalReviews,
      },
      priceRange: intelligence?.priceRange ?? restaurant.priceRange ?? null,
      scores,
      highlights,
    };
  }

  /**
   * 결과 없음 응답 생성
   */
  private buildNoResultsResponse(
    area: string,
    input: RecommendRestaurantsInput,
  ): RecommendRestaurantsResult {
    return {
      status: 'no_results',
      area,
      filters: {
        purpose: input.purpose,
        category: input.category,
        priority: input.priority ?? DEFAULT_PRIORITY,
        budget: input.budget,
      },
      totalCandidates: 0,
      recommendations: [],
      message: `"${area}" 지역에서 조건에 맞는 식당을 찾을 수 없습니다.`,
    };
  }

  /**
   * 지역 범위 너무 넓음 응답 생성
   */
  private buildAreaTooBroadResponse(
    area: string,
    input: RecommendRestaurantsInput,
    searchResult: EnhancedAreaSearchResult,
  ): RecommendRestaurantsResult {
    const suggestions = searchResult.suggestions?.join(', ') ?? '';
    const message = suggestions
      ? `"${area}" 지역은 범위가 너무 넓습니다. 다음 지역을 시도해 보세요: ${suggestions}`
      : `"${area}" 지역은 범위가 너무 넓습니다. 더 좁은 지역명을 입력해 주세요.`;

    return {
      status: 'area_too_broad',
      area,
      filters: {
        purpose: input.purpose,
        category: input.category,
        priority: input.priority ?? DEFAULT_PRIORITY,
        budget: input.budget,
      },
      totalCandidates: searchResult.totalCount,
      recommendations: [],
      message,
    };
  }

  /**
   * 성공 메시지 생성
   */
  private buildSuccessMessage(
    area: string,
    count: number,
    priority: RecommendPriority,
    purpose?: RecommendPurpose,
  ): string {
    const priorityLabel = {
      hygiene: '위생 우선',
      rating: '평점 우선',
      balanced: '균형 모드',
    }[priority];

    if (purpose) {
      return `"${area}" ${purpose} 추천 Top ${count} (${priorityLabel})`;
    }

    return `"${area}" 추천 Top ${count} (${priorityLabel})`;
  }
}

/**
 * RecommendRestaurantsService 팩토리 함수
 */
export function createRecommendRestaurantsService(
  areaSearchService: EnhancedAreaSearchService,
  intelligenceService: RestaurantIntelligenceService,
): RecommendRestaurantsService {
  return new RecommendRestaurantsServiceImpl(
    areaSearchService,
    intelligenceService,
  );
}
