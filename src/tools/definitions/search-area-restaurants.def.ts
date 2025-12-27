/**
 * search_area_restaurants 도구 정의
 *
 * 특정 지역 내 식당과 카페를 탐색하는 도구
 */

import { createToolDefinition, z } from '../types.js';

/**
 * 지역 내 식당 탐색 도구
 *
 * 결과가 50개를 초과하면 더 구체적인 지역을 입력하도록 안내
 */
export const searchAreaRestaurantsDef = createToolDefinition({
  name: 'search_area_restaurants',
  title: '지역 내 식당 탐색',
  description:
    '특정 지역 내 식당과 카페를 탐색합니다. 결과가 50개를 초과하면 더 구체적인 지역을 입력하도록 안내합니다. 예: "강남구 식당", "역삼역 근처 카페", "홍대 맛집"',
  inputSchema: {
    area: z
      .string()
      .describe(
        '지역명 - 구/동/역/장소 이름 (예: 강남구, 역삼동, 역삼역, 홍대입구)',
      ),
    category: z
      .enum(['restaurant', 'cafe', 'all'])
      .optional()
      .default('all')
      .describe('카테고리 필터 (restaurant: 음식점, cafe: 카페, all: 전체)'),
  },
  // 핸들러는 별도로 설정됨 (ToolRegistry에서 실제 구현과 연결)
  handler: async () => ({
    content: [{ type: 'text' as const, text: 'Not implemented' }],
  }),
});

/**
 * 도구 입력 타입
 */
export type SearchAreaRestaurantsInput = {
  area: string;
  category?: 'restaurant' | 'cafe' | 'all';
};
