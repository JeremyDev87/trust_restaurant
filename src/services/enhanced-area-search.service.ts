/**
 * Enhanced Area Search Service
 *
 * 지역 기반 검색을 확장하여 평점, 위생등급 정보와 필터/정렬 기능을 제공합니다.
 */

import type {
  SearchAreaRestaurantsInput,
  EnhancedAreaSearchResult,
  EnhancedRestaurantInfo,
  AreaSummary,
} from '../types/area-search.types.js';
import type { RestaurantInfo } from '../types/kakao-map.types.js';
import type { RestaurantIntelligence } from '../types/restaurant-intelligence.types.js';
import type { KakaoMapService } from './kakao-map.service.js';
import type { RestaurantIntelligenceService } from './restaurant-intelligence.service.js';

/**
 * Enhanced Area Search Service 인터페이스
 */
export interface EnhancedAreaSearchService {
  /**
   * 지역 내 식당 검색 (확장 버전)
   * @param input - 검색 입력 (지역명, 필터, 정렬 옵션)
   * @returns 확장된 지역 검색 결과
   */
  searchArea(
    input: SearchAreaRestaurantsInput,
  ): Promise<EnhancedAreaSearchResult>;
}

/**
 * Enhanced Area Search Service 구현체
 */
export class EnhancedAreaSearchServiceImpl implements EnhancedAreaSearchService {
  constructor(
    private readonly kakaoMapService: KakaoMapService,
    private readonly intelligenceService: RestaurantIntelligenceService,
  ) {}

  /**
   * 지역 내 식당 검색 (확장 버전)
   */
  async searchArea(
    input: SearchAreaRestaurantsInput,
  ): Promise<EnhancedAreaSearchResult> {
    const { area, category, minRating, hygieneGrade, sortBy } = input;

    // 1. 기존 KakaoMapService로 지역 검색
    const baseResult = await this.kakaoMapService.searchByArea(area, category);

    // 'not_found' 상태 처리
    if (baseResult.status === 'not_found') {
      return {
        status: 'not_found',
        totalCount: 0,
        restaurants: [],
        message: baseResult.message,
      };
    }

    // 'too_many' 상태 처리 - intelligence 조회 스킵
    if (baseResult.status === 'too_many') {
      return {
        status: 'too_many',
        totalCount: baseResult.totalCount,
        restaurants: [],
        suggestions: baseResult.suggestions,
        message: baseResult.message,
      };
    }

    // 2. 'ready' 상태에서만 추가 정보 조회
    const enhancedRestaurants = await this.enrichRestaurants(
      baseResult.restaurants,
      area,
    );

    // 3. 필터 적용
    let filteredRestaurants = this.applyFilters(
      enhancedRestaurants,
      minRating,
      hygieneGrade,
    );

    // 4. 정렬 적용
    filteredRestaurants = this.applySorting(filteredRestaurants, sortBy);

    // 5. 요약 통계 계산
    const summary = this.calculateSummary(enhancedRestaurants);

    return {
      status: 'ready',
      totalCount: filteredRestaurants.length,
      summary,
      restaurants: filteredRestaurants,
      message: `"${area}" 지역에서 ${filteredRestaurants.length}개의 식당을 찾았습니다.`,
    };
  }

  /**
   * 식당들에 대해 추가 정보 조회
   */
  private async enrichRestaurants(
    restaurants: RestaurantInfo[],
    area: string,
  ): Promise<EnhancedRestaurantInfo[]> {
    // 병렬로 intelligence 조회
    const enrichPromises = restaurants.map(async restaurant => {
      const intelligence = await this.intelligenceService
        .getRestaurantIntelligence(restaurant.name, area)
        .catch(() => null);

      return this.toEnhancedRestaurantInfo(restaurant, intelligence);
    });

    return Promise.all(enrichPromises);
  }

  /**
   * RestaurantInfo + Intelligence -> EnhancedRestaurantInfo 변환
   */
  private toEnhancedRestaurantInfo(
    restaurant: RestaurantInfo,
    intelligence: RestaurantIntelligence | null,
  ): EnhancedRestaurantInfo {
    if (!intelligence) {
      return { ...restaurant };
    }

    return {
      ...restaurant,
      hygiene: {
        grade: intelligence.hygiene.grade,
        stars: intelligence.hygiene.stars,
        hasViolations: intelligence.hygiene.hasViolations,
      },
      ratings: {
        kakao: intelligence.ratings.kakao?.score ?? null,
        naver: intelligence.ratings.naver?.score ?? null,
        combined: intelligence.ratings.combined,
      },
      priceRange: intelligence.priceRange,
      businessHours: intelligence.businessHours,
    };
  }

  /**
   * 필터 적용
   */
  private applyFilters(
    restaurants: EnhancedRestaurantInfo[],
    minRating?: number,
    hygieneGrades?: ('AAA' | 'AA' | 'A')[],
  ): EnhancedRestaurantInfo[] {
    let filtered = [...restaurants];

    // 최소 평점 필터
    if (minRating !== undefined && minRating > 0) {
      filtered = filtered.filter(r => {
        const rating = r.ratings?.combined;
        return rating !== null && rating !== undefined && rating >= minRating;
      });
    }

    // 위생등급 필터
    if (hygieneGrades && hygieneGrades.length > 0) {
      filtered = filtered.filter(r => {
        const grade = r.hygiene?.grade;
        return (
          grade !== null && grade !== undefined && hygieneGrades.includes(grade)
        );
      });
    }

    return filtered;
  }

  /**
   * 정렬 적용
   */
  private applySorting(
    restaurants: EnhancedRestaurantInfo[],
    sortBy?: 'rating' | 'hygiene' | 'reviews' | 'distance',
  ): EnhancedRestaurantInfo[] {
    if (!sortBy) {
      return restaurants;
    }

    const sorted = [...restaurants];

    switch (sortBy) {
      case 'rating':
        sorted.sort((a, b) => {
          const ratingA = a.ratings?.combined ?? 0;
          const ratingB = b.ratings?.combined ?? 0;
          return ratingB - ratingA; // 내림차순
        });
        break;

      case 'hygiene':
        sorted.sort((a, b) => {
          const gradeOrder = { AAA: 3, AA: 2, A: 1 };
          const gradeA = a.hygiene?.grade ? gradeOrder[a.hygiene.grade] : 0;
          const gradeB = b.hygiene?.grade ? gradeOrder[b.hygiene.grade] : 0;
          return gradeB - gradeA; // 내림차순
        });
        break;

      case 'reviews':
        // 리뷰 수 정렬 - rating의 원본 데이터가 없으므로 combined 기준
        sorted.sort((a, b) => {
          const ratingA = a.ratings?.combined ?? 0;
          const ratingB = b.ratings?.combined ?? 0;
          return ratingB - ratingA;
        });
        break;

      case 'distance':
        // 현재 거리 정보가 없으므로 기본 순서 유지
        break;
    }

    return sorted;
  }

  /**
   * 요약 통계 계산
   */
  private calculateSummary(restaurants: EnhancedRestaurantInfo[]): AreaSummary {
    // 평균 평점 계산
    const ratingsWithValue = restaurants
      .map(r => r.ratings?.combined)
      .filter((r): r is number => r !== null && r !== undefined);

    const avgRating =
      ratingsWithValue.length > 0
        ? Math.round(
            (ratingsWithValue.reduce((sum, r) => sum + r, 0) /
              ratingsWithValue.length) *
              10,
          ) / 10
        : null;

    // 등급별 분포
    const gradeDistribution = { AAA: 0, AA: 0, A: 0 };
    restaurants.forEach(r => {
      const grade = r.hygiene?.grade;
      if (grade && grade in gradeDistribution) {
        gradeDistribution[grade]++;
      }
    });

    const withHygieneGrade =
      gradeDistribution.AAA + gradeDistribution.AA + gradeDistribution.A;

    // 깨끗한 식당 비율 (위생등급 있고 행정처분 없는 식당)
    const cleanCount = restaurants.filter(
      r => r.hygiene?.grade && !r.hygiene.hasViolations,
    ).length;
    const cleanRatio =
      restaurants.length > 0
        ? `${Math.round((cleanCount / restaurants.length) * 100)}%`
        : '0%';

    return {
      avgRating,
      withHygieneGrade,
      cleanRatio,
      gradeDistribution,
    };
  }
}

/**
 * EnhancedAreaSearchService 팩토리 함수
 */
export function createEnhancedAreaSearchService(
  kakaoMapService: KakaoMapService,
  intelligenceService: RestaurantIntelligenceService,
): EnhancedAreaSearchService {
  return new EnhancedAreaSearchServiceImpl(
    kakaoMapService,
    intelligenceService,
  );
}
