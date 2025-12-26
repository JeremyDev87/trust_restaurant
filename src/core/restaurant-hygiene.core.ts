/**
 * 식당 위생 정보 조회 코어 서비스
 *
 * MCP 서버와 REST API에서 공통으로 사용하는 비즈니스 로직
 *
 * 흐름:
 * 1. 카카오맵 API로 식당 검색 (정확한 상호명/주소 획득)
 * 2. 검색 결과로 식약처 API 조회
 * 3. 결과 병합하여 반환
 */

import { createApiClient, ApiError } from '../utils/api-client.js';
import { createHygieneGradeService } from '../services/hygiene-grade.service.js';
import { createViolationService } from '../services/violation.service.js';
import {
  createKakaoMapService,
  KakaoApiError,
} from '../services/kakao-map.service.js';
import { formatSummary } from '../formatters/index.js';
import type {
  RestaurantHygieneResult,
  HygieneGrade,
  ViolationHistory,
} from '../types/domain/restaurant.types.js';
import type { RestaurantInfo } from '../types/kakao-map.types.js';

/**
 * 조회 요청 파라미터
 */
export interface HygieneQueryParams {
  restaurant_name: string;
  region: string;
  include_history?: boolean;
}

/**
 * 식당 후보 정보
 */
export interface RestaurantCandidate {
  name: string;
  address: string;
  category?: string;
  grade?: string;
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
    code:
      | 'NOT_FOUND'
      | 'MULTIPLE_RESULTS'
      | 'API_ERROR'
      | 'KAKAO_API_ERROR'
      | 'UNKNOWN_ERROR';
    message: string;
    candidates?: RestaurantCandidate[];
  };
}

/**
 * 조회 결과 타입
 */
export type HygieneQueryResult = HygieneSuccessResult | HygieneErrorResult;

/**
 * 위생등급 미등록 상태
 */
const NO_HYGIENE_GRADE: HygieneGrade = {
  has_grade: false,
  grade: null,
  grade_label: null,
  grade_date: null,
  valid_until: null,
  stars: 0,
};

/**
 * 빈 행정처분 이력
 */
const EMPTY_VIOLATIONS: ViolationHistory = {
  total_count: 0,
  recent_items: [],
  has_more: false,
};

/**
 * 성공 결과 생성
 */
function buildSuccessResult(
  name: string,
  address: string,
  businessType: string,
  hygieneGrade: HygieneGrade,
  violations: ViolationHistory,
  phone?: string,
  category?: string,
): HygieneSuccessResult {
  const data: RestaurantHygieneResult = {
    restaurant: {
      name,
      address,
      business_type: businessType || category || '음식점',
      phone,
      category,
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
 * 주소에서 구/동 정보 추출
 */
function extractRegionFromAddress(address: string): string {
  // "서울특별시 강남구 역삼동 ..." -> "강남구"
  const match = address.match(/([가-힣]+구)/);
  return match ? match[1] : address;
}

/**
 * 카카오맵 결과를 후보 목록으로 변환
 */
function toRestaurantCandidates(
  places: RestaurantInfo[],
): RestaurantCandidate[] {
  return places.map(place => ({
    name: place.name,
    address: place.roadAddress || place.address,
    category: place.category,
  }));
}

/**
 * 식당 위생 정보 조회
 *
 * @param params - 조회 파라미터
 * @returns 조회 결과
 */
export async function queryRestaurantHygiene(
  params: HygieneQueryParams,
): Promise<HygieneQueryResult> {
  const { restaurant_name, region, include_history = true } = params;

  try {
    // Step 1: 카카오맵으로 식당 검색
    const kakaoMapService = createKakaoMapService();
    const kakaoResults = await kakaoMapService.searchRestaurant(
      restaurant_name,
      region,
    );

    // 카카오맵 검색 결과가 없는 경우 - 기존 식약처 API 직접 검색으로 폴백
    if (kakaoResults.length === 0) {
      return await searchFoodSafetyDirectly(
        restaurant_name,
        region,
        include_history,
      );
    }

    // 카카오맵 검색 결과가 여러 개인 경우
    if (kakaoResults.length > 1) {
      return {
        success: false,
        error: {
          code: 'MULTIPLE_RESULTS',
          message: `"${restaurant_name}" (${region})에 해당하는 식당이 ${kakaoResults.length}곳 있습니다. 더 구체적인 이름이나 지역을 입력해주세요.`,
          candidates: toRestaurantCandidates(kakaoResults),
        },
      };
    }

    // Step 2: 단일 결과 - 식약처 API로 위생등급 조회
    const place = kakaoResults[0];
    const addressRegion = extractRegionFromAddress(place.address);

    const apiClient = createApiClient();
    const hygieneService = createHygieneGradeService(apiClient);
    const violationService = createViolationService(apiClient);

    // 상호명과 주소로 위생등급 검색
    const hygieneResult = await hygieneService.findExactMatch(
      place.name,
      addressRegion,
    );

    // 위생등급을 찾지 못한 경우 - 카카오맵 정보만 반환
    if (!hygieneResult) {
      // 부분 검색 시도
      const searchResult = await hygieneService.searchByName(
        place.name,
        addressRegion,
      );

      if (searchResult.totalCount === 0) {
        // 위생등급 미등록 식당
        return buildSuccessResult(
          place.name,
          place.roadAddress || place.address,
          '',
          NO_HYGIENE_GRADE,
          EMPTY_VIOLATIONS,
          place.phone,
          place.category,
        );
      }

      if (searchResult.totalCount === 1) {
        const match = searchResult.items[0];
        const violations: ViolationHistory = include_history
          ? await violationService.getViolationsForRestaurant(
              match.name,
              addressRegion,
            )
          : EMPTY_VIOLATIONS;

        return buildSuccessResult(
          place.name, // 카카오맵 이름 사용
          place.roadAddress || place.address, // 카카오맵 주소 사용
          match.businessType,
          match.hygieneGrade,
          violations,
          place.phone,
          place.category,
        );
      }

      // 여러 개 매칭 - 카카오맵 정보와 가장 유사한 것 선택
      const bestMatch = searchResult.items[0];
      const violations: ViolationHistory = include_history
        ? await violationService.getViolationsForRestaurant(
            bestMatch.name,
            addressRegion,
          )
        : EMPTY_VIOLATIONS;

      return buildSuccessResult(
        place.name,
        place.roadAddress || place.address,
        bestMatch.businessType,
        bestMatch.hygieneGrade,
        violations,
        place.phone,
        place.category,
      );
    }

    // Step 3: 위생등급 발견 - 행정처분 이력 조회
    const violations: ViolationHistory = include_history
      ? await violationService.getViolationsForRestaurant(
          hygieneResult.name,
          addressRegion,
        )
      : EMPTY_VIOLATIONS;

    return buildSuccessResult(
      place.name, // 카카오맵 이름 사용 (더 정확)
      place.roadAddress || place.address, // 카카오맵 주소 사용
      hygieneResult.businessType,
      hygieneResult.hygieneGrade,
      violations,
      place.phone,
      place.category,
    );
  } catch (error) {
    if (error instanceof KakaoApiError) {
      // 카카오 API 오류 시 기존 방식으로 폴백
      console.error('Kakao API error, falling back to direct search:', error);
      return await searchFoodSafetyDirectly(
        restaurant_name,
        region,
        include_history,
      );
    }

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

/**
 * 식약처 API 직접 검색 (폴백)
 *
 * 카카오맵 검색이 실패하거나 결과가 없을 때 사용
 */
async function searchFoodSafetyDirectly(
  restaurantName: string,
  region: string,
  includeHistory: boolean,
): Promise<HygieneQueryResult> {
  const apiClient = createApiClient();
  const hygieneService = createHygieneGradeService(apiClient);
  const violationService = createViolationService(apiClient);

  // 위생등급 조회
  const hygieneResult = await hygieneService.findExactMatch(
    restaurantName,
    region,
  );

  // 식당을 찾지 못한 경우
  if (!hygieneResult) {
    // 부분 검색 시도
    const searchResult = await hygieneService.searchByName(
      restaurantName,
      region,
    );

    if (searchResult.totalCount === 0) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `"${restaurantName}" (${region})에 해당하는 식당을 찾을 수 없습니다. 위생등급이 부여되지 않은 식당이거나 검색 조건을 확인해주세요.`,
        },
      };
    }

    if (searchResult.totalCount > 1) {
      const candidates = searchResult.items.slice(0, 5).map(item => ({
        name: item.name,
        address: item.address,
        grade: item.hygieneGrade.grade || '등급없음',
      }));

      return {
        success: false,
        error: {
          code: 'MULTIPLE_RESULTS',
          message: `"${restaurantName}" (${region})에 해당하는 식당이 ${searchResult.totalCount}곳 있습니다. 더 구체적인 이름이나 지역을 입력해주세요.`,
          candidates,
        },
      };
    }

    // 단일 결과면 그것을 사용
    const singleMatch = searchResult.items[0];
    const violations: ViolationHistory = includeHistory
      ? await violationService.getViolationsForRestaurant(
          singleMatch.name,
          region,
        )
      : EMPTY_VIOLATIONS;

    return buildSuccessResult(
      singleMatch.name,
      singleMatch.address,
      singleMatch.businessType,
      singleMatch.hygieneGrade,
      violations,
    );
  }

  // 정확히 일치하는 식당 발견
  const violations: ViolationHistory = includeHistory
    ? await violationService.getViolationsForRestaurant(
        hygieneResult.name,
        region,
      )
    : EMPTY_VIOLATIONS;

  return buildSuccessResult(
    hygieneResult.name,
    hygieneResult.address,
    hygieneResult.businessType,
    hygieneResult.hygieneGrade,
    violations,
  );
}
