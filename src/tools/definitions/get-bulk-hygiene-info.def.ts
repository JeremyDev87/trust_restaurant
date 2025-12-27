/**
 * get_bulk_hygiene_info 도구 정의
 *
 * 여러 식당의 위생정보를 일괄 조회하고 필터링하는 도구
 */

import { createToolDefinition, z } from '../types.js';

/**
 * 식당 일괄 위생정보 조회 도구
 *
 * 여러 식당의 위생등급과 행정처분 이력을 일괄 조회
 * 필터 옵션으로 깨끗한 식당, 행정처분 이력 있는 식당, 등급 미등록 식당을 조회 가능
 */
export const getBulkHygieneInfoDef = createToolDefinition({
  name: 'get_bulk_hygiene_info',
  title: '식당 일괄 위생정보 조회',
  description:
    '여러 식당의 위생등급과 행정처분 이력을 일괄 조회합니다. 필터 옵션으로 깨끗한 식당(clean), 행정처분 이력이 있는 식당(with_violations), 등급 미등록 식당(no_grade)을 조회할 수 있습니다. search_area_restaurants로 검색한 결과와 함께 사용하세요.',
  inputSchema: {
    restaurants: z
      .array(
        z.object({
          name: z.string().describe('식당명'),
          address: z.string().describe('주소'),
        }),
      )
      .describe('조회할 식당 목록'),
    filter: z
      .enum(['all', 'clean', 'with_violations', 'no_grade'])
      .optional()
      .default('all')
      .describe(
        '필터 옵션 (all: 전체, clean: 깨끗한 식당, with_violations: 행정처분 이력 있음, no_grade: 등급 미등록)',
      ),
    limit: z.number().optional().default(10).describe('반환할 최대 식당 수'),
  },
  // 핸들러는 별도로 설정됨 (ToolRegistry에서 실제 구현과 연결)
  handler: async () => ({
    content: [{ type: 'text' as const, text: 'Not implemented' }],
  }),
});

/**
 * 식당 정보 타입
 */
export type RestaurantInfo = {
  name: string;
  address: string;
};

/**
 * 도구 입력 타입
 */
export type GetBulkHygieneInfoInput = {
  restaurants: RestaurantInfo[];
  filter?: 'all' | 'clean' | 'with_violations' | 'no_grade';
  limit?: number;
};
