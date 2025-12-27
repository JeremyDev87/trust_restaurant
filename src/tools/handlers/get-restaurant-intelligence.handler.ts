/**
 * get_restaurant_intelligence 도구 핸들러
 *
 * 식당 종합 정보 조회 (카카오, 네이버, 식약처 통합)
 */

import type { ToolContext, ToolResult } from '../types.js';
import type { GetRestaurantIntelligenceInput } from '../definitions/get-restaurant-intelligence.def.js';

/**
 * 위생등급 레이블
 */
const GRADE_LABELS: Record<string, string> = {
  AAA: '매우 우수',
  AA: '우수',
  A: '좋음',
};

/**
 * 가격대 레이블
 */
const PRICE_LABELS: Record<string, string> = {
  low: '1인 1만원대',
  medium: '1인 2-3만원대',
  high: '1인 4만원 이상',
};

/**
 * 식당 종합 정보 조회 핸들러
 *
 * RestaurantIntelligenceService를 사용하여 여러 소스에서 통합된 정보를 조회합니다.
 *
 * @param args - 도구 입력 (restaurant_name, region)
 * @param ctx - 도구 컨텍스트
 * @returns 도구 실행 결과
 */
export async function handleGetRestaurantIntelligence(
  args: GetRestaurantIntelligenceInput,
  ctx: ToolContext,
): Promise<ToolResult> {
  try {
    // 서비스 호출
    const result = await ctx.intelligence.getRestaurantIntelligence(
      args.restaurant_name,
      args.region,
    );

    if (!result) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `'${args.restaurant_name}'을(를) '${args.region}'에서 찾을 수 없습니다.`,
          },
        ],
        isError: true,
      };
    }

    // 결과 포맷팅
    const lines: string[] = [];

    // 기본 정보
    lines.push(`[${result.name}]`);
    lines.push(`주소: ${result.address}`);
    lines.push(`카테고리: ${result.category}`);
    if (result.phone) {
      lines.push(`전화: ${result.phone}`);
    }
    lines.push('');

    // 위생 정보
    lines.push('📋 위생 정보');
    if (result.hygiene.grade) {
      const gradeLabel = GRADE_LABELS[result.hygiene.grade] || '';
      const stars = '⭐'.repeat(result.hygiene.stars);
      lines.push(`  등급: ${result.hygiene.grade} ${gradeLabel} ${stars}`);
    } else {
      lines.push('  등급: 미등록');
    }
    lines.push(
      `  행정처분: ${result.hygiene.hasViolations ? '⚠️ 있음' : '✅ 없음'}`,
    );
    if (result.hygiene.violationCount > 0) {
      lines.push(`  처분 건수: ${result.hygiene.violationCount}건`);
    }
    lines.push('');

    // 평점 정보
    lines.push('⭐ 평점 정보');
    if (result.ratings.kakao) {
      lines.push(
        `  카카오: ${result.ratings.kakao.score?.toFixed(1) ?? '-'} (${result.ratings.kakao.reviews}개 리뷰)`,
      );
    }
    if (result.ratings.naver) {
      lines.push(
        `  네이버: ${result.ratings.naver.score?.toFixed(1) ?? '-'} (${result.ratings.naver.reviews}개 리뷰)`,
      );
    }
    if (result.ratings.combined !== null) {
      lines.push(`  통합 평점: ${result.ratings.combined.toFixed(1)}`);
    }
    lines.push('');

    // 부가 정보
    lines.push('💰 부가 정보');
    const priceLabel = result.priceRange
      ? PRICE_LABELS[result.priceRange]
      : '정보 없음';
    lines.push(`  가격대: ${priceLabel}`);
    if (result.businessHours) {
      lines.push(`  영업시간: ${result.businessHours}`);
    }
    lines.push('');

    // 점수 정보
    lines.push('📊 종합 점수');
    lines.push(`  위생: ${result.scores.hygiene}점`);
    lines.push(`  인기도: ${result.scores.popularity}점`);
    lines.push(`  종합: ${result.scores.overall}점`);

    return {
      content: [{ type: 'text' as const, text: lines.join('\n') }],
      structuredContent: result as unknown as Record<string, unknown>,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '정보 조회 중 오류가 발생했습니다.';
    return {
      content: [{ type: 'text' as const, text: message }],
      isError: true,
    };
  }
}
