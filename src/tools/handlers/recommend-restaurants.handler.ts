/**
 * recommend_restaurants 도구 핸들러
 *
 * 조건 기반 스마트 식당 추천
 */

import type { ToolContext, ToolResult } from '../types.js';
import type { RecommendRestaurantsToolInput } from '../definitions/recommend-restaurants.def.js';
import type { RecommendRestaurantsInput } from '../../types/recommend.types.js';
import { formatRecommendResult } from '../../formatters/recommend-formatter.js';

/**
 * 식당 추천 핸들러
 *
 * RecommendRestaurantsService를 사용하여 조건에 맞는 식당을 추천합니다.
 * 목적, 카테고리, 우선순위, 예산에 따라 최적의 식당을 선별합니다.
 *
 * @param args - 도구 입력 (area, purpose, category, priority, budget, limit)
 * @param ctx - 도구 컨텍스트
 * @returns 도구 실행 결과
 */
export async function handleRecommendRestaurants(
  args: RecommendRestaurantsToolInput,
  ctx: ToolContext,
): Promise<ToolResult> {
  try {
    // 입력 변환
    const input: RecommendRestaurantsInput = {
      area: args.area,
      purpose: args.purpose,
      category: args.category,
      priority: args.priority,
      budget: args.budget,
      limit: args.limit,
    };

    // 서비스 호출
    const result = await ctx.recommend.recommendRestaurants(input);

    // 결과 포맷팅
    const formatted = formatRecommendResult(result, {
      showDetails: true,
      showScores: false,
    });

    return {
      content: [{ type: 'text' as const, text: formatted.text }],
      structuredContent: result as unknown as Record<string, unknown>,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '추천 중 오류가 발생했습니다.';
    return {
      content: [{ type: 'text' as const, text: message }],
      isError: true,
    };
  }
}
