/**
 * Hygiene 서비스
 *
 * 코어 비즈니스 로직을 NestJS 서비스로 래핑
 */

import { Injectable } from '@nestjs/common';
import {
  queryRestaurantHygiene,
  type HygieneQueryParams,
} from '../../core/index.js';
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
  /**
   * 식당 위생 정보 조회
   */
  async query(params: HygieneQueryParams): Promise<HygieneApiResponse> {
    const result = await queryRestaurantHygiene(params);

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
