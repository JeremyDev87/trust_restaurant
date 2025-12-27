/**
 * recommend_restaurants 도구 정의
 *
 * 조건 기반 스마트 식당 추천
 */

import { z } from 'zod';
import { createToolDefinition } from '../types.js';

/**
 * 추천 목적
 */
const PurposeSchema = z.enum(['회식', '데이트', '가족모임', '혼밥', '비즈니스미팅']);

/**
 * 카테고리
 */
const CategorySchema = z.enum(['한식', '중식', '일식', '양식', '카페', '전체']);

/**
 * 우선순위 모드
 */
const PrioritySchema = z.enum(['hygiene', 'rating', 'balanced']);

/**
 * 예산 수준
 */
const BudgetSchema = z.enum(['low', 'medium', 'high', 'any']);

/**
 * recommend_restaurants 도구 정의
 */
export const recommendRestaurantsDef = createToolDefinition({
  name: 'recommend_restaurants',
  title: '식당 추천',
  description: `조건에 맞는 식당을 스마트하게 추천합니다.

주요 기능:
- 목적별 추천 (회식, 데이트, 가족모임, 혼밥, 비즈니스미팅)
- 위생등급 우선/평점 우선/균형 모드 선택
- 예산 수준 필터링
- 종합 점수 기반 랭킹 및 추천 이유 제공

사용 예시:
- "강남역 근처 데이트하기 좋은 식당 추천해줘"
- "홍대 위생등급 좋은 한식집 추천"
- "역삼동 회식 장소 5곳 추천"`,
  inputSchema: {
    area: z.string().describe('지역명 (예: 강남구, 역삼역, 홍대입구)'),
    purpose: PurposeSchema.optional().describe(
      '목적 (회식, 데이트, 가족모임, 혼밥, 비즈니스미팅)',
    ),
    category: CategorySchema.optional()
      .default('전체')
      .describe('카테고리 (한식, 중식, 일식, 양식, 카페, 전체)'),
    priority: PrioritySchema.optional()
      .default('balanced')
      .describe('우선순위 (hygiene: 위생, rating: 평점, balanced: 균형)'),
    budget: BudgetSchema.optional()
      .default('any')
      .describe('예산 (low: 저렴, medium: 보통, high: 고급, any: 무관)'),
    limit: z.number().min(1).max(10).optional().default(5).describe('추천 개수 (1~10, 기본 5)'),
  },
  handler: async () => ({
    content: [{ type: 'text' as const, text: 'Not implemented' }],
  }),
});

/**
 * 도구 입력 타입
 */
export type RecommendRestaurantsToolInput = z.infer<
  z.ZodObject<(typeof recommendRestaurantsDef)['inputSchema']>
>;
