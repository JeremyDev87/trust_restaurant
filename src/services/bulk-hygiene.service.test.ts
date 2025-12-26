/**
 * 일괄 위생정보 조회 서비스 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BulkHygieneServiceImpl,
  createBulkHygieneService,
  type BulkHygieneService,
} from './bulk-hygiene.service.js';
import { HygieneGradeService } from './hygiene-grade.service.js';
import { ViolationService } from './violation.service.js';
import type { RestaurantInfo } from '../types/kakao-map.types.js';
import type { HygieneGradeItem } from './hygiene-grade.service.js';
import type { ViolationHistory } from '../types/domain/restaurant.types.js';

// Mock 서비스
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

// 테스트 데이터
const sampleRestaurants: RestaurantInfo[] = [
  {
    id: '1',
    name: '스타벅스 강남역점',
    address: '서울특별시 강남구 역삼동 123',
    roadAddress: '서울 강남구 강남대로 396',
    phone: '02-1234-5678',
    category: '카페',
    longitude: '127.028',
    latitude: '37.498',
  },
  {
    id: '2',
    name: '맥도날드 역삼점',
    address: '서울특별시 강남구 역삼동 456',
    roadAddress: '서울 강남구 테헤란로 123',
    phone: '02-2345-6789',
    category: '패스트푸드',
    longitude: '127.030',
    latitude: '37.500',
  },
  {
    id: '3',
    name: '동네분식',
    address: '서울특별시 강남구 삼성동 789',
    roadAddress: '서울 강남구 삼성로 456',
    phone: '02-3456-7890',
    category: '분식',
    longitude: '127.032',
    latitude: '37.502',
  },
];

const gradeAAA: HygieneGradeItem = {
  name: '스타벅스 강남역점',
  address: '서울특별시 강남구 역삼동 123',
  licenseNo: '111',
  businessType: '휴게음식점',
  hygieneGrade: {
    has_grade: true,
    grade: 'AAA',
    grade_label: '매우 우수',
    grade_date: '2024-01-01',
    valid_until: '2026-01-01',
    stars: 3,
  },
};

const gradeAA: HygieneGradeItem = {
  name: '맥도날드 역삼점',
  address: '서울특별시 강남구 역삼동 456',
  licenseNo: '222',
  businessType: '일반음식점',
  hygieneGrade: {
    has_grade: true,
    grade: 'AA',
    grade_label: '우수',
    grade_date: '2024-02-01',
    valid_until: '2026-02-01',
    stars: 2,
  },
};

const gradeA: HygieneGradeItem = {
  name: '다른식당',
  address: '서울특별시 강남구 삼성동 100',
  licenseNo: '333',
  businessType: '일반음식점',
  hygieneGrade: {
    has_grade: true,
    grade: 'A',
    grade_label: '좋음',
    grade_date: '2024-03-01',
    valid_until: '2026-03-01',
    stars: 1,
  },
};

const noGrade: HygieneGradeItem = {
  name: '동네분식',
  address: '서울특별시 강남구 삼성동 789',
  licenseNo: '444',
  businessType: '일반음식점',
  hygieneGrade: {
    has_grade: false,
    grade: null,
    grade_label: null,
    grade_date: null,
    valid_until: null,
    stars: 0,
  },
};

const emptyViolations: ViolationHistory = {
  total_count: 0,
  recent_items: [],
  has_more: false,
};

const someViolations: ViolationHistory = {
  total_count: 2,
  recent_items: [
    {
      date: '2024-01-01',
      type: '시정명령',
      content: '위생관리 개선',
      reason: '주방 청결 불량',
    },
    {
      date: '2023-06-15',
      type: '영업정지',
      content: '영업정지 3일',
      reason: '식중독 발생',
    },
  ],
  has_more: false,
};

describe('BulkHygieneService', () => {
  let service: BulkHygieneService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BulkHygieneServiceImpl(
      mockHygieneGradeService as unknown as HygieneGradeService,
      mockViolationService as unknown as ViolationService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createBulkHygieneService', () => {
    it('BulkHygieneService 인스턴스를 생성한다', () => {
      const createdService = createBulkHygieneService(
        mockHygieneGradeService as unknown as HygieneGradeService,
        mockViolationService as unknown as ViolationService,
      );
      expect(createdService).toBeInstanceOf(BulkHygieneServiceImpl);
    });
  });

  describe('getBulkHygieneInfo - filter: all', () => {
    it('모든 식당 정보를 반환한다', async () => {
      mockHygieneGradeService.findExactMatch
        .mockResolvedValueOnce(gradeAAA)
        .mockResolvedValueOnce(gradeAA)
        .mockResolvedValueOnce(null);
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const result = await service.getBulkHygieneInfo(
        sampleRestaurants,
        'all',
        10,
      );

      expect(result.totalChecked).toBe(3);
      expect(result.matchedCount).toBe(3);
      expect(result.results).toHaveLength(3);
    });

    it('limit을 초과하지 않는다', async () => {
      mockHygieneGradeService.findExactMatch.mockResolvedValue(gradeAAA);
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const result = await service.getBulkHygieneInfo(
        sampleRestaurants,
        'all',
        2,
      );

      expect(result.matchedCount).toBe(2);
      expect(result.results).toHaveLength(2);
    });
  });

  describe('getBulkHygieneInfo - filter: clean', () => {
    it('AAA/AA 등급 + 행정처분 없는 식당만 반환한다', async () => {
      mockHygieneGradeService.findExactMatch
        .mockResolvedValueOnce(gradeAAA)
        .mockResolvedValueOnce(gradeAA)
        .mockResolvedValueOnce(gradeA);
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const result = await service.getBulkHygieneInfo(
        sampleRestaurants,
        'clean',
        10,
      );

      expect(result.matchedCount).toBe(2);
      expect(
        result.results.every(
          r =>
            r.hygieneGrade?.hygieneGrade?.grade === 'AAA' ||
            r.hygieneGrade?.hygieneGrade?.grade === 'AA',
        ),
      ).toBe(true);
    });

    it('행정처분 이력이 있으면 제외한다', async () => {
      mockHygieneGradeService.findExactMatch
        .mockResolvedValueOnce(gradeAAA)
        .mockResolvedValueOnce(gradeAA);
      mockViolationService.getViolationsForRestaurant
        .mockResolvedValueOnce(someViolations) // 첫 번째 식당에 행정처분 있음
        .mockResolvedValueOnce(emptyViolations);

      const result = await service.getBulkHygieneInfo(
        sampleRestaurants.slice(0, 2),
        'clean',
        10,
      );

      expect(result.matchedCount).toBe(1);
      expect(result.results[0].restaurant.name).toBe('맥도날드 역삼점');
    });

    it('A 등급은 제외한다', async () => {
      mockHygieneGradeService.findExactMatch.mockResolvedValue(gradeA);
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const result = await service.getBulkHygieneInfo(
        sampleRestaurants.slice(0, 1),
        'clean',
        10,
      );

      expect(result.matchedCount).toBe(0);
    });
  });

  describe('getBulkHygieneInfo - filter: with_violations', () => {
    it('행정처분 이력이 있는 식당만 반환한다', async () => {
      mockHygieneGradeService.findExactMatch
        .mockResolvedValueOnce(gradeAAA)
        .mockResolvedValueOnce(gradeAA)
        .mockResolvedValueOnce(gradeA);
      mockViolationService.getViolationsForRestaurant
        .mockResolvedValueOnce(someViolations)
        .mockResolvedValueOnce(emptyViolations)
        .mockResolvedValueOnce(someViolations);

      const result = await service.getBulkHygieneInfo(
        sampleRestaurants,
        'with_violations',
        10,
      );

      expect(result.matchedCount).toBe(2);
      expect(
        result.results.every(r => r.violations && r.violations.total_count > 0),
      ).toBe(true);
    });

    it('matchReason에 행정처분 건수가 포함된다', async () => {
      mockHygieneGradeService.findExactMatch.mockResolvedValue(gradeAAA);
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        someViolations,
      );

      const result = await service.getBulkHygieneInfo(
        sampleRestaurants.slice(0, 1),
        'with_violations',
        10,
      );

      expect(result.results[0].matchReason).toContain('2건');
    });
  });

  describe('getBulkHygieneInfo - filter: no_grade', () => {
    it('위생등급 미등록 식당만 반환한다', async () => {
      mockHygieneGradeService.findExactMatch
        .mockResolvedValueOnce(gradeAAA)
        .mockResolvedValueOnce(null) // 등급 없음
        .mockResolvedValueOnce(noGrade); // has_grade: false
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const result = await service.getBulkHygieneInfo(
        sampleRestaurants,
        'no_grade',
        10,
      );

      expect(result.matchedCount).toBe(2);
    });

    it('findExactMatch가 null을 반환하면 미등록으로 처리한다', async () => {
      mockHygieneGradeService.findExactMatch.mockResolvedValue(null);
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const result = await service.getBulkHygieneInfo(
        sampleRestaurants.slice(0, 1),
        'no_grade',
        10,
      );

      expect(result.matchedCount).toBe(1);
      expect(result.results[0].matchReason).toBe('위생등급 미등록');
    });
  });

  describe('에러 핸들링', () => {
    it('API 에러가 발생해도 빈 결과로 처리되어 filter: all에서는 포함된다', async () => {
      // 내부적으로 Promise.allSettled를 사용하므로 에러가 발생해도 빈 결과로 처리됨
      mockHygieneGradeService.findExactMatch
        .mockResolvedValueOnce(gradeAAA)
        .mockRejectedValueOnce(new Error('API Error')) // 두 번째 실패 -> undefined 반환
        .mockResolvedValueOnce(gradeAA);
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const result = await service.getBulkHygieneInfo(
        sampleRestaurants,
        'all',
        10,
      );

      // filter: 'all'이므로 모든 식당이 포함됨
      // (에러가 발생한 식당은 hygieneGrade: undefined로 처리)
      expect(result.totalChecked).toBe(3);
      expect(result.matchedCount).toBe(3);
      // 두 번째 식당은 hygieneGrade가 undefined
      expect(result.results[1].hygieneGrade).toBeUndefined();
    });

    it('API 에러가 발생하면 no_grade 필터에서 매칭된다', async () => {
      mockHygieneGradeService.findExactMatch
        .mockResolvedValueOnce(gradeAAA)
        .mockRejectedValueOnce(new Error('API Error')) // undefined 반환 -> no_grade 매칭
        .mockResolvedValueOnce(gradeAA);
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const result = await service.getBulkHygieneInfo(
        sampleRestaurants,
        'no_grade',
        10,
      );

      // 에러가 발생한 두 번째 식당만 no_grade로 매칭
      expect(result.matchedCount).toBe(1);
      expect(result.results[0].restaurant.name).toBe('맥도날드 역삼점');
    });

    it('행정처분 조회 실패 시 violations는 undefined가 된다', async () => {
      mockHygieneGradeService.findExactMatch.mockResolvedValue(gradeAAA);
      mockViolationService.getViolationsForRestaurant.mockRejectedValue(
        new Error('Violation API Error'),
      );

      const result = await service.getBulkHygieneInfo(
        sampleRestaurants.slice(0, 1),
        'all',
        10,
      );

      expect(result.matchedCount).toBe(1);
      expect(result.results[0].violations).toBeUndefined();
    });
  });

  describe('배치 처리', () => {
    it('5개 단위로 배치 처리한다', async () => {
      // 7개 식당 생성
      const manyRestaurants = Array.from({ length: 7 }, (_, i) => ({
        ...sampleRestaurants[0],
        id: String(i),
        name: `식당${i}`,
      }));

      mockHygieneGradeService.findExactMatch.mockResolvedValue(gradeAAA);
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      await service.getBulkHygieneInfo(manyRestaurants, 'all', 10);

      // findExactMatch가 7번 호출됨
      expect(mockHygieneGradeService.findExactMatch).toHaveBeenCalledTimes(7);
    });

    it('limit에 도달하면 더 이상 조회하지 않는다', async () => {
      const manyRestaurants = Array.from({ length: 10 }, (_, i) => ({
        ...sampleRestaurants[0],
        id: String(i),
        name: `식당${i}`,
      }));

      mockHygieneGradeService.findExactMatch.mockResolvedValue(gradeAAA);
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const result = await service.getBulkHygieneInfo(
        manyRestaurants,
        'all',
        3,
      );

      expect(result.matchedCount).toBe(3);
      // 첫 배치(5개)만 처리하고 limit 도달
      expect(
        mockHygieneGradeService.findExactMatch.mock.calls.length,
      ).toBeLessThanOrEqual(5);
    });
  });

  describe('기본값', () => {
    it('filter 기본값은 all이다', async () => {
      mockHygieneGradeService.findExactMatch.mockResolvedValue(gradeAAA);
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const result = await service.getBulkHygieneInfo(
        sampleRestaurants.slice(0, 1),
      );

      expect(result.matchedCount).toBe(1);
    });

    it('limit 기본값은 10이다', async () => {
      const manyRestaurants = Array.from({ length: 15 }, (_, i) => ({
        ...sampleRestaurants[0],
        id: String(i),
        name: `식당${i}`,
      }));

      mockHygieneGradeService.findExactMatch.mockResolvedValue(gradeAAA);
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const result = await service.getBulkHygieneInfo(manyRestaurants);

      expect(result.matchedCount).toBe(10);
    });
  });

  describe('주소 파싱', () => {
    it('도로명 주소에서 지역을 추출한다', async () => {
      mockHygieneGradeService.findExactMatch.mockResolvedValue(gradeAAA);
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      await service.getBulkHygieneInfo(
        sampleRestaurants.slice(0, 1),
        'all',
        10,
      );

      // findExactMatch 호출 시 강남구가 region으로 전달됨
      expect(mockHygieneGradeService.findExactMatch).toHaveBeenCalledWith(
        '스타벅스 강남역점',
        expect.stringContaining('강남'),
      );
    });

    it('주소가 없으면 빈 region으로 조회한다', async () => {
      const noAddressRestaurant: RestaurantInfo = {
        ...sampleRestaurants[0],
        address: '',
        roadAddress: '',
      };

      mockHygieneGradeService.findExactMatch.mockResolvedValue(gradeAAA);
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      await service.getBulkHygieneInfo([noAddressRestaurant], 'all', 10);

      expect(mockHygieneGradeService.findExactMatch).toHaveBeenCalled();
    });
  });

  describe('결과 포맷', () => {
    it('hygieneGrade 정보가 올바르게 매핑된다', async () => {
      mockHygieneGradeService.findExactMatch.mockResolvedValue(gradeAAA);
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const result = await service.getBulkHygieneInfo(
        sampleRestaurants.slice(0, 1),
        'all',
        10,
      );

      const item = result.results[0];
      expect(item.hygieneGrade).toBeDefined();
      expect(item.hygieneGrade!.name).toBe('스타벅스 강남역점');
      expect(item.hygieneGrade!.hygieneGrade.grade).toBe('AAA');
      expect(item.hygieneGrade!.hygieneGrade.stars).toBe(3);
    });

    it('violations 정보가 올바르게 포함된다', async () => {
      mockHygieneGradeService.findExactMatch.mockResolvedValue(gradeAAA);
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        someViolations,
      );

      const result = await service.getBulkHygieneInfo(
        sampleRestaurants.slice(0, 1),
        'all',
        10,
      );

      expect(result.results[0].violations).toEqual(someViolations);
    });

    it('restaurant 정보가 원본 그대로 포함된다', async () => {
      mockHygieneGradeService.findExactMatch.mockResolvedValue(gradeAAA);
      mockViolationService.getViolationsForRestaurant.mockResolvedValue(
        emptyViolations,
      );

      const result = await service.getBulkHygieneInfo(
        sampleRestaurants.slice(0, 1),
        'all',
        10,
      );

      expect(result.results[0].restaurant).toEqual(sampleRestaurants[0]);
    });
  });
});
