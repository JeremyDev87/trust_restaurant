import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RecommendRestaurantsServiceImpl,
  createRecommendRestaurantsService,
  RecommendValidationError,
} from './recommend-restaurants.service.js';
import type { EnhancedAreaSearchService } from './enhanced-area-search.service.js';
import type { RestaurantIntelligenceService } from './restaurant-intelligence.service.js';
import type {
  EnhancedAreaSearchResult,
  EnhancedRestaurantInfo,
} from '../types/area-search.types.js';
import type { RestaurantIntelligence } from '../types/restaurant-intelligence.types.js';

describe('RecommendRestaurantsService', () => {
  let areaSearchService: EnhancedAreaSearchService;
  let intelligenceService: RestaurantIntelligenceService;

  const createMockEnhancedRestaurant = (
    name: string,
    overrides: Partial<EnhancedRestaurantInfo> = {},
  ): EnhancedRestaurantInfo => ({
    id: `id-${name}`,
    name,
    address: `서울 강남구 ${name} 123`,
    roadAddress: `서울 강남구 ${name}로 123`,
    category: '음식점 > 한식',
    phone: '02-1234-5678',
    placeUrl: 'https://place.map.kakao.com/12345',
    x: '127.0',
    y: '37.5',
    distance: '100',
    hygiene: {
      grade: 'AA',
      stars: 2,
      hasViolations: false,
    },
    ratings: {
      kakao: null,
      naver: 4.5,
      combined: 4.5,
    },
    priceRange: 'medium',
    businessHours: '11:00-22:00',
    ...overrides,
  });

  const createMockIntelligence = (
    name: string,
    overrides: Partial<RestaurantIntelligence> = {},
  ): RestaurantIntelligence => ({
    name,
    address: `서울 강남구 ${name} 123`,
    category: '음식점 > 한식',
    phone: '02-1234-5678',
    placeUrl: 'https://place.map.kakao.com/12345',
    hygiene: {
      grade: 'AA',
      gradeLabel: '우수',
      stars: 2,
      hasViolations: false,
      violationCount: 0,
    },
    ratings: {
      kakao: null,
      naver: { score: 4.5, reviews: 150 },
      combined: 4.5,
    },
    priceRange: 'medium',
    businessHours: '11:00-22:00',
    scores: {
      hygiene: 80,
      popularity: 90,
      overall: 84,
    },
    ...overrides,
  });

  const mockRestaurant1 = createMockEnhancedRestaurant('본죽&비빔밥', {
    category: '음식점 > 한식',
    hygiene: { grade: 'AAA', stars: 3, hasViolations: false },
    ratings: { kakao: null, naver: 4.5, combined: 4.5 },
    priceRange: 'low',
  });

  const mockRestaurant2 = createMockEnhancedRestaurant('계절밥상', {
    category: '음식점 > 한정식',
    hygiene: { grade: 'AA', stars: 2, hasViolations: false },
    ratings: { kakao: null, naver: 4.3, combined: 4.3 },
    priceRange: 'medium',
  });

  const mockRestaurant3 = createMockEnhancedRestaurant('스시오마카세', {
    category: '음식점 > 일식 > 초밥',
    hygiene: { grade: 'A', stars: 1, hasViolations: true },
    ratings: { kakao: null, naver: 4.8, combined: 4.8 },
    priceRange: 'high',
  });

  const mockIntelligence1 = createMockIntelligence('본죽&비빔밥', {
    hygiene: {
      grade: 'AAA',
      gradeLabel: '매우 우수',
      stars: 3,
      hasViolations: false,
      violationCount: 0,
    },
    ratings: {
      kakao: null,
      naver: { score: 4.5, reviews: 328 },
      combined: 4.5,
    },
    priceRange: 'low',
    scores: { hygiene: 100, popularity: 90, overall: 96 },
  });

  const mockIntelligence2 = createMockIntelligence('계절밥상', {
    hygiene: {
      grade: 'AA',
      gradeLabel: '우수',
      stars: 2,
      hasViolations: false,
      violationCount: 0,
    },
    ratings: {
      kakao: null,
      naver: { score: 4.3, reviews: 512 },
      combined: 4.3,
    },
    priceRange: 'medium',
    scores: { hygiene: 80, popularity: 86, overall: 82 },
  });

  const mockIntelligence3 = createMockIntelligence('스시오마카세', {
    category: '음식점 > 일식 > 초밥',
    hygiene: {
      grade: 'A',
      gradeLabel: '좋음',
      stars: 1,
      hasViolations: true,
      violationCount: 1,
    },
    ratings: {
      kakao: null,
      naver: { score: 4.8, reviews: 256 },
      combined: 4.8,
    },
    priceRange: 'high',
    scores: { hygiene: 40, popularity: 96, overall: 62 },
  });

  beforeEach(() => {
    areaSearchService = {
      searchArea: vi.fn(),
    };
    intelligenceService = {
      getRestaurantIntelligence: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should throw error when area is empty', async () => {
      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      await expect(
        service.recommendRestaurants({ area: '' }),
      ).rejects.toThrow(RecommendValidationError);
      await expect(
        service.recommendRestaurants({ area: '' }),
      ).rejects.toThrow('지역명은 필수입니다.');
    });

    it('should throw error when limit is less than 1', async () => {
      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      await expect(
        service.recommendRestaurants({ area: '강남역', limit: 0 }),
      ).rejects.toThrow(RecommendValidationError);
    });

    it('should throw error when limit exceeds 10', async () => {
      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      await expect(
        service.recommendRestaurants({ area: '강남역', limit: 15 }),
      ).rejects.toThrow('최대 10개까지 요청할 수 있습니다.');
    });

    it('should throw error for invalid priority', async () => {
      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      await expect(
        service.recommendRestaurants({
          area: '강남역',
          priority: 'invalid' as never,
        }),
      ).rejects.toThrow('유효하지 않은 우선순위');
    });

    it('should throw error for invalid purpose', async () => {
      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      await expect(
        service.recommendRestaurants({
          area: '강남역',
          purpose: 'invalid' as never,
        }),
      ).rejects.toThrow('유효하지 않은 목적');
    });

    it('should throw error for invalid budget', async () => {
      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      await expect(
        service.recommendRestaurants({
          area: '강남역',
          budget: 'invalid' as never,
        }),
      ).rejects.toThrow('유효하지 않은 예산');
    });

    it('should throw error for invalid category', async () => {
      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      await expect(
        service.recommendRestaurants({
          area: '강남역',
          category: 'invalid' as never,
        }),
      ).rejects.toThrow('유효하지 않은 카테고리');
    });
  });

  describe('Area Search Results', () => {
    it('should return no_results when area is not found', async () => {
      vi.mocked(areaSearchService.searchArea).mockResolvedValue({
        status: 'not_found',
        totalCount: 0,
        restaurants: [],
        message: '지역을 찾을 수 없습니다.',
      });

      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      const result = await service.recommendRestaurants({ area: '존재하지않는지역' });

      expect(result.status).toBe('no_results');
      expect(result.recommendations).toHaveLength(0);
      expect(result.message).toContain('찾을 수 없습니다');
    });

    it('should return area_too_broad when area has too many results', async () => {
      vi.mocked(areaSearchService.searchArea).mockResolvedValue({
        status: 'too_many',
        totalCount: 500,
        restaurants: [],
        suggestions: ['강남역', '역삼역', '선릉역'],
        message: '지역 범위가 너무 넓습니다.',
      });

      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      const result = await service.recommendRestaurants({ area: '강남구' });

      expect(result.status).toBe('area_too_broad');
      expect(result.recommendations).toHaveLength(0);
      expect(result.message).toContain('범위가 너무 넓습니다');
      expect(result.message).toContain('강남역');
    });

    it('should return success with recommendations for valid area', async () => {
      const searchResult: EnhancedAreaSearchResult = {
        status: 'ready',
        totalCount: 3,
        restaurants: [mockRestaurant1, mockRestaurant2, mockRestaurant3],
        message: '강남역에서 3개의 식당을 찾았습니다.',
      };

      vi.mocked(areaSearchService.searchArea).mockResolvedValue(searchResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockIntelligence1)
        .mockResolvedValueOnce(mockIntelligence2)
        .mockResolvedValueOnce(mockIntelligence3);

      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      const result = await service.recommendRestaurants({ area: '강남역' });

      expect(result.status).toBe('success');
      expect(result.area).toBe('강남역');
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.totalCandidates).toBe(3);
    });
  });

  describe('Priority Modes', () => {
    it('should prioritize hygiene scores in hygiene mode', async () => {
      const searchResult: EnhancedAreaSearchResult = {
        status: 'ready',
        totalCount: 3,
        restaurants: [mockRestaurant1, mockRestaurant2, mockRestaurant3],
        message: '강남역에서 3개의 식당을 찾았습니다.',
      };

      vi.mocked(areaSearchService.searchArea).mockResolvedValue(searchResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockIntelligence1)
        .mockResolvedValueOnce(mockIntelligence2)
        .mockResolvedValueOnce(mockIntelligence3);

      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      const result = await service.recommendRestaurants({
        area: '강남역',
        priority: 'hygiene',
      });

      expect(result.status).toBe('success');
      expect(result.filters.priority).toBe('hygiene');
      // AAA 등급 식당이 1위로 와야 함
      expect(result.recommendations[0].hygiene.grade).toBe('AAA');
    });

    it('should prioritize rating scores in rating mode', async () => {
      const searchResult: EnhancedAreaSearchResult = {
        status: 'ready',
        totalCount: 3,
        restaurants: [mockRestaurant1, mockRestaurant2, mockRestaurant3],
        message: '강남역에서 3개의 식당을 찾았습니다.',
      };

      vi.mocked(areaSearchService.searchArea).mockResolvedValue(searchResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockIntelligence1)
        .mockResolvedValueOnce(mockIntelligence2)
        .mockResolvedValueOnce(mockIntelligence3);

      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      const result = await service.recommendRestaurants({
        area: '강남역',
        priority: 'rating',
      });

      expect(result.status).toBe('success');
      expect(result.filters.priority).toBe('rating');
    });

    it('should use balanced scoring in balanced mode', async () => {
      const searchResult: EnhancedAreaSearchResult = {
        status: 'ready',
        totalCount: 2,
        restaurants: [mockRestaurant1, mockRestaurant2],
        message: '강남역에서 2개의 식당을 찾았습니다.',
      };

      vi.mocked(areaSearchService.searchArea).mockResolvedValue(searchResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockIntelligence1)
        .mockResolvedValueOnce(mockIntelligence2);

      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      const result = await service.recommendRestaurants({
        area: '강남역',
        priority: 'balanced',
      });

      expect(result.status).toBe('success');
      expect(result.filters.priority).toBe('balanced');
    });
  });

  describe('Category Filtering', () => {
    it('should filter by category correctly', async () => {
      const mockJapanese = createMockEnhancedRestaurant('일식당', {
        category: '음식점 > 일식 > 스시',
      });
      const mockKorean = createMockEnhancedRestaurant('한식당', {
        category: '음식점 > 한식',
      });

      const searchResult: EnhancedAreaSearchResult = {
        status: 'ready',
        totalCount: 2,
        restaurants: [mockJapanese, mockKorean],
        message: '2개 식당 발견',
      };

      vi.mocked(areaSearchService.searchArea).mockResolvedValue(searchResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValue(null);

      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      const result = await service.recommendRestaurants({
        area: '강남역',
        category: '일식',
      });

      expect(result.status).toBe('success');
      expect(result.recommendations.length).toBe(1);
      expect(result.recommendations[0].name).toBe('일식당');
    });

    it('should return all restaurants when category is 전체', async () => {
      const searchResult: EnhancedAreaSearchResult = {
        status: 'ready',
        totalCount: 2,
        restaurants: [mockRestaurant1, mockRestaurant2],
        message: '2개 식당 발견',
      };

      vi.mocked(areaSearchService.searchArea).mockResolvedValue(searchResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValue(null);

      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      const result = await service.recommendRestaurants({
        area: '강남역',
        category: '전체',
      });

      expect(result.recommendations.length).toBe(2);
    });
  });

  describe('Budget Filtering', () => {
    it('should filter by low budget correctly', async () => {
      const searchResult: EnhancedAreaSearchResult = {
        status: 'ready',
        totalCount: 2,
        restaurants: [mockRestaurant1, mockRestaurant2],
        message: '2개 식당 발견',
      };

      vi.mocked(areaSearchService.searchArea).mockResolvedValue(searchResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValue(null);

      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      const result = await service.recommendRestaurants({
        area: '강남역',
        budget: 'low',
      });

      expect(result.status).toBe('success');
      // mockRestaurant1이 low 가격대
      expect(result.recommendations.some(r => r.name === '본죽&비빔밥')).toBe(true);
    });

    it('should return all when budget is any', async () => {
      const searchResult: EnhancedAreaSearchResult = {
        status: 'ready',
        totalCount: 3,
        restaurants: [mockRestaurant1, mockRestaurant2, mockRestaurant3],
        message: '3개 식당 발견',
      };

      vi.mocked(areaSearchService.searchArea).mockResolvedValue(searchResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValue(null);

      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      const result = await service.recommendRestaurants({
        area: '강남역',
        budget: 'any',
      });

      expect(result.recommendations.length).toBe(3);
    });
  });

  describe('Purpose Filtering', () => {
    it('should boost purpose-matching restaurants', async () => {
      const mockKorean = createMockEnhancedRestaurant('삼겹살전문점', {
        category: '음식점 > 한식 > 삼겹살',
        hygiene: { grade: 'AA', stars: 2, hasViolations: false },
      });
      const mockItalian = createMockEnhancedRestaurant('이탈리안레스토랑', {
        category: '음식점 > 양식 > 이탈리안',
        hygiene: { grade: 'AA', stars: 2, hasViolations: false },
      });

      const searchResult: EnhancedAreaSearchResult = {
        status: 'ready',
        totalCount: 2,
        restaurants: [mockKorean, mockItalian],
        message: '2개 식당 발견',
      };

      vi.mocked(areaSearchService.searchArea).mockResolvedValue(searchResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValue(null);

      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      // 회식 목적 - 삼겹살이 우선
      const result = await service.recommendRestaurants({
        area: '강남역',
        purpose: '회식',
      });

      expect(result.status).toBe('success');
      expect(result.filters.purpose).toBe('회식');
      // 회식에 삼겹살이 더 적합하므로 높은 점수
      expect(result.recommendations[0].name).toBe('삼겹살전문점');
    });
  });

  describe('Limit', () => {
    it('should respect limit parameter', async () => {
      const restaurants = [
        mockRestaurant1,
        mockRestaurant2,
        mockRestaurant3,
        createMockEnhancedRestaurant('식당4'),
        createMockEnhancedRestaurant('식당5'),
      ];

      const searchResult: EnhancedAreaSearchResult = {
        status: 'ready',
        totalCount: 5,
        restaurants,
        message: '5개 식당 발견',
      };

      vi.mocked(areaSearchService.searchArea).mockResolvedValue(searchResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValue(null);

      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      const result = await service.recommendRestaurants({
        area: '강남역',
        limit: 3,
      });

      expect(result.recommendations).toHaveLength(3);
    });

    it('should use default limit of 5', async () => {
      const restaurants = Array.from({ length: 10 }, (_, i) =>
        createMockEnhancedRestaurant(`식당${i + 1}`),
      );

      const searchResult: EnhancedAreaSearchResult = {
        status: 'ready',
        totalCount: 10,
        restaurants,
        message: '10개 식당 발견',
      };

      vi.mocked(areaSearchService.searchArea).mockResolvedValue(searchResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValue(null);

      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      const result = await service.recommendRestaurants({
        area: '강남역',
      });

      expect(result.recommendations).toHaveLength(5);
    });
  });

  describe('Highlights', () => {
    it('should generate appropriate highlights', async () => {
      const searchResult: EnhancedAreaSearchResult = {
        status: 'ready',
        totalCount: 1,
        restaurants: [mockRestaurant1],
        message: '1개 식당 발견',
      };

      vi.mocked(areaSearchService.searchArea).mockResolvedValue(searchResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValue(mockIntelligence1);

      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      const result = await service.recommendRestaurants({
        area: '강남역',
      });

      expect(result.recommendations[0].highlights).toBeDefined();
      expect(result.recommendations[0].highlights.length).toBeGreaterThan(0);
      expect(result.recommendations[0].highlights).toContain('AAA 등급');
      expect(result.recommendations[0].highlights).toContain('행정처분 없음');
    });
  });

  describe('Scores', () => {
    it('should calculate scores correctly', async () => {
      const searchResult: EnhancedAreaSearchResult = {
        status: 'ready',
        totalCount: 1,
        restaurants: [mockRestaurant1],
        message: '1개 식당 발견',
      };

      vi.mocked(areaSearchService.searchArea).mockResolvedValue(searchResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValue(mockIntelligence1);

      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      const result = await service.recommendRestaurants({
        area: '강남역',
        priority: 'balanced',
      });

      expect(result.recommendations[0].scores).toBeDefined();
      expect(result.recommendations[0].scores.total).toBeGreaterThan(0);
      expect(result.recommendations[0].scores.hygiene).toBeGreaterThan(0);
      expect(result.recommendations[0].scores.rating).toBeGreaterThan(0);
    });

    it('should have rank in ascending order', async () => {
      const searchResult: EnhancedAreaSearchResult = {
        status: 'ready',
        totalCount: 3,
        restaurants: [mockRestaurant1, mockRestaurant2, mockRestaurant3],
        message: '3개 식당 발견',
      };

      vi.mocked(areaSearchService.searchArea).mockResolvedValue(searchResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValue(null);

      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      const result = await service.recommendRestaurants({
        area: '강남역',
      });

      expect(result.recommendations[0].rank).toBe(1);
      expect(result.recommendations[1].rank).toBe(2);
      expect(result.recommendations[2].rank).toBe(3);
    });
  });

  describe('Factory Function', () => {
    it('should create service instance', () => {
      const service = createRecommendRestaurantsService(
        areaSearchService,
        intelligenceService,
      );

      expect(service).toBeInstanceOf(RecommendRestaurantsServiceImpl);
    });
  });

  describe('Error Handling', () => {
    it('should handle intelligence service errors gracefully', async () => {
      const searchResult: EnhancedAreaSearchResult = {
        status: 'ready',
        totalCount: 2,
        restaurants: [mockRestaurant1, mockRestaurant2],
        message: '2개 식당 발견',
      };

      vi.mocked(areaSearchService.searchArea).mockResolvedValue(searchResult);
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockRejectedValue(new Error('API Error'));

      const service = new RecommendRestaurantsServiceImpl(
        areaSearchService,
        intelligenceService,
      );

      // 에러가 발생해도 결과를 반환해야 함
      const result = await service.recommendRestaurants({
        area: '강남역',
      });

      expect(result.status).toBe('success');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
});
