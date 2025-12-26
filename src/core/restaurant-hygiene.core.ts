/**
 * 식당 위생 정보 조회 코어 서비스
 *
 * MCP 서버와 REST API에서 공통으로 사용하는 비즈니스 로직
 */

import { createApiClient, ApiError } from '../utils/api-client.js';
import { createHygieneGradeService } from '../services/hygiene-grade.service.js';
import { createViolationService } from '../services/violation.service.js';
import { formatSummary } from '../formatters/index.js';
import type {
  RestaurantHygieneResult,
  HygieneGrade,
  ViolationHistory,
} from '../types/domain/restaurant.types.js';

/**
 * 조회 요청 파라미터
 */
export interface HygieneQueryParams {
  restaurant_name: string;
  region: string;
  include_history?: boolean;
}

/**
 * 성공 응답 타입
 */
export interface HygieneSuccessResult {
  success: true;
  data: RestaurantHygieneResult;
  summary: string;
}

/**
 * 에러 응답 타입
 */
export interface HygieneErrorResult {
  success: false;
  error: {
    code: 'NOT_FOUND' | 'MULTIPLE_RESULTS' | 'API_ERROR' | 'UNKNOWN_ERROR';
    message: string;
    candidates?: Array<{
      name: string;
      address: string;
      grade: string;
    }>;
  };
}

/**
 * 조회 결과 타입
 */
export type HygieneQueryResult = HygieneSuccessResult | HygieneErrorResult;

/**
 * 성공 결과 생성
 */
function buildSuccessResult(
  name: string,
  address: string,
  businessType: string,
  hygieneGrade: HygieneGrade,
  violations: ViolationHistory
): HygieneSuccessResult {
  const data: RestaurantHygieneResult = {
    restaurant: {
      name,
      address,
      business_type: businessType,
    },
    hygiene_grade: hygieneGrade,
    violations,
  };

  const summaryResult = formatSummary(data);

  return {
    success: true,
    data,
    summary: summaryResult.text,
  };
}

/**
 * 식당 위생 정보 조회
 *
 * @param params - 조회 파라미터
 * @returns 조회 결과
 */
export async function queryRestaurantHygiene(
  params: HygieneQueryParams
): Promise<HygieneQueryResult> {
  const { restaurant_name, region, include_history = true } = params;

  try {
    // API 클라이언트 및 서비스 초기화
    const apiClient = createApiClient();
    const hygieneService = createHygieneGradeService(apiClient);
    const violationService = createViolationService(apiClient);

    // 위생등급 조회
    const hygieneResult = await hygieneService.findExactMatch(
      restaurant_name,
      region
    );

    // 식당을 찾지 못한 경우
    if (!hygieneResult) {
      // 부분 검색 시도
      const searchResult = await hygieneService.searchByName(
        restaurant_name,
        region
      );

      if (searchResult.totalCount === 0) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `"${restaurant_name}" (${region})에 해당하는 식당을 찾을 수 없습니다. 위생등급이 부여되지 않은 식당이거나 검색 조건을 확인해주세요.`,
          },
        };
      }

      if (searchResult.totalCount > 1) {
        const candidates = searchResult.items.slice(0, 5).map((item) => ({
          name: item.name,
          address: item.address,
          grade: item.hygieneGrade.grade || '등급없음',
        }));

        return {
          success: false,
          error: {
            code: 'MULTIPLE_RESULTS',
            message: `"${restaurant_name}" (${region})에 해당하는 식당이 ${searchResult.totalCount}곳 있습니다. 더 구체적인 이름이나 지역을 입력해주세요.`,
            candidates,
          },
        };
      }

      // 단일 결과면 그것을 사용
      const singleMatch = searchResult.items[0];
      const violations: ViolationHistory = include_history
        ? await violationService.getViolationsForRestaurant(
            singleMatch.name,
            region
          )
        : { total_count: 0, recent_items: [], has_more: false };

      return buildSuccessResult(
        singleMatch.name,
        singleMatch.address,
        singleMatch.businessType,
        singleMatch.hygieneGrade,
        violations
      );
    }

    // 정확히 일치하는 식당 발견
    const violations: ViolationHistory = include_history
      ? await violationService.getViolationsForRestaurant(
          hygieneResult.name,
          region
        )
      : { total_count: 0, recent_items: [], has_more: false };

    return buildSuccessResult(
      hygieneResult.name,
      hygieneResult.address,
      hygieneResult.businessType,
      hygieneResult.hygieneGrade,
      violations
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: `API 오류가 발생했습니다: ${error.message} (코드: ${error.code})`,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: `알 수 없는 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
}
