/**
 * search_area_enhanced 도구 정의
 *
 * 지역 내 식당 고급 검색 (위생등급, 평점 필터링)
 */

import { z } from 'zod';
import { createToolDefinition } from '../types.js';

/**
 * 카테고리 필터
 */
const CategoryFilterSchema = z.enum(['restaurant', 'cafe', 'all']);

/**
 * 위생등급 필터
 */
const HygieneGradeSchema = z.enum(['AAA', 'AA', 'A']);

/**
 * 정렬 기준
 */
const SortBySchema = z.enum(['rating', 'hygiene', 'reviews', 'distance']);

/**
 * search_area_enhanced 도구 정의
 */
export const searchAreaEnhancedDef = createToolDefinition({
  name: 'search_area_enhanced',
  title: '지역 식당 고급 검색',
  description: `지역 내 식당을 고급 필터와 함께 검색합니다.

주요 기능:
- 위생등급 필터링 (AAA, AA, A 선택)
- 최소 평점 필터링
- 카테고리 필터 (음식점, 카페)
- 다양한 정렬 옵션 (평점, 위생, 리뷰수, 거리)

기본 search_area_restaurants와 차이점:
- 각 식당의 위생등급, 플랫폼 평점, 가격대 포함
- 지역 통계 제공 (평균 평점, 위생등급 분포)
- 더 정교한 필터링 옵션

사용 예시:
- "강남역 AAA등급 식당만 보여줘"
- "홍대 평점 4.0 이상 카페 찾아줘"
- "역삼동 위생등급순으로 정렬해서 보여줘"`,
  inputSchema: {
    area: z.string().describe('지역명 (예: 강남구, 역삼역, 홍대입구)'),
    category: CategoryFilterSchema.optional()
      .default('all')
      .describe('카테고리 (restaurant: 음식점, cafe: 카페, all: 전체)'),
    minRating: z
      .number()
      .min(0)
      .max(5)
      .optional()
      .describe('최소 평점 (0-5)'),
    hygieneGrade: z
      .array(HygieneGradeSchema)
      .optional()
      .describe('위생등급 필터 (AAA, AA, A 중 선택)'),
    sortBy: SortBySchema.optional()
      .default('rating')
      .describe('정렬 기준 (rating: 평점, hygiene: 위생, reviews: 리뷰수, distance: 거리)'),
  },
  handler: async () => ({
    content: [{ type: 'text' as const, text: 'Not implemented' }],
  }),
});

/**
 * 도구 입력 타입
 */
export type SearchAreaEnhancedInput = z.infer<
  z.ZodObject<(typeof searchAreaEnhancedDef)['inputSchema']>
>;
