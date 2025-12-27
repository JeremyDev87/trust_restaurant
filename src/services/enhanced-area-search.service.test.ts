import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  EnhancedAreaSearchServiceImpl,
  createEnhancedAreaSearchService,
} from '../application/enhanced-area-search.usecase.js';
import type { KakaoMapService } from './kakao-map.service.js';
import type { RestaurantIntelligenceService } from './restaurant-intelligence.service.js';
import type { RestaurantInfo } from '../types/kakao-map.types.js';
import type { AreaSearchResult } from '../types/area-search.types.js';
import type { RestaurantIntelligence } from '../types/restaurant-intelligence.types.js';

describe('EnhancedAreaSearchService', () => {
  let kakaoMapService: KakaoMapService;
  let intelligenceService: RestaurantIntelligenceService;

  const mockRestaurant1: RestaurantInfo = {
    id: 'kakao-1',
    name: '맛있는 식당',
    address: '서울 강남구 역삼동 123',
    roadAddress: '서울 강남구 테헤란로 123',
    phone: '02-1234-5678',
    category: '음식점 > 한식',
    longitude: '127.0123',
    latitude: '37.5123',
  };

  const mockRestaurant2: RestaurantInfo = {
    id: 'kakao-2',
    name: '좋은 식당',
    address: '서울 강남구 역삼동 456',
    roadAddress: '서울 강남구 테헤란로 456',
    phone: '02-5678-9012',
    category: '음식점 > 일식',
    longitude: '127.0456',
    latitude: '37.5456',
  };

  const mockRestaurant3: RestaurantInfo = {
    id: 'kakao-3',
    name: '깨끗한 식당',
    address: '서울 강남구 역삼동 789',
    roadAddress: '서울 강남구 테헤란로 789',
    phone: '02-9012-3456',
    category: '음식점 > 양식',
    longitude: '127.0789',
    latitude: '37.5789',
  };

  const mockIntelligence1: RestaurantIntelligence = {
    name: '맛있는 식당',
    address: '서울 강남구 테헤란로 123',
    category: '한식',
    hygiene: {
      grade: 'AA',
      gradeLabel: '우수',
      stars: 2,
      hasViolations: false,
      violationCount: 0,
    },
    ratings: {
      kakao: null,
      naver: { score: 4.5, reviews: 100 },
      combined: 4.5,
    },
    priceRange: 'medium',
    businessHours: '11:00-22:00',
    scores: { hygiene: 80, popularity: 90, overall: 84 },
  };

  const mockIntelligence2: RestaurantIntelligence = {
    name: '좋은 식당',
    address: '서울 강남구 테헤란로 456',
    category: '일식',
    hygiene: {
      grade: 'A',
      gradeLabel: '좋음',
      stars: 1,
      hasViolations: true,
      violationCount: 1,
    },
    ratings: {
      kakao: null,
      naver: { score: 3.8, reviews: 50 },
      combined: 3.8,
    },
    priceRange: 'high',
    businessHours: '12:00-21:00',
    scores: { hygiene: 40, popularity: 76, overall: 54 },
  };

  const mockIntelligence3: RestaurantIntelligence = {
    name: '깨끗한 식당',
    address: '서울 강남구 테헤란로 789',
    category: '양식',
    hygiene: {
      grade: 'AAA',
      gradeLabel: '매우 우수',
      stars: 3,
      hasViolations: false,
      violationCount: 0,
    },
    ratings: {
      kakao: null,
      naver: { score: 4.8, reviews: 200 },
      combined: 4.8,
    },
    priceRange: 'medium',
    businessHours: '10:00-23:00',
    scores: { hygiene: 100, popularity: 96, overall: 98 },
  };

  beforeEach(() => {
    kakaoMapService = {
      searchRestaurant: vi.fn(),
      searchByArea: vi.fn(),
    };

    intelligenceService = {
      getRestaurantIntelligence: vi.fn(),
    };
  });

  describe('searchArea', () => {
    it('should return not_found when no restaurants are found', async () => {
      const notFoundResult: AreaSearchResult = {
        status: 'not_found',
        totalCount: 0,
        restaurants: [],
        message: '"강남역" 지역에서 식당을 찾을 수 없습니다.',
      };

      vi.mocked(kakaoMapService.searchByArea).mockResolvedValue(notFoundResult);

      const service = new EnhancedAreaSearchServiceImpl(
        kakaoMapService,
        intelligenceService,
      );

      const result = await service.searchArea({ area: '강남역' });

      expect(result.status).toBe('not_found');
      expect(result.totalCount).toBe(0);
      expect(result.restaurants).toHaveLength(0);
      expect(result.summary).toBeUndefined();
    });

    it('should return too_many without intelligence lookup', async () => {
      const tooManyResult: AreaSearchResult = {
        status: 'too_many',
        totalCount: 100,
        restaurants: [],
        suggestions: ['강남역 1번출구', '강남역 2번출구'],
        message: '"강남" 지역에 100개의 식당이 있습니다.',
      };

      vi.mocked(kakaoMapService.searchByArea).mockResolvedValue(tooManyResult);

      const service = new EnhancedAreaSearchServiceImpl(
        kakaoMapService,
        intelligenceService,
      );

      const result = await service.searchArea({ area: '강남' });

      expect(result.status).toBe('too_many');
      expect(result.totalCount).toBe(100);
      expect(result.suggestions).toEqual(['강남역 1번출구', '강남역 2번출구']);
      expect(
        intelligenceService.getRestaurantIntelligence,
      ).not.toHaveBeenCalled();
    });

    it('should enrich restaurants with intelligence data', async () => {
      const readyResult: AreaSearchResult = {
        status: 'ready',
        totalCount: 3,
        restaurants: [mockRestaurant1, mockRestaurant2, mockRestaurant3],
        message: '"역삼동" 지역에서 3개의 식당을 찾았습니다.',
      };

      vi.mocked(kakaoMapService.searchByArea).mockResolvedValue(readyResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockIntelligence1)
        .mockResolvedValueOnce(mockIntelligence2)
        .mockResolvedValueOnce(mockIntelligence3);

      const service = new EnhancedAreaSearchServiceImpl(
        kakaoMapService,
        intelligenceService,
      );

      const result = await service.searchArea({ area: '역삼동' });

      expect(result.status).toBe('ready');
      expect(result.totalCount).toBe(3);
      expect(result.restaurants).toHaveLength(3);

      // 첫 번째 식당 검증
      expect(result.restaurants[0].hygiene).toEqual({
        grade: 'AA',
        stars: 2,
        hasViolations: false,
      });
      expect(result.restaurants[0].ratings).toEqual({
        kakao: null,
        naver: 4.5,
        combined: 4.5,
      });
      expect(result.restaurants[0].priceRange).toBe('medium');
      expect(result.restaurants[0].businessHours).toBe('11:00-22:00');
    });

    it('should calculate summary statistics correctly', async () => {
      const readyResult: AreaSearchResult = {
        status: 'ready',
        totalCount: 3,
        restaurants: [mockRestaurant1, mockRestaurant2, mockRestaurant3],
        message: '"역삼동" 지역에서 3개의 식당을 찾았습니다.',
      };

      vi.mocked(kakaoMapService.searchByArea).mockResolvedValue(readyResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockIntelligence1)
        .mockResolvedValueOnce(mockIntelligence2)
        .mockResolvedValueOnce(mockIntelligence3);

      const service = new EnhancedAreaSearchServiceImpl(
        kakaoMapService,
        intelligenceService,
      );

      const result = await service.searchArea({ area: '역삼동' });

      expect(result.summary).toBeDefined();
      // (4.5 + 3.8 + 4.8) / 3 = 4.37 -> 4.4
      expect(result.summary?.avgRating).toBe(4.4);
      expect(result.summary?.withHygieneGrade).toBe(3);
      // 2 out of 3 have no violations (67%)
      expect(result.summary?.cleanRatio).toBe('67%');
      expect(result.summary?.gradeDistribution).toEqual({
        AAA: 1,
        AA: 1,
        A: 1,
      });
    });

    it('should filter by minimum rating', async () => {
      const readyResult: AreaSearchResult = {
        status: 'ready',
        totalCount: 3,
        restaurants: [mockRestaurant1, mockRestaurant2, mockRestaurant3],
        message: '"역삼동" 지역에서 3개의 식당을 찾았습니다.',
      };

      vi.mocked(kakaoMapService.searchByArea).mockResolvedValue(readyResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockIntelligence1)
        .mockResolvedValueOnce(mockIntelligence2)
        .mockResolvedValueOnce(mockIntelligence3);

      const service = new EnhancedAreaSearchServiceImpl(
        kakaoMapService,
        intelligenceService,
      );

      const result = await service.searchArea({
        area: '역삼동',
        minRating: 4.0,
      });

      expect(result.totalCount).toBe(2);
      expect(result.restaurants).toHaveLength(2);
      expect(
        result.restaurants.every(r => (r.ratings?.combined ?? 0) >= 4.0),
      ).toBe(true);
    });

    it('should filter by hygiene grade', async () => {
      const readyResult: AreaSearchResult = {
        status: 'ready',
        totalCount: 3,
        restaurants: [mockRestaurant1, mockRestaurant2, mockRestaurant3],
        message: '"역삼동" 지역에서 3개의 식당을 찾았습니다.',
      };

      vi.mocked(kakaoMapService.searchByArea).mockResolvedValue(readyResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockIntelligence1)
        .mockResolvedValueOnce(mockIntelligence2)
        .mockResolvedValueOnce(mockIntelligence3);

      const service = new EnhancedAreaSearchServiceImpl(
        kakaoMapService,
        intelligenceService,
      );

      const result = await service.searchArea({
        area: '역삼동',
        hygieneGrade: ['AAA', 'AA'],
      });

      expect(result.totalCount).toBe(2);
      expect(result.restaurants).toHaveLength(2);
      expect(
        result.restaurants.every(
          r => r.hygiene?.grade === 'AAA' || r.hygiene?.grade === 'AA',
        ),
      ).toBe(true);
    });

    it('should sort by rating in descending order', async () => {
      const readyResult: AreaSearchResult = {
        status: 'ready',
        totalCount: 3,
        restaurants: [mockRestaurant1, mockRestaurant2, mockRestaurant3],
        message: '"역삼동" 지역에서 3개의 식당을 찾았습니다.',
      };

      vi.mocked(kakaoMapService.searchByArea).mockResolvedValue(readyResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockIntelligence1)
        .mockResolvedValueOnce(mockIntelligence2)
        .mockResolvedValueOnce(mockIntelligence3);

      const service = new EnhancedAreaSearchServiceImpl(
        kakaoMapService,
        intelligenceService,
      );

      const result = await service.searchArea({
        area: '역삼동',
        sortBy: 'rating',
      });

      expect(result.restaurants[0].ratings?.combined).toBe(4.8);
      expect(result.restaurants[1].ratings?.combined).toBe(4.5);
      expect(result.restaurants[2].ratings?.combined).toBe(3.8);
    });

    it('should sort by hygiene grade in descending order', async () => {
      const readyResult: AreaSearchResult = {
        status: 'ready',
        totalCount: 3,
        restaurants: [mockRestaurant1, mockRestaurant2, mockRestaurant3],
        message: '"역삼동" 지역에서 3개의 식당을 찾았습니다.',
      };

      vi.mocked(kakaoMapService.searchByArea).mockResolvedValue(readyResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockIntelligence1)
        .mockResolvedValueOnce(mockIntelligence2)
        .mockResolvedValueOnce(mockIntelligence3);

      const service = new EnhancedAreaSearchServiceImpl(
        kakaoMapService,
        intelligenceService,
      );

      const result = await service.searchArea({
        area: '역삼동',
        sortBy: 'hygiene',
      });

      expect(result.restaurants[0].hygiene?.grade).toBe('AAA');
      expect(result.restaurants[1].hygiene?.grade).toBe('AA');
      expect(result.restaurants[2].hygiene?.grade).toBe('A');
    });

    it('should handle intelligence service errors gracefully', async () => {
      const readyResult: AreaSearchResult = {
        status: 'ready',
        totalCount: 2,
        restaurants: [mockRestaurant1, mockRestaurant2],
        message: '"역삼동" 지역에서 2개의 식당을 찾았습니다.',
      };

      vi.mocked(kakaoMapService.searchByArea).mockResolvedValue(readyResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockIntelligence1)
        .mockRejectedValueOnce(new Error('API Error'));

      const service = new EnhancedAreaSearchServiceImpl(
        kakaoMapService,
        intelligenceService,
      );

      const result = await service.searchArea({ area: '역삼동' });

      expect(result.status).toBe('ready');
      expect(result.totalCount).toBe(2);
      expect(result.restaurants[0].hygiene).toBeDefined();
      // 두 번째 식당은 intelligence 조회 실패로 기본 정보만 있음
      expect(result.restaurants[1].hygiene).toBeUndefined();
    });

    it('should combine filters and sorting', async () => {
      const readyResult: AreaSearchResult = {
        status: 'ready',
        totalCount: 3,
        restaurants: [mockRestaurant1, mockRestaurant2, mockRestaurant3],
        message: '"역삼동" 지역에서 3개의 식당을 찾았습니다.',
      };

      vi.mocked(kakaoMapService.searchByArea).mockResolvedValue(readyResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockIntelligence1)
        .mockResolvedValueOnce(mockIntelligence2)
        .mockResolvedValueOnce(mockIntelligence3);

      const service = new EnhancedAreaSearchServiceImpl(
        kakaoMapService,
        intelligenceService,
      );

      const result = await service.searchArea({
        area: '역삼동',
        minRating: 4.0,
        sortBy: 'rating',
      });

      expect(result.totalCount).toBe(2);
      expect(result.restaurants[0].ratings?.combined).toBe(4.8);
      expect(result.restaurants[1].ratings?.combined).toBe(4.5);
    });
  });

  describe('createEnhancedAreaSearchService', () => {
    it('should create an instance of EnhancedAreaSearchService', () => {
      const service = createEnhancedAreaSearchService(
        kakaoMapService,
        intelligenceService,
      );

      expect(service).toBeInstanceOf(EnhancedAreaSearchServiceImpl);
    });
  });
});
