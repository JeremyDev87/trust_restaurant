/**
 * 식당 위생 정보 조회 코어 로직 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  queryRestaurantHygiene,
  type HygieneQueryParams,
  type HygieneSuccessResult,
  type HygieneErrorResult,
} from './restaurant-hygiene.core.js';
import * as kakaoMapServiceModule from '../services/kakao-map.service.js';
import * as hygieneGradeServiceModule from '../services/hygiene-grade.service.js';
import * as violationServiceModule from '../services/violation.service.js';
import * as apiClientModule from '../utils/api-client.js';
import type { RestaurantInfo } from '../types/kakao-map.types.js';
import type { HygieneGradeItem } from '../services/hygiene-grade.service.js';
import type { ViolationHistory } from '../types/domain/restaurant.types.js';

// Mock 서비스 객체들
const mockKakaoMapService = {
  searchRestaurant: vi.fn(),
  searchByArea: vi.fn(),
  isAvailable: vi.fn().mockReturnValue(true),
};

const mockHygieneGradeService = {
  searchByName: vi.fn(),
  findExactMatch: vi.fn(),
  getByLicenseNo: vi.fn(),
};

const mockViolationService = {
  searchByName: vi.fn(),
  getViolationsForRestaurant: vi.fn(),
  getByLicenseNo: vi.fn(),
};

const mockApiClient = {
  fetch: vi.fn(),
  buildUrl: vi.fn(),
};

// 테스트 데이터
const sampleKakaoResult: RestaurantInfo = {
  id: '12345',
  name: '스타벅스 강남역점',
  address: '서울특별시 강남구 역삼동 123',
  roadAddress: '서울 강남구 강남대로 396',
  phone: '02-1234-5678',
  category: '카페 > 커피전문점',
  longitude: '127.028',
  latitude: '37.498',
};

const sampleHygieneGradeItem: HygieneGradeItem = {
  name: '스타벅스 강남역점',
  address: '서울특별시 강남구 역삼동 123-45',
  licenseNo: '20200123456',
  businessType: '휴게음식점',
  hygieneGrade: {
    has_grade: true,
    grade: 'AAA',
    grade_label: '매우 우수',
    grade_date: '2024-01-15',
    valid_until: '2026-01-14',
    stars: 3,
  },
};

const emptyViolations: ViolationHistory = {
  total_count: 0,
  recent_items: [],
  has_more: false,
};

const sampleViolations: ViolationHistory = {
  total_count: 1,
  recent_items: [
    {
      date: '2024-01-01',
      type: '시정명령',
      content: '위생관리 개선',
      reason: '주방 청결 불량',
    },
  ],
  has_more: false,
};

describe('queryRestaurantHygiene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FOOD_API_KEY = 'test-api-key';

    // Mock 팩토리 함수들
    vi.spyOn(kakaoMapServiceModule, 'createKakaoMapService').mockReturnValue(
      mockKakaoMapService as unknown as kakaoMapServiceModule.KakaoMapService,
    );
    vi.spyOn(
      hygieneGradeServiceModule,
      'createHygieneGradeService',
    ).mockReturnValue(
      mockHygieneGradeService as unknown as hygieneGradeServiceModule.HygieneGradeService,
    );
    vi.spyOn(violationServiceModule, 'createViolationService').mockReturnValue(
      mockViolationService as unknown as violationServiceModule.ViolationService,
    );
    vi.spyOn(apiClientModule, 'createApiClient').mockReturnValue(
      mockApiClient as unknown as apiClientModule.FoodSafetyApiClient,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.FOOD_API_KEY;
  });

  describe('카카오맵 단일 결과 + 위생등급 있음', () => {
    it('성공 응답을 반환한다', async () => {
      mockKakaoMapService.searchRestaurant.mockResolvedValue([
        sampleKakaoResult,
      ]);
      mockHygieneGradeService.findExactMatch.mockResolvedValue(
        sampleHygieneGradeItem,
      );
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const params: HygieneQueryParams = {
        restaurant_name: '스타벅스',
        region: '강남구',
        include_history: true,
      };

      const result = await queryRestaurantHygiene(params);

      expect(result.success).toBe(true);
      const successResult = result as HygieneSuccessResult;
      expect(successResult.data.restaurant.name).toBe('스타벅스 강남역점');
      expect(successResult.data.hygiene_grade.grade).toBe('AAA');
      expect(successResult.data.violations.total_count).toBe(0);
      expect(successResult.summary).toContain('매우 우수');
    });

    it('include_history가 false면 행정처분을 조회하지 않는다', async () => {
      mockKakaoMapService.searchRestaurant.mockResolvedValue([
        sampleKakaoResult,
      ]);
      mockHygieneGradeService.findExactMatch.mockResolvedValue(
        sampleHygieneGradeItem,
      );

      const params: HygieneQueryParams = {
        restaurant_name: '스타벅스',
        region: '강남구',
        include_history: false,
      };

      const result = await queryRestaurantHygiene(params);

      expect(result.success).toBe(true);
      expect(
        mockViolationService.getViolationsForRestaurant,
      ).not.toHaveBeenCalled();
    });
  });

  describe('카카오맵 복수 결과', () => {
    it('MULTIPLE_RESULTS 에러를 반환한다', async () => {
      const multipleResults: RestaurantInfo[] = [
        sampleKakaoResult,
        { ...sampleKakaoResult, id: '12346', name: '스타벅스 역삼역점' },
        { ...sampleKakaoResult, id: '12347', name: '스타벅스 선릉역점' },
      ];
      mockKakaoMapService.searchRestaurant.mockResolvedValue(multipleResults);

      const params: HygieneQueryParams = {
        restaurant_name: '스타벅스',
        region: '강남구',
      };

      const result = await queryRestaurantHygiene(params);

      expect(result.success).toBe(false);
      const errorResult = result as HygieneErrorResult;
      expect(errorResult.error.code).toBe('MULTIPLE_RESULTS');
      expect(errorResult.error.candidates).toHaveLength(3);
      expect(errorResult.error.message).toContain('3곳');
    });
  });

  describe('카카오맵 결과 없음 - 식약처 직접 검색 폴백', () => {
    it('식약처에서 찾으면 성공 응답을 반환한다', async () => {
      mockKakaoMapService.searchRestaurant.mockResolvedValue([]);
      mockHygieneGradeService.findExactMatch.mockResolvedValue(
        sampleHygieneGradeItem,
      );
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const params: HygieneQueryParams = {
        restaurant_name: '스타벅스',
        region: '강남구',
      };

      const result = await queryRestaurantHygiene(params);

      expect(result.success).toBe(true);
      const successResult = result as HygieneSuccessResult;
      expect(successResult.data.restaurant.name).toBe('스타벅스 강남역점');
    });

    it('식약처에서도 못 찾으면 NOT_FOUND 에러를 반환한다', async () => {
      mockKakaoMapService.searchRestaurant.mockResolvedValue([]);
      mockHygieneGradeService.findExactMatch.mockResolvedValue(null);
      mockHygieneGradeService.searchByName.mockResolvedValue({
        items: [],
        totalCount: 0,
      });

      const params: HygieneQueryParams = {
        restaurant_name: '없는식당',
        region: '강남구',
      };

      const result = await queryRestaurantHygiene(params);

      expect(result.success).toBe(false);
      const errorResult = result as HygieneErrorResult;
      expect(errorResult.error.code).toBe('NOT_FOUND');
      expect(errorResult.error.message).toContain('없는식당');
    });

    it('식약처에서 복수 결과면 MULTIPLE_RESULTS 에러를 반환한다', async () => {
      mockKakaoMapService.searchRestaurant.mockResolvedValue([]);
      mockHygieneGradeService.findExactMatch.mockResolvedValue(null);
      mockHygieneGradeService.searchByName.mockResolvedValue({
        items: [
          sampleHygieneGradeItem,
          { ...sampleHygieneGradeItem, name: '스타벅스 2호점' },
        ],
        totalCount: 2,
      });

      const params: HygieneQueryParams = {
        restaurant_name: '스타벅스',
        region: '강남구',
      };

      const result = await queryRestaurantHygiene(params);

      expect(result.success).toBe(false);
      const errorResult = result as HygieneErrorResult;
      expect(errorResult.error.code).toBe('MULTIPLE_RESULTS');
    });

    it('식약처에서 단일 결과면 성공 응답을 반환한다', async () => {
      mockKakaoMapService.searchRestaurant.mockResolvedValue([]);
      mockHygieneGradeService.findExactMatch.mockResolvedValue(null);
      mockHygieneGradeService.searchByName.mockResolvedValue({
        items: [sampleHygieneGradeItem],
        totalCount: 1,
      });
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const params: HygieneQueryParams = {
        restaurant_name: '스타벅스',
        region: '강남구',
      };

      const result = await queryRestaurantHygiene(params);

      expect(result.success).toBe(true);
    });
  });

  describe('카카오맵 단일 결과 + 위생등급 없음', () => {
    it('위생등급 미등록 상태로 반환한다', async () => {
      mockKakaoMapService.searchRestaurant.mockResolvedValue([
        sampleKakaoResult,
      ]);
      mockHygieneGradeService.findExactMatch.mockResolvedValue(null);
      mockHygieneGradeService.searchByName.mockResolvedValue({
        items: [],
        totalCount: 0,
      });

      const params: HygieneQueryParams = {
        restaurant_name: '동네분식',
        region: '강남구',
      };

      const result = await queryRestaurantHygiene(params);

      expect(result.success).toBe(true);
      const successResult = result as HygieneSuccessResult;
      expect(successResult.data.hygiene_grade.has_grade).toBe(false);
      expect(successResult.data.hygiene_grade.grade).toBeNull();
    });

    it('부분 검색으로 단일 결과를 찾으면 해당 정보를 사용한다', async () => {
      mockKakaoMapService.searchRestaurant.mockResolvedValue([
        sampleKakaoResult,
      ]);
      mockHygieneGradeService.findExactMatch.mockResolvedValue(null);
      mockHygieneGradeService.searchByName.mockResolvedValue({
        items: [sampleHygieneGradeItem],
        totalCount: 1,
      });
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const params: HygieneQueryParams = {
        restaurant_name: '스타벅스',
        region: '강남구',
      };

      const result = await queryRestaurantHygiene(params);

      expect(result.success).toBe(true);
      const successResult = result as HygieneSuccessResult;
      expect(successResult.data.hygiene_grade.grade).toBe('AAA');
    });

    it('부분 검색으로 복수 결과면 첫 번째를 선택한다', async () => {
      mockKakaoMapService.searchRestaurant.mockResolvedValue([
        sampleKakaoResult,
      ]);
      mockHygieneGradeService.findExactMatch.mockResolvedValue(null);
      mockHygieneGradeService.searchByName.mockResolvedValue({
        items: [
          sampleHygieneGradeItem,
          { ...sampleHygieneGradeItem, name: '다른 스타벅스' },
        ],
        totalCount: 2,
      });
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const params: HygieneQueryParams = {
        restaurant_name: '스타벅스',
        region: '강남구',
      };

      const result = await queryRestaurantHygiene(params);

      expect(result.success).toBe(true);
      const successResult = result as HygieneSuccessResult;
      expect(successResult.data.hygiene_grade.grade).toBe('AAA');
    });
  });

  describe('행정처분 이력 조회', () => {
    it('행정처분 이력이 있으면 포함한다', async () => {
      mockKakaoMapService.searchRestaurant.mockResolvedValue([
        sampleKakaoResult,
      ]);
      mockHygieneGradeService.findExactMatch.mockResolvedValue(
        sampleHygieneGradeItem,
      );
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        sampleViolations,
      );

      const params: HygieneQueryParams = {
        restaurant_name: '스타벅스',
        region: '강남구',
        include_history: true,
      };

      const result = await queryRestaurantHygiene(params);

      expect(result.success).toBe(true);
      const successResult = result as HygieneSuccessResult;
      expect(successResult.data.violations.total_count).toBe(1);
      expect(successResult.data.violations.recent_items[0].type).toBe(
        '시정명령',
      );
    });
  });

  describe('에러 핸들링', () => {
    it('카카오 API 에러 시 식약처 직접 검색으로 폴백한다', async () => {
      mockKakaoMapService.searchRestaurant.mockRejectedValue(
        new kakaoMapServiceModule.KakaoApiError('API Error', 'API_ERROR', 500),
      );
      mockHygieneGradeService.findExactMatch.mockResolvedValue(
        sampleHygieneGradeItem,
      );
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const params: HygieneQueryParams = {
        restaurant_name: '스타벅스',
        region: '강남구',
      };

      const result = await queryRestaurantHygiene(params);

      expect(result.success).toBe(true);
    });

    it('식약처 API 에러 시 API_ERROR를 반환한다', async () => {
      mockKakaoMapService.searchRestaurant.mockResolvedValue([
        sampleKakaoResult,
      ]);
      mockHygieneGradeService.findExactMatch.mockRejectedValue(
        new apiClientModule.ApiError('API Error', 'ERROR-001', 500),
      );

      const params: HygieneQueryParams = {
        restaurant_name: '스타벅스',
        region: '강남구',
      };

      const result = await queryRestaurantHygiene(params);

      expect(result.success).toBe(false);
      const errorResult = result as HygieneErrorResult;
      expect(errorResult.error.code).toBe('API_ERROR');
    });

    it('알 수 없는 에러 시 UNKNOWN_ERROR를 반환한다', async () => {
      mockKakaoMapService.searchRestaurant.mockRejectedValue(
        new Error('Unknown'),
      );

      const params: HygieneQueryParams = {
        restaurant_name: '스타벅스',
        region: '강남구',
      };

      const result = await queryRestaurantHygiene(params);

      expect(result.success).toBe(false);
      const errorResult = result as HygieneErrorResult;
      expect(errorResult.error.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('기본값 처리', () => {
    it('include_history 기본값은 true이다', async () => {
      mockKakaoMapService.searchRestaurant.mockResolvedValue([
        sampleKakaoResult,
      ]);
      mockHygieneGradeService.findExactMatch.mockResolvedValue(
        sampleHygieneGradeItem,
      );
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const params: HygieneQueryParams = {
        restaurant_name: '스타벅스',
        region: '강남구',
        // include_history 생략
      };

      await queryRestaurantHygiene(params);

      expect(
        mockViolationService.getViolationsForRestaurant,
      ).toHaveBeenCalled();
    });
  });
});
