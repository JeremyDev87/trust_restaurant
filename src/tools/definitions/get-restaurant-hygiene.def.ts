/**
 * get_restaurant_hygiene 도구 정의
 *
 * 식당의 위생정보, 위생등급, 행정처분 이력을 조회하는 도구
 */

import { createToolDefinition, z } from '../types.js';

/**
 * 식당 위생 정보 조회 도구
 *
 * 식약처 공인 위생등급(AAA/AA/A)과 행정처분 이력을 확인
 */
export const getRestaurantHygieneDef = createToolDefinition({
  name: 'get_restaurant_hygiene',
  title: '식당 위생 정보 조회',
  description:
    '식당, 음식점, 카페, 맛집의 위생정보, 위생등급, 위생상태, 청결도를 조회합니다. 식약처 공인 위생등급(AAA/AA/A)과 행정처분 이력을 확인할 수 있습니다. 예: "스타벅스 강남 위생등급", "맥도날드 종로 위생정보", "근처 식당 청결도"',
  inputSchema: {
    restaurant_name: z
      .string()
      .describe('식당/음식점/카페 상호명 (예: 스타벅스, 맥도날드, 본죽)'),
    region: z
      .string()
      .describe('지역명 - 시/구/동/역 이름 (예: 강남구, 역삼동, 역삼역)'),
    include_history: z
      .boolean()
      .optional()
      .default(true)
      .describe('행정처분 이력 포함 여부'),
  },
  // 핸들러는 별도로 설정됨 (ToolRegistry에서 실제 구현과 연결)
  handler: async () => ({
    content: [{ type: 'text' as const, text: 'Not implemented' }],
  }),
});

/**
 * 도구 입력 타입
 */
export type GetRestaurantHygieneInput = {
  restaurant_name: string;
  region: string;
  include_history?: boolean;
};
