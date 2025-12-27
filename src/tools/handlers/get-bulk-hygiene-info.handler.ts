/**
 * get_bulk_hygiene_info 도구 핸들러
 *
 * 여러 식당의 위생정보를 일괄 조회하고 필터링하는 비즈니스 로직
 */

import type { ToolContext, ToolResult } from '../types.js';
import type { GetBulkHygieneInfoInput } from '../definitions/index.js';
import {
  BulkHygieneRequestSchema,
  validateRequest,
} from '../../utils/validation.js';

/**
 * 필터별 설명 상수
 */
const FILTER_DESCRIPTIONS: Record<string, string> = {
  all: '식당',
  clean: '깨끗한 식당 (AAA/AA 등급 + 행정처분 없음)',
  with_violations: '행정처분 이력이 있는 식당',
  no_grade: '위생등급 미등록 식당',
};

/**
 * 식당 일괄 위생정보 조회 핸들러
 *
 * 여러 식당의 위생등급과 행정처분 이력을 일괄 조회합니다.
 * - 필터 옵션으로 특정 조건의 식당만 조회 가능
 * - search_area_restaurants로 검색한 결과와 함께 사용 권장
 *
 * @param args - 도구 입력 (restaurants, filter, limit)
 * @param ctx - 도구 컨텍스트 (bulkHygiene 서비스 사용)
 * @returns 도구 실행 결과
 */
export async function handleGetBulkHygieneInfo(
  args: GetBulkHygieneInfoInput,
  ctx: ToolContext,
): Promise<ToolResult> {
  // 입력 검증 (정규화 + 보안 검사)
  const validation = validateRequest(BulkHygieneRequestSchema, {
    restaurants: args.restaurants,
    filter: args.filter,
    limit: args.limit,
  });

  if (!validation.success) {
    return {
      content: [{ type: 'text' as const, text: validation.error.message }],
      isError: true,
    };
  }

  // RestaurantInfo 형태로 변환
  const restaurantInfos = validation.data.restaurants.map((r, i) => ({
    id: String(i),
    name: r.name,
    address: r.address,
    roadAddress: r.address,
    phone: '',
    category: '',
    longitude: '',
    latitude: '',
  }));

  const result = await ctx.bulkHygiene.getBulkHygieneInfo(
    restaurantInfos,
    validation.data.filter,
    validation.data.limit,
  );

  if (result.matchedCount === 0) {
    const filterDescription =
      FILTER_DESCRIPTIONS[validation.data.filter || 'all'];

    return {
      content: [
        {
          type: 'text' as const,
          text: `조회한 ${result.totalChecked}개 식당 중 조건에 맞는 ${filterDescription}을 찾지 못했습니다.`,
        },
      ],
    };
  }

  // 결과 포맷팅
  const resultList = result.results
    .map((r, i) => {
      const gradeInfo = r.hygieneGrade?.hygieneGrade?.has_grade
        ? `등급: ${r.hygieneGrade.hygieneGrade.grade} (${r.hygieneGrade.hygieneGrade.grade_label})`
        : '등급: 미등록';

      const violationInfo =
        r.violations && r.violations.total_count > 0
          ? `행정처분: ${r.violations.total_count}건`
          : '행정처분: 없음';

      return `${i + 1}. ${r.restaurant.name}\n   주소: ${r.restaurant.roadAddress || r.restaurant.address}\n   ${gradeInfo}\n   ${violationInfo}\n   매칭: ${r.matchReason}`;
    })
    .join('\n\n');

  return {
    content: [
      {
        type: 'text' as const,
        text: `총 ${result.totalChecked}개 중 ${result.matchedCount}개 매칭\n\n${resultList}`,
      },
    ],
    structuredContent: {
      total_checked: result.totalChecked,
      matched_count: result.matchedCount,
      results: result.results,
    } as unknown as Record<string, unknown>,
  };
}
