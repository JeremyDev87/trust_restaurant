/**
 * compare_restaurants 도구 정의
 *
 * 여러 식당의 위생등급, 평점, 가격대를 비교 분석
 */

import { z } from 'zod';
import { createToolDefinition } from '../types.js';

/**
 * 비교 항목
 */
const ComparisonCriteriaSchema = z.enum([
  'hygiene',
  'rating',
  'price',
  'reviews',
]);

/**
 * 비교할 식당 식별자
 */
const RestaurantIdentifierSchema = z.object({
  name: z.string().describe('식당명'),
  region: z.string().describe('지역명 (예: 강남구, 역삼동)'),
});

/**
 * compare_restaurants 도구 정의
 */
export const compareRestaurantsDef = createToolDefinition({
  name: 'compare_restaurants',
  title: '식당 비교',
  description: `여러 식당의 위생등급, 평점, 가격대를 비교 분석합니다.

주요 기능:
- 2~5개 식당 동시 비교
- 위생등급(AAA/AA/A), 플랫폼 평점, 가격대, 리뷰 수 비교
- 종합 점수 기반 랭킹 제공
- 최우수 식당 자동 분석 (위생, 평점, 가성비)

사용 예시:
- "스타벅스와 투썸플레이스 비교해줘"
- "강남역 맛집 3곳 위생등급 비교"`,
  inputSchema: {
    restaurants: z
      .array(RestaurantIdentifierSchema)
      .min(2)
      .max(5)
      .describe('비교할 식당 목록 (2~5개)'),
    criteria: z
      .array(ComparisonCriteriaSchema)
      .min(1)
      .max(4)
      .optional()
      .default(['hygiene', 'rating', 'price', 'reviews'])
      .describe(
        '비교 항목 (hygiene: 위생, rating: 평점, price: 가격, reviews: 리뷰)',
      ),
  },
  handler: async () => ({
    content: [{ type: 'text' as const, text: 'Not implemented' }],
  }),
});

/**
 * 도구 입력 타입
 */
export type CompareRestaurantsToolInput = z.infer<
  z.ZodObject<(typeof compareRestaurantsDef)['inputSchema']>
>;
