/**
 * Hygiene 서비스
 *
 * 코어 비즈니스 로직을 NestJS 서비스로 래핑
 */

import { Injectable, Inject } from '@nestjs/common';
import {
  queryRestaurantHygiene,
  type HygieneQueryParams,
  type HygieneQueryServices,
} from '../../core/index.js';
import {
  HYGIENE_GRADE_SERVICE_TOKEN,
  VIOLATION_SERVICE_TOKEN,
  CACHE_SERVICE_TOKEN,
  KAKAO_MAP_SERVICE_TOKEN,
} from '../../providers/index.js';
import type { HygieneGradeService } from '../../services/hygiene-grade.service.js';
import type { ViolationService } from '../../services/violation.service.js';
import type { CacheService } from '../../services/cache.service.js';
import type { KakaoMapService } from '../../services/kakao-map.service.js';
import type { RestaurantHygieneResult } from '../../types/domain/restaurant.types.js';

/**
 * REST API 응답 타입
 */
export interface HygieneApiResponse {
  success: boolean;
  data?: RestaurantHygieneResult;
  summary?: string;
  error?: {
    code: string;
    message: string;
    candidates?: Array<{
      name: string;
      address: string;
      category?: string;
      grade?: string;
    }>;
  };
  statusCode?: number;
}

@Injectable()
export class HygieneService {
  private readonly services: HygieneQueryServices;

  constructor(
    @Inject(HYGIENE_GRADE_SERVICE_TOKEN)
    hygieneGradeService: HygieneGradeService,
    @Inject(VIOLATION_SERVICE_TOKEN)
    violationService: ViolationService,
    @Inject(CACHE_SERVICE_TOKEN)
    cacheService: CacheService,
    @Inject(KAKAO_MAP_SERVICE_TOKEN)
    kakaoMapService: KakaoMapService,
  ) {
    this.services = {
      hygieneGradeService,
      violationService,
      cacheService,
      kakaoMapService,
    };
  }

  /**
   * 식당 위생 정보 조회
   */
  async query(params: HygieneQueryParams): Promise<HygieneApiResponse> {
    const result = await queryRestaurantHygiene(params, this.services);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        summary: result.summary,
      };
    }

    // 에러 응답
    const statusCode =
      result.error.code === 'NOT_FOUND' ||
      result.error.code === 'MULTIPLE_RESULTS'
        ? 404
        : 500;

    return {
      success: false,
      error: result.error,
      statusCode,
    };
  }
}
