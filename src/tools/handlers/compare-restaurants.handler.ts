/**
 * compare_restaurants 도구 핸들러
 *
 * 여러 식당의 위생등급, 평점, 가격대를 비교 분석
 */

import type { ToolContext, ToolResult } from '../types.js';
import type { CompareRestaurantsToolInput } from '../definitions/compare-restaurants.def.js';
import type { CompareRestaurantsInput } from '../../types/compare.types.js';
import { formatCompareResult } from '../../formatters/compare-formatter.js';

/**
 * 식당 비교 핸들러
 *
 * CompareRestaurantsService를 사용하여 여러 식당을 비교 분석합니다.
 * 결과는 위생등급, 평점, 가격대, 종합 점수를 포함합니다.
 *
 * @param args - 도구 입력 (restaurants, criteria)
 * @param ctx - 도구 컨텍스트
 * @returns 도구 실행 결과
 */
export async function handleCompareRestaurants(
  args: CompareRestaurantsToolInput,
  ctx: ToolContext,
): Promise<ToolResult> {
  try {
    // 입력 변환
    const input: CompareRestaurantsInput = {
      restaurants: args.restaurants.map(
        (r: { name: string; region: string }) => ({
          name: r.name,
          region: r.region,
        }),
      ),
      criteria: args.criteria,
    };

    // 서비스 호출
    const result = await ctx.compare.compareRestaurants(input);

    // 결과 포맷팅
    const formatted = formatCompareResult(result, {
      criteria: args.criteria,
    });

    return {
      content: [{ type: 'text' as const, text: formatted.text }],
      structuredContent: result as unknown as Record<string, unknown>,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '비교 중 오류가 발생했습니다.';
    return {
      content: [{ type: 'text' as const, text: message }],
      isError: true,
    };
  }
}
