/**
 * 일괄 위생정보 조회 서비스
 *
 * 여러 식당의 위생등급 및 행정처분 정보를 일괄 조회하고 필터링합니다.
 */

import type { RestaurantInfo } from '../types/kakao-map.types.js';
import type {
  HygieneFilter,
  BulkHygieneResult,
  RestaurantHygieneInfo,
} from '../types/area-search.types.js';
import type { ViolationHistory } from '../types/domain/restaurant.types.js';
import type { HygieneGradeItem } from './hygiene-grade.service.js';
import { HygieneGradeService } from './hygiene-grade.service.js';
import { ViolationService } from './violation.service.js';
import { parseAddress } from '../utils/address-matcher.js';
import { BULK_CONFIG } from '../config/constants.js';

/**
 * 일괄 위생정보 조회 서비스 인터페이스
 */
export interface BulkHygieneService {
  /**
   * 여러 식당의 위생정보를 일괄 조회하고 필터링
   * @param restaurants - 조회할 식당 목록
   * @param filter - 필터 옵션
   * @param limit - 반환할 최대 개수
   */
  getBulkHygieneInfo(
    restaurants: RestaurantInfo[],
    filter?: HygieneFilter,
    limit?: number,
  ): Promise<BulkHygieneResult>;
}

/**
 * 일괄 위생정보 조회 서비스 구현
 */
export class BulkHygieneServiceImpl implements BulkHygieneService {
  private readonly hygieneGradeService: HygieneGradeService;
  private readonly violationService: ViolationService;

  constructor(
    hygieneGradeService: HygieneGradeService,
    violationService: ViolationService,
  ) {
    this.hygieneGradeService = hygieneGradeService;
    this.violationService = violationService;
  }

  /**
   * 단일 식당의 위생정보 조회
   */
  private async getHygieneInfoForRestaurant(
    restaurant: RestaurantInfo,
  ): Promise<{
    hygieneGrade?: HygieneGradeItem;
    violations?: ViolationHistory;
  }> {
    // 주소에서 지역 추출
    const parsed = parseAddress(restaurant.address || restaurant.roadAddress);
    const region = parsed.sigungu || parsed.sido || '';

    try {
      // 위생등급 및 행정처분 병렬 조회
      const [gradeResult, violationResult] = await Promise.allSettled([
        this.hygieneGradeService.findExactMatch(restaurant.name, region),
        this.violationService.getViolationsForRestaurant(
          restaurant.name,
          region,
          5,
        ),
      ]);

      const hygieneGrade =
        gradeResult.status === 'fulfilled'
          ? (gradeResult.value ?? undefined)
          : undefined;

      const violations =
        violationResult.status === 'fulfilled'
          ? violationResult.value
          : undefined;

      return { hygieneGrade, violations };
    } catch {
      return {};
    }
  }

  /**
   * 필터 조건에 따른 매칭 여부 확인
   */
  private matchesFilter(
    filter: HygieneFilter,
    hygieneGrade?: HygieneGradeItem,
    violations?: ViolationHistory,
  ): { matches: boolean; reason: string } {
    switch (filter) {
      case 'all':
        return { matches: true, reason: '전체 조회' };

      case 'clean': {
        // AAA 또는 AA 등급 + 행정처분 없음
        const hasGoodGrade =
          hygieneGrade?.hygieneGrade?.grade === 'AAA' ||
          hygieneGrade?.hygieneGrade?.grade === 'AA';
        const noViolations = !violations || violations.total_count === 0;

        if (hasGoodGrade && noViolations) {
          return {
            matches: true,
            reason: `${hygieneGrade?.hygieneGrade?.grade} 등급, 행정처분 없음`,
          };
        }
        return { matches: false, reason: '' };
      }

      case 'with_violations': {
        // 행정처분 이력이 있는 경우
        if (violations && violations.total_count > 0) {
          return {
            matches: true,
            reason: `행정처분 ${violations.total_count}건`,
          };
        }
        return { matches: false, reason: '' };
      }

      case 'no_grade': {
        // 위생등급 미등록
        if (!hygieneGrade || !hygieneGrade.hygieneGrade?.has_grade) {
          return { matches: true, reason: '위생등급 미등록' };
        }
        return { matches: false, reason: '' };
      }

      default:
        return { matches: false, reason: '' };
    }
  }

  /**
   * 여러 식당의 위생정보를 일괄 조회하고 필터링
   */
  async getBulkHygieneInfo(
    restaurants: RestaurantInfo[],
    filter: HygieneFilter = 'all',
    limit: number = 10,
  ): Promise<BulkHygieneResult> {
    const results: RestaurantHygieneInfo[] = [];
    let totalChecked = 0;

    // 배치 처리 (API Rate Limit 고려)
    const batchSize = BULK_CONFIG.BATCH_SIZE;
    for (
      let i = 0;
      i < restaurants.length && results.length < limit;
      i += batchSize
    ) {
      const batch = restaurants.slice(i, i + batchSize);

      // 배치 내 병렬 처리
      const batchResults = await Promise.allSettled(
        batch.map(async restaurant => {
          const { hygieneGrade, violations } =
            await this.getHygieneInfoForRestaurant(restaurant);
          return { restaurant, hygieneGrade, violations };
        }),
      );

      // 결과 처리
      for (const result of batchResults) {
        if (result.status !== 'fulfilled') continue;

        totalChecked++;
        const { restaurant, hygieneGrade, violations } = result.value;
        const { matches, reason } = this.matchesFilter(
          filter,
          hygieneGrade,
          violations,
        );

        if (matches && results.length < limit) {
          results.push({
            restaurant,
            hygieneGrade: hygieneGrade
              ? {
                  name: hygieneGrade.name,
                  address: hygieneGrade.address,
                  licenseNo: hygieneGrade.licenseNo,
                  businessType: hygieneGrade.businessType,
                  hygieneGrade: {
                    has_grade: hygieneGrade.hygieneGrade.has_grade,
                    grade: hygieneGrade.hygieneGrade.grade,
                    grade_label: hygieneGrade.hygieneGrade.grade_label,
                    grade_date: hygieneGrade.hygieneGrade.grade_date,
                    valid_until: hygieneGrade.hygieneGrade.valid_until,
                    stars: hygieneGrade.hygieneGrade.stars,
                  },
                }
              : undefined,
            violations,
            matchReason: reason,
          });
        }
      }

      // Rate Limit 방지를 위한 딜레이 (배치 간)
      if (i + batchSize < restaurants.length && results.length < limit) {
        await new Promise(resolve =>
          setTimeout(resolve, BULK_CONFIG.BATCH_DELAY_MS),
        );
      }
    }

    return {
      totalChecked,
      matchedCount: results.length,
      results,
    };
  }
}

/**
 * BulkHygieneService 생성 팩토리
 */
export function createBulkHygieneService(
  hygieneGradeService: HygieneGradeService,
  violationService: ViolationService,
): BulkHygieneService {
  return new BulkHygieneServiceImpl(hygieneGradeService, violationService);
}
