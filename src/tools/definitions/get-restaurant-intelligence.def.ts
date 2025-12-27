/**
 * get_restaurant_intelligence 도구 정의
 *
 * 식당 종합 정보 조회 (카카오, 네이버, 식약처 통합)
 */

import { z } from 'zod';
import { createToolDefinition } from '../types.js';

/**
 * get_restaurant_intelligence 도구 정의
 */
export const getRestaurantIntelligenceDef = createToolDefinition({
  name: 'get_restaurant_intelligence',
  title: '식당 종합 정보',
  description: `식당의 종합 정보를 여러 소스에서 통합 조회합니다.

통합 데이터 소스:
- 카카오맵: 위치, 카테고리, 평점
- 네이버 플레이스: 평점, 리뷰 수, 가격대
- 식약처: 위생등급(AAA/AA/A), 행정처분 이력

제공 정보:
- 기본 정보: 이름, 주소, 카테고리, 전화번호
- 위생 정보: 등급, 별점, 행정처분 여부
- 평점 정보: 카카오/네이버 개별 + 통합 평점
- 점수 정보: 위생 점수, 인기도 점수, 종합 점수 (0-100)

사용 예시:
- "스타벅스 강남점 정보 알려줘"
- "맥도날드 홍대점 위생등급이랑 평점 보여줘"`,
  inputSchema: {
    restaurant_name: z.string().describe('식당명'),
    region: z.string().describe('지역명 (예: 강남구, 역삼동, 홍대입구)'),
  },
  handler: async () => ({
    content: [{ type: 'text' as const, text: 'Not implemented' }],
  }),
});

/**
 * 도구 입력 타입
 */
export type GetRestaurantIntelligenceInput = z.infer<
  z.ZodObject<(typeof getRestaurantIntelligenceDef)['inputSchema']>
>;
