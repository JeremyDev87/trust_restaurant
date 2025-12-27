/**
 * get_restaurant_hygiene 도구 핸들러
 *
 * 식당의 위생등급과 행정처분 이력을 조회하는 비즈니스 로직
 */

import type { ToolContext, ToolResult } from '../types.js';
import type { GetRestaurantHygieneInput } from '../definitions/index.js';
import { queryRestaurantHygiene } from '../../core/index.js';
import {
  HygieneRequestSchema,
  validateRequest,
} from '../../utils/validation.js';

/**
 * 식당 위생 정보 조회 핸들러
 *
 * 식약처 공인 위생등급(AAA/AA/A)과 행정처분 이력을 조회합니다.
 * - 입력값을 정규화하고 보안 검사를 수행
 * - queryRestaurantHygiene 코어 함수를 호출하여 데이터 조회
 * - 결과를 MCP 프로토콜 형식으로 포맷팅하여 반환
 *
 * @param args - 도구 입력 (restaurant_name, region, include_history)
 * @param _ctx - 도구 컨텍스트 (현재 사용되지 않음)
 * @returns 도구 실행 결과
 */
export async function handleGetRestaurantHygiene(
  args: GetRestaurantHygieneInput,
  _ctx: ToolContext,
): Promise<ToolResult> {
  // 입력 검증 (정규화 + 보안 검사)
  const validation = validateRequest(HygieneRequestSchema, {
    restaurant_name: args.restaurant_name,
    region: args.region,
    include_history: args.include_history,
  });

  if (!validation.success) {
    return {
      content: [{ type: 'text' as const, text: validation.error.message }],
      isError: true,
    };
  }

  const result = await queryRestaurantHygiene(validation.data);

  if (!result.success) {
    // 에러 응답
    let errorText = result.error.message;

    // 복수 결과인 경우 후보 목록 추가
    if (result.error.code === 'MULTIPLE_RESULTS' && result.error.candidates) {
      const candidateList = result.error.candidates
        .map((c, i) => {
          const info = c.grade ? `등급: ${c.grade}` : c.category || '';
          return `${i + 1}. ${c.name} - ${c.address}${info ? ` (${info})` : ''}`;
        })
        .join('\n');
      errorText = `${result.error.message}\n\n${candidateList}`;
    }

    return {
      content: [{ type: 'text' as const, text: errorText }],
      isError: true,
    };
  }

  // 성공 응답
  return {
    content: [
      {
        type: 'text' as const,
        text: `[${result.data.restaurant.name}]\n${result.summary}\n\n${JSON.stringify(result.data, null, 2)}`,
      },
    ],
    structuredContent: result.data as unknown as Record<string, unknown>,
  };
}
