import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RestaurantIntelligenceServiceImpl,
  createRestaurantIntelligenceService,
} from './restaurant-intelligence.service.js';
import type { KakaoMapService } from './kakao-map.service.js';
import type { NaverPlaceService } from './naver-place.service.js';
import type { HygieneGradeService } from './hygiene-grade.service.js';
import type { ViolationService } from './violation.service.js';
import type { CacheService } from './cache.service.js';
import type { RestaurantInfo } from '../types/kakao-map.types.js';
import type { HygieneGradeItem } from './hygiene-grade.service.js';
import type { ViolationHistory } from '../types/domain/restaurant.types.js';
import type { NaverPlaceInfo } from '../types/naver-place.types.js';

describe('RestaurantIntelligenceService', () => {
  let kakaoMapService: KakaoMapService;
  let hygieneGradeService: HygieneGradeService;
  let violationService: ViolationService;
  let naverPlaceService: NaverPlaceService;
  let cacheService: CacheService;

  const mockKakaoResult: RestaurantInfo = {
    id: 'kakao-123',
    name: '맛있는 식당',
    address: '서울 강남구 역삼동 123',
    roadAddress: '서울 강남구 테헤란로 123',
    phone: '02-1234-5678',
    category: '음식점 > 한식',
    longitude: '127.0123',
    latitude: '37.5123',
    placeUrl: 'https://place.map.kakao.com/12345',
  };

  const mockHygieneResult: HygieneGradeItem = {
    name: '맛있는 식당',
    address: '서울 강남구 테헤란로 123',
    licenseNo: 'LICENSE-001',
    businessType: '일반음식점',
    hygieneGrade: {
      has_grade: true,
      grade: 'AA',
      grade_label: '우수',
      grade_date: '2024-01-01',
      valid_until: '2025-01-01',
      stars: 2,
    },
  };

  const mockViolationResult: ViolationHistory = {
    total_count: 1,
    recent_items: [
      {
        date: '2023-06-01',
        type: '영업정지',
        content: '위생관리 미흡',
        reason: '조리장 위생관리 불량',
      },
    ],
    has_more: false,
  };

  const mockNaverResult: NaverPlaceInfo = {
    id: 'naver-123',
    name: '맛있는 식당',
    address: '서울 강남구 테헤란로 123',
    category: '한식',
    score: 4.5,
    reviewCount: 150,
    priceRange: 'medium',
    businessHours: '11:00-22:00',
    imageUrl: 'https://example.com/image.jpg',
  };

  beforeEach(() => {
    kakaoMapService = {
      searchRestaurant: vi.fn().mockResolvedValue([mockKakaoResult]),
      searchByArea: vi.fn(),
    };

    hygieneGradeService = {
      searchByName: vi.fn(),
      findExactMatch: vi.fn().mockResolvedValue(mockHygieneResult),
      getByLicenseNo: vi.fn(),
    } as unknown as HygieneGradeService;

    violationService = {
      searchByName: vi.fn(),
      getViolationsForRestaurant: vi
        .fn()
        .mockResolvedValue(mockViolationResult),
      getByLicenseNo: vi.fn(),
    } as unknown as ViolationService;

    naverPlaceService = {
      searchPlace: vi.fn().mockResolvedValue(mockNaverResult),
      isAvailable: vi.fn().mockReturnValue(true),
    };

    cacheService = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
      delete: vi.fn(),
      isEnabled: vi.fn().mockReturnValue(true),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getRestaurantIntelligence', () => {
    it('should return null when restaurant not found in Kakao', async () => {
      vi.mocked(kakaoMapService.searchRestaurant).mockResolvedValue([]);

      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence(
        '존재하지않는식당',
        '강남구',
      );

      expect(result).toBeNull();
    });

    it('should return null when name is empty', async () => {
      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence('', '강남구');

      expect(result).toBeNull();
      expect(kakaoMapService.searchRestaurant).not.toHaveBeenCalled();
    });

    it('should return null when region is empty', async () => {
      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence('맛있는 식당', '');

      expect(result).toBeNull();
      expect(kakaoMapService.searchRestaurant).not.toHaveBeenCalled();
    });

    it('should return null when name is whitespace only', async () => {
      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence('   ', '강남구');

      expect(result).toBeNull();
      expect(kakaoMapService.searchRestaurant).not.toHaveBeenCalled();
    });

    it('should return null when region is whitespace only', async () => {
      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence(
        '맛있는 식당',
        '   ',
      );

      expect(result).toBeNull();
      expect(kakaoMapService.searchRestaurant).not.toHaveBeenCalled();
    });

    it('should return complete restaurant intelligence with all data sources', async () => {
      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence(
        '맛있는 식당',
        '강남구',
      );

      expect(result).not.toBeNull();
      expect(result!.name).toBe('맛있는 식당');
      expect(result!.address).toBe('서울 강남구 테헤란로 123');
      expect(result!.category).toBe('음식점 > 한식');
      expect(result!.phone).toBe('02-1234-5678');
      expect(result!.placeUrl).toBe('https://place.map.kakao.com/12345');
    });

    it('should correctly populate hygiene info with grade', async () => {
      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence(
        '맛있는 식당',
        '강남구',
      );

      expect(result!.hygiene.grade).toBe('AA');
      expect(result!.hygiene.gradeLabel).toBe('우수');
      expect(result!.hygiene.stars).toBe(2);
      expect(result!.hygiene.hasViolations).toBe(true);
      expect(result!.hygiene.violationCount).toBe(1);
    });

    it('should correctly populate ratings info', async () => {
      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence(
        '맛있는 식당',
        '강남구',
      );

      expect(result!.ratings.kakao).toBeNull(); // Kakao doesn't provide ratings
      expect(result!.ratings.naver).toEqual({ score: 4.5, reviews: 150 });
      expect(result!.ratings.combined).toBe(4.5);
    });

    it('should correctly populate additional info from Naver', async () => {
      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence(
        '맛있는 식당',
        '강남구',
      );

      expect(result!.priceRange).toBe('medium');
      expect(result!.businessHours).toBe('11:00-22:00');
    });

    it('should work without Naver service', async () => {
      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        undefined, // No Naver service
        cacheService,
      );

      const result = await service.getRestaurantIntelligence(
        '맛있는 식당',
        '강남구',
      );

      expect(result).not.toBeNull();
      expect(result!.ratings.naver).toBeNull();
      expect(result!.ratings.combined).toBeNull();
      expect(result!.priceRange).toBeNull();
      expect(result!.businessHours).toBeNull();
    });

    it('should handle hygiene service failure gracefully', async () => {
      vi.mocked(hygieneGradeService.findExactMatch).mockRejectedValue(
        new Error('API Error'),
      );

      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence(
        '맛있는 식당',
        '강남구',
      );

      expect(result).not.toBeNull();
      expect(result!.hygiene.grade).toBeNull();
      expect(result!.hygiene.gradeLabel).toBeNull();
    });

    it('should handle violation service failure gracefully', async () => {
      vi.mocked(violationService.getViolationsForRestaurant).mockRejectedValue(
        new Error('API Error'),
      );

      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence(
        '맛있는 식당',
        '강남구',
      );

      expect(result).not.toBeNull();
      expect(result!.hygiene.violationCount).toBe(0);
      expect(result!.hygiene.hasViolations).toBe(false);
    });

    it('should handle Naver service failure gracefully', async () => {
      vi.mocked(naverPlaceService.searchPlace).mockRejectedValue(
        new Error('API Error'),
      );

      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence(
        '맛있는 식당',
        '강남구',
      );

      expect(result).not.toBeNull();
      expect(result!.ratings.naver).toBeNull();
    });
  });

  describe('Score Calculations', () => {
    describe('Hygiene Score', () => {
      it('should calculate 100 for AAA grade without violations', async () => {
        const aaaHygieneResult: HygieneGradeItem = {
          ...mockHygieneResult,
          hygieneGrade: {
            has_grade: true,
            grade: 'AAA',
            grade_label: '매우 우수',
            grade_date: '2024-01-01',
            valid_until: '2025-01-01',
            stars: 3,
          },
        };
        vi.mocked(hygieneGradeService.findExactMatch).mockResolvedValue(
          aaaHygieneResult,
        );
        vi.mocked(
          violationService.getViolationsForRestaurant,
        ).mockResolvedValue({
          total_count: 0,
          recent_items: [],
          has_more: false,
        });

        const service = new RestaurantIntelligenceServiceImpl(
          kakaoMapService,
          hygieneGradeService,
          violationService,
          naverPlaceService,
          cacheService,
        );

        const result = await service.getRestaurantIntelligence(
          '맛있는 식당',
          '강남구',
        );

        expect(result!.scores.hygiene).toBe(100);
      });

      it('should calculate 80 for AA grade without violations', async () => {
        vi.mocked(
          violationService.getViolationsForRestaurant,
        ).mockResolvedValue({
          total_count: 0,
          recent_items: [],
          has_more: false,
        });

        const service = new RestaurantIntelligenceServiceImpl(
          kakaoMapService,
          hygieneGradeService,
          violationService,
          naverPlaceService,
          cacheService,
        );

        const result = await service.getRestaurantIntelligence(
          '맛있는 식당',
          '강남구',
        );

        expect(result!.scores.hygiene).toBe(80);
      });

      it('should calculate 60 for A grade without violations', async () => {
        const aHygieneResult: HygieneGradeItem = {
          ...mockHygieneResult,
          hygieneGrade: {
            has_grade: true,
            grade: 'A',
            grade_label: '좋음',
            grade_date: '2024-01-01',
            valid_until: '2025-01-01',
            stars: 1,
          },
        };
        vi.mocked(hygieneGradeService.findExactMatch).mockResolvedValue(
          aHygieneResult,
        );
        vi.mocked(
          violationService.getViolationsForRestaurant,
        ).mockResolvedValue({
          total_count: 0,
          recent_items: [],
          has_more: false,
        });

        const service = new RestaurantIntelligenceServiceImpl(
          kakaoMapService,
          hygieneGradeService,
          violationService,
          naverPlaceService,
          cacheService,
        );

        const result = await service.getRestaurantIntelligence(
          '맛있는 식당',
          '강남구',
        );

        expect(result!.scores.hygiene).toBe(60);
      });

      it('should calculate 40 for no grade without violations', async () => {
        vi.mocked(hygieneGradeService.findExactMatch).mockResolvedValue(null);
        vi.mocked(
          violationService.getViolationsForRestaurant,
        ).mockResolvedValue({
          total_count: 0,
          recent_items: [],
          has_more: false,
        });

        const service = new RestaurantIntelligenceServiceImpl(
          kakaoMapService,
          hygieneGradeService,
          violationService,
          naverPlaceService,
          cacheService,
        );

        const result = await service.getRestaurantIntelligence(
          '맛있는 식당',
          '강남구',
        );

        expect(result!.scores.hygiene).toBe(40);
      });

      it('should apply -20 penalty per violation', async () => {
        vi.mocked(
          violationService.getViolationsForRestaurant,
        ).mockResolvedValue({
          total_count: 1,
          recent_items: [
            { date: '2023-01-01', type: '경고', content: '', reason: '' },
          ],
          has_more: false,
        });

        const service = new RestaurantIntelligenceServiceImpl(
          kakaoMapService,
          hygieneGradeService,
          violationService,
          naverPlaceService,
          cacheService,
        );

        const result = await service.getRestaurantIntelligence(
          '맛있는 식당',
          '강남구',
        );

        // AA grade (80) - 1 violation (20) = 60
        expect(result!.scores.hygiene).toBe(60);
      });

      it('should cap violation penalty at -40', async () => {
        vi.mocked(
          violationService.getViolationsForRestaurant,
        ).mockResolvedValue({
          total_count: 5,
          recent_items: [],
          has_more: true,
        });

        const service = new RestaurantIntelligenceServiceImpl(
          kakaoMapService,
          hygieneGradeService,
          violationService,
          naverPlaceService,
          cacheService,
        );

        const result = await service.getRestaurantIntelligence(
          '맛있는 식당',
          '강남구',
        );

        // AA grade (80) - max penalty (40) = 40
        expect(result!.scores.hygiene).toBe(40);
      });

      it('should not go below 0', async () => {
        vi.mocked(hygieneGradeService.findExactMatch).mockResolvedValue(null);
        vi.mocked(
          violationService.getViolationsForRestaurant,
        ).mockResolvedValue({
          total_count: 5,
          recent_items: [],
          has_more: true,
        });

        const service = new RestaurantIntelligenceServiceImpl(
          kakaoMapService,
          hygieneGradeService,
          violationService,
          naverPlaceService,
          cacheService,
        );

        const result = await service.getRestaurantIntelligence(
          '맛있는 식당',
          '강남구',
        );

        // No grade (40) - max penalty (40) = 0
        expect(result!.scores.hygiene).toBe(0);
      });
    });

    describe('Popularity Score', () => {
      it('should calculate score as rating * 20', async () => {
        const service = new RestaurantIntelligenceServiceImpl(
          kakaoMapService,
          hygieneGradeService,
          violationService,
          naverPlaceService,
          cacheService,
        );

        const result = await service.getRestaurantIntelligence(
          '맛있는 식당',
          '강남구',
        );

        // 4.5 * 20 = 90
        expect(result!.scores.popularity).toBe(90);
      });

      it('should return 50 when no ratings available', async () => {
        vi.mocked(naverPlaceService.searchPlace).mockResolvedValue(null);

        const service = new RestaurantIntelligenceServiceImpl(
          kakaoMapService,
          hygieneGradeService,
          violationService,
          naverPlaceService,
          cacheService,
        );

        const result = await service.getRestaurantIntelligence(
          '맛있는 식당',
          '강남구',
        );

        expect(result!.scores.popularity).toBe(50);
      });

      it('should cap at 100 for 5.0 rating', async () => {
        vi.mocked(naverPlaceService.searchPlace).mockResolvedValue({
          ...mockNaverResult,
          score: 5.0,
        });

        const service = new RestaurantIntelligenceServiceImpl(
          kakaoMapService,
          hygieneGradeService,
          violationService,
          naverPlaceService,
          cacheService,
        );

        const result = await service.getRestaurantIntelligence(
          '맛있는 식당',
          '강남구',
        );

        expect(result!.scores.popularity).toBe(100);
      });
    });

    describe('Overall Score', () => {
      it('should calculate weighted average (60% hygiene, 40% popularity)', async () => {
        vi.mocked(
          violationService.getViolationsForRestaurant,
        ).mockResolvedValue({
          total_count: 0,
          recent_items: [],
          has_more: false,
        });

        const service = new RestaurantIntelligenceServiceImpl(
          kakaoMapService,
          hygieneGradeService,
          violationService,
          naverPlaceService,
          cacheService,
        );

        const result = await service.getRestaurantIntelligence(
          '맛있는 식당',
          '강남구',
        );

        // Hygiene: AA = 80, Popularity: 4.5 * 20 = 90
        // Overall: (80 * 0.6) + (90 * 0.4) = 48 + 36 = 84
        expect(result!.scores.overall).toBe(84);
      });

      it('should round to nearest integer', async () => {
        vi.mocked(naverPlaceService.searchPlace).mockResolvedValue({
          ...mockNaverResult,
          score: 4.3,
        });
        vi.mocked(
          violationService.getViolationsForRestaurant,
        ).mockResolvedValue({
          total_count: 0,
          recent_items: [],
          has_more: false,
        });

        const service = new RestaurantIntelligenceServiceImpl(
          kakaoMapService,
          hygieneGradeService,
          violationService,
          naverPlaceService,
          cacheService,
        );

        const result = await service.getRestaurantIntelligence(
          '맛있는 식당',
          '강남구',
        );

        // Hygiene: AA = 80, Popularity: 4.3 * 20 = 86
        // Overall: (80 * 0.6) + (86 * 0.4) = 48 + 34.4 = 82.4 -> 82
        expect(result!.scores.overall).toBe(82);
      });
    });
  });

  describe('Combined Rating Calculation', () => {
    it('should use weighted average when reviews exist', async () => {
      // This test verifies the implementation but currently only Naver provides ratings
      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence(
        '맛있는 식당',
        '강남구',
      );

      expect(result!.ratings.combined).toBe(4.5);
    });

    it('should handle null scores in Naver result', async () => {
      vi.mocked(naverPlaceService.searchPlace).mockResolvedValue({
        ...mockNaverResult,
        score: null,
      });

      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence(
        '맛있는 식당',
        '강남구',
      );

      expect(result!.ratings.combined).toBeNull();
    });
  });

  describe('Caching', () => {
    it('should return cached result without calling services', async () => {
      const cachedResult = {
        name: '캐시된 식당',
        address: '서울 강남구',
        category: '한식',
        hygiene: {
          grade: 'AA' as const,
          gradeLabel: '우수',
          stars: 2,
          hasViolations: false,
          violationCount: 0,
        },
        ratings: {
          kakao: null,
          naver: { score: 4.0, reviews: 100 },
          combined: 4.0,
        },
        priceRange: 'medium' as const,
        businessHours: '10:00-22:00',
        scores: {
          hygiene: 80,
          popularity: 80,
          overall: 80,
        },
      };

      vi.mocked(cacheService.get).mockResolvedValue({ value: cachedResult });

      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence('식당', '강남');

      expect(cacheService.get).toHaveBeenCalled();
      expect(kakaoMapService.searchRestaurant).not.toHaveBeenCalled();
      expect(result).toEqual(cachedResult);
    });

    it('should cache result on cache miss', async () => {
      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      await service.getRestaurantIntelligence('맛있는 식당', '강남구');

      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should work without cache service', async () => {
      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        undefined, // No cache
      );

      const result = await service.getRestaurantIntelligence(
        '맛있는 식당',
        '강남구',
      );

      expect(result).not.toBeNull();
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('createRestaurantIntelligenceService', () => {
    it('should create a RestaurantIntelligenceServiceImpl instance', () => {
      const service = createRestaurantIntelligenceService(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      expect(service).toBeInstanceOf(RestaurantIntelligenceServiceImpl);
    });

    it('should work with optional parameters', () => {
      const service = createRestaurantIntelligenceService(
        kakaoMapService,
        hygieneGradeService,
        violationService,
      );

      expect(service).toBeInstanceOf(RestaurantIntelligenceServiceImpl);
    });
  });

  describe('Edge Cases', () => {
    it('should use address when roadAddress is not available', async () => {
      vi.mocked(kakaoMapService.searchRestaurant).mockResolvedValue([
        {
          ...mockKakaoResult,
          roadAddress: '',
        },
      ]);

      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence(
        '맛있는 식당',
        '강남구',
      );

      expect(result!.address).toBe('서울 강남구 역삼동 123');
    });

    it('should handle restaurant with no grade but has_grade false', async () => {
      const noGradeResult: HygieneGradeItem = {
        ...mockHygieneResult,
        hygieneGrade: {
          has_grade: false,
          grade: null,
          grade_label: null,
          grade_date: null,
          valid_until: null,
          stars: 0,
        },
      };
      vi.mocked(hygieneGradeService.findExactMatch).mockResolvedValue(
        noGradeResult,
      );

      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence(
        '맛있는 식당',
        '강남구',
      );

      expect(result!.hygiene.grade).toBeNull();
      expect(result!.hygiene.gradeLabel).toBeNull();
      expect(result!.hygiene.stars).toBe(0);
    });

    it('should handle empty phone number', async () => {
      vi.mocked(kakaoMapService.searchRestaurant).mockResolvedValue([
        {
          ...mockKakaoResult,
          phone: '',
        },
      ]);

      const service = new RestaurantIntelligenceServiceImpl(
        kakaoMapService,
        hygieneGradeService,
        violationService,
        naverPlaceService,
        cacheService,
      );

      const result = await service.getRestaurantIntelligence(
        '맛있는 식당',
        '강남구',
      );

      expect(result!.phone).toBeUndefined();
    });
  });
});
