/**
 * search_area_restaurants 도구 핸들러
 *
 * 특정 지역 내 식당과 카페를 탐색하는 비즈니스 로직
 */

import type { ToolContext, ToolResult } from '../types.js';
import type { SearchAreaRestaurantsInput } from '../definitions/index.js';
import {
  AreaSearchRequestSchema,
  validateRequest,
} from '../../utils/validation.js';

/**
 * 지역 내 식당 탐색 핸들러
 *
 * 지역명을 기반으로 식당과 카페를 검색합니다.
 * - 결과가 50개를 초과하면 더 구체적인 지역을 입력하도록 안내
 * - 검색 결과를 목록 형태로 포맷팅하여 반환
 *
 * @param args - 도구 입력 (area, category)
 * @param ctx - 도구 컨텍스트 (kakaoMap 서비스 사용)
 * @returns 도구 실행 결과
 */
export async function handleSearchAreaRestaurants(
  args: SearchAreaRestaurantsInput,
  ctx: ToolContext,
): Promise<ToolResult> {
  // 입력 검증 (정규화 + 보안 검사)
  const validation = validateRequest(AreaSearchRequestSchema, {
    area: args.area,
    category: args.category,
  });

  if (!validation.success) {
    return {
      content: [{ type: 'text' as const, text: validation.error.message }],
      isError: true,
    };
  }

  const result = await ctx.kakaoMap.searchByArea(
    validation.data.area,
    validation.data.category,
  );

  if (result.status === 'not_found') {
    return {
      content: [{ type: 'text' as const, text: result.message }],
      isError: true,
    };
  }

  if (result.status === 'too_many') {
    const suggestionText = result.suggestions
      ? `\n\n추천 지역:\n${result.suggestions.map(s => `- ${s}`).join('\n')}`
      : '';

    return {
      content: [
        {
          type: 'text' as const,
          text: `${result.message}${suggestionText}`,
        },
      ],
      structuredContent: {
        status: result.status,
        total_count: result.totalCount,
        suggestions: result.suggestions,
      } as unknown as Record<string, unknown>,
    };
  }

  // ready 상태
  const restaurantList = result.restaurants
    .slice(0, 10)
    .map(
      (r, i) =>
        `${i + 1}. ${r.name}\n   주소: ${r.roadAddress || r.address}\n   카테고리: ${r.category}`,
    )
    .join('\n\n');

  return {
    content: [
      {
        type: 'text' as const,
        text: `${result.message}\n\n${restaurantList}${result.totalCount > 10 ? `\n\n... 외 ${result.totalCount - 10}개` : ''}`,
      },
    ],
    structuredContent: {
      status: result.status,
      total_count: result.totalCount,
      restaurants: result.restaurants,
    } as unknown as Record<string, unknown>,
  };
}
