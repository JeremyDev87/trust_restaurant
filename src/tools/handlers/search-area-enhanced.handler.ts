/**
 * search_area_enhanced 도구 핸들러
 *
 * 지역 내 식당 고급 검색 (위생등급, 평점 필터링)
 */

import type { ToolContext, ToolResult } from '../types.js';
import type { SearchAreaEnhancedInput } from '../definitions/search-area-enhanced.def.js';
import type { RestaurantInfo } from '../../types/kakao-map.types.js';
import type { RestaurantIntelligence } from '../../types/restaurant-intelligence.types.js';

/**
 * 확장된 식당 정보 (intelligence 포함)
 */
interface EnhancedRestaurant extends RestaurantInfo {
  intelligence: RestaurantIntelligence | null;
}

/**
 * 지역 식당 고급 검색 핸들러
 *
 * KakaoMapService와 RestaurantIntelligenceService를 사용하여
 * 지역 내 식당을 고급 필터와 함께 검색합니다.
 *
 * @param args - 도구 입력 (area, category, minRating, hygieneGrade, sortBy)
 * @param ctx - 도구 컨텍스트
 * @returns 도구 실행 결과
 */
export async function handleSearchAreaEnhanced(
  args: SearchAreaEnhancedInput,
  ctx: ToolContext,
): Promise<ToolResult> {
  try {
    // 카카오맵을 통해 지역 검색
    const areaResult = await ctx.kakaoMap.searchByArea(
      args.area,
      args.category,
    );

    if (
      areaResult.status === 'not_found' ||
      areaResult.restaurants.length === 0
    ) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `'${args.area}'에서 검색 결과가 없습니다.`,
          },
        ],
      };
    }

    // 결과가 너무 많으면 안내
    if (areaResult.status === 'too_many') {
      const suggestions = areaResult.suggestions?.join(', ') || '';
      return {
        content: [
          {
            type: 'text' as const,
            text: `'${args.area}'에서 ${areaResult.totalCount}개의 결과가 있습니다. 더 구체적인 지역명을 입력해주세요.\n추천: ${suggestions}`,
          },
        ],
      };
    }

    // 각 식당의 종합 정보 조회 (상위 15개만)
    const topResults = areaResult.restaurants.slice(0, 15);
    const enhancedResults: EnhancedRestaurant[] = await Promise.all(
      topResults.map(
        async (restaurant: RestaurantInfo): Promise<EnhancedRestaurant> => {
          try {
            const intelligence =
              await ctx.intelligence.getRestaurantIntelligence(
                restaurant.name,
                args.area,
              );
            return {
              ...restaurant,
              intelligence,
            };
          } catch {
            return {
              ...restaurant,
              intelligence: null,
            };
          }
        },
      ),
    );

    // 필터링 적용
    let filtered = enhancedResults;

    // 위생등급 필터
    if (args.hygieneGrade && args.hygieneGrade.length > 0) {
      filtered = filtered.filter((r: EnhancedRestaurant) => {
        const grade = r.intelligence?.hygiene.grade;
        return (
          grade && args.hygieneGrade!.includes(grade as 'AAA' | 'AA' | 'A')
        );
      });
    }

    // 최소 평점 필터
    if (args.minRating !== undefined) {
      filtered = filtered.filter((r: EnhancedRestaurant) => {
        const rating = r.intelligence?.ratings.combined ?? r.rating?.score ?? 0;
        return rating >= args.minRating!;
      });
    }

    // 정렬
    if (args.sortBy === 'hygiene') {
      filtered.sort((a: EnhancedRestaurant, b: EnhancedRestaurant) => {
        const aScore = a.intelligence?.scores.hygiene ?? 0;
        const bScore = b.intelligence?.scores.hygiene ?? 0;
        return bScore - aScore;
      });
    } else if (args.sortBy === 'rating') {
      filtered.sort((a: EnhancedRestaurant, b: EnhancedRestaurant) => {
        const aRating =
          a.intelligence?.ratings.combined ?? a.rating?.score ?? 0;
        const bRating =
          b.intelligence?.ratings.combined ?? b.rating?.score ?? 0;
        return bRating - aRating;
      });
    } else if (args.sortBy === 'reviews') {
      filtered.sort((a: EnhancedRestaurant, b: EnhancedRestaurant) => {
        const aReviews =
          (a.intelligence?.ratings.kakao?.reviews ?? 0) +
          (a.intelligence?.ratings.naver?.reviews ?? 0);
        const bReviews =
          (b.intelligence?.ratings.kakao?.reviews ?? 0) +
          (b.intelligence?.ratings.naver?.reviews ?? 0);
        return bReviews - aReviews;
      });
    }

    // 결과 포맷팅
    const lines: string[] = [];
    lines.push(`📍 ${args.area} 식당 검색 결과 (${filtered.length}개)`);
    lines.push('');

    for (const restaurant of filtered) {
      const intel = restaurant.intelligence;
      const grade = intel?.hygiene.grade ?? '미등록';
      const rating =
        intel?.ratings.combined?.toFixed(1) ??
        restaurant.rating?.score?.toFixed(1) ??
        '-';
      const violations = intel?.hygiene.hasViolations ? '⚠️' : '✅';

      lines.push(`[${restaurant.name}]`);
      lines.push(`  주소: ${restaurant.address}`);
      lines.push(`  위생등급: ${grade} ${violations} | 평점: ${rating}`);
      if (intel?.scores) {
        lines.push(`  종합 점수: ${intel.scores.overall}점`);
      }
      lines.push('');
    }

    // 요약 통계
    const withGrade = filtered.filter(
      (r: EnhancedRestaurant) => r.intelligence?.hygiene.grade,
    ).length;
    const avgRating =
      filtered.reduce(
        (sum: number, r: EnhancedRestaurant) =>
          sum + (r.intelligence?.ratings.combined ?? 0),
        0,
      ) / filtered.length || 0;

    lines.push('---');
    lines.push(
      `위생등급 보유: ${withGrade}/${filtered.length}개 | 평균 평점: ${avgRating.toFixed(1)}`,
    );

    return {
      content: [{ type: 'text' as const, text: lines.join('\n') }],
      structuredContent: {
        area: args.area,
        totalCount: filtered.length,
        restaurants: filtered.map((r: EnhancedRestaurant) => ({
          name: r.name,
          address: r.address,
          category: r.category,
          hygiene: r.intelligence?.hygiene,
          ratings: r.intelligence?.ratings,
          scores: r.intelligence?.scores,
        })),
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.';
    return {
      content: [{ type: 'text' as const, text: message }],
      isError: true,
    };
  }
}
