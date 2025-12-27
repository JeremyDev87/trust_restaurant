import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CompareRestaurantsServiceImpl,
  createCompareRestaurantsService,
  CompareValidationError,
} from './compare-restaurants.service.js';
import type { RestaurantIntelligenceService } from './restaurant-intelligence.service.js';
import type { RestaurantIntelligence } from '../types/restaurant-intelligence.types.js';

describe('CompareRestaurantsService', () => {
  let intelligenceService: RestaurantIntelligenceService;

  const createMockRestaurant = (
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

  const mockRestaurant1 = createMockRestaurant('스타벅스', {
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
    priceRange: 'medium',
    scores: { hygiene: 100, popularity: 90, overall: 96 },
  });

  const mockRestaurant2 = createMockRestaurant('투썸플레이스', {
    hygiene: {
      grade: 'AA',
      gradeLabel: '우수',
      stars: 2,
      hasViolations: false,
      violationCount: 0,
    },
    ratings: {
      kakao: null,
      naver: { score: 4.2, reviews: 256 },
      combined: 4.2,
    },
    priceRange: 'medium',
    scores: { hygiene: 80, popularity: 84, overall: 82 },
  });

  const mockRestaurant3 = createMockRestaurant('이디야커피', {
    hygiene: {
      grade: null,
      gradeLabel: null,
      stars: 0,
      hasViolations: false,
      violationCount: 0,
    },
    ratings: {
      kakao: null,
      naver: { score: 4.0, reviews: 89 },
      combined: 4.0,
    },
    priceRange: 'low',
    scores: { hygiene: 40, popularity: 80, overall: 56 },
  });

  beforeEach(() => {
    intelligenceService = {
      getRestaurantIntelligence: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should throw error when restaurants array is empty', async () => {
      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      await expect(
        service.compareRestaurants({ restaurants: [] }),
      ).rejects.toThrow(CompareValidationError);
    });

    it('should throw error when restaurants count is less than 2', async () => {
      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      await expect(
        service.compareRestaurants({
          restaurants: [{ name: '식당1', region: '강남' }],
        }),
      ).rejects.toThrow('최소 2개의 식당이 필요합니다.');
    });

    it('should throw error when restaurants count exceeds 5', async () => {
      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      await expect(
        service.compareRestaurants({
          restaurants: [
            { name: '식당1', region: '강남' },
            { name: '식당2', region: '강남' },
            { name: '식당3', region: '강남' },
            { name: '식당4', region: '강남' },
            { name: '식당5', region: '강남' },
            { name: '식당6', region: '강남' },
          ],
        }),
      ).rejects.toThrow('최대 5개의 식당까지 비교할 수 있습니다.');
    });

    it('should throw error when restaurant name is empty', async () => {
      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      await expect(
        service.compareRestaurants({
          restaurants: [
            { name: '', region: '강남' },
            { name: '식당2', region: '강남' },
          ],
        }),
      ).rejects.toThrow('식당명은 필수입니다.');
    });

    it('should throw error when region is empty', async () => {
      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      await expect(
        service.compareRestaurants({
          restaurants: [
            { name: '식당1', region: '' },
            { name: '식당2', region: '강남' },
          ],
        }),
      ).rejects.toThrow('지역명은 필수입니다.');
    });

    it('should throw error when criteria is empty array', async () => {
      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      await expect(
        service.compareRestaurants({
          restaurants: [
            { name: '식당1', region: '강남' },
            { name: '식당2', region: '강남' },
          ],
          criteria: [],
        }),
      ).rejects.toThrow('최소 1개의 비교 항목이 필요합니다.');
    });

    it('should throw error for invalid criteria', async () => {
      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      await expect(
        service.compareRestaurants({
          restaurants: [
            { name: '식당1', region: '강남' },
            { name: '식당2', region: '강남' },
          ],
          criteria: ['invalid' as never],
        }),
      ).rejects.toThrow('유효하지 않은 비교 항목');
    });
  });

  describe('Successful Comparison', () => {
    it('should compare 2 restaurants successfully', async () => {
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockRestaurant1)
        .mockResolvedValueOnce(mockRestaurant2);

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '스타벅스', region: '강남' },
          { name: '투썸플레이스', region: '강남' },
        ],
      });

      expect(result.status).toBe('complete');
      expect(result.found).toEqual(['스타벅스', '투썸플레이스']);
      expect(result.notFound).toEqual([]);
      expect(result.comparison).not.toBeNull();
      expect(result.comparison?.restaurants).toHaveLength(2);
    });

    it('should compare 3 restaurants successfully', async () => {
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockRestaurant1)
        .mockResolvedValueOnce(mockRestaurant2)
        .mockResolvedValueOnce(mockRestaurant3);

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '스타벅스', region: '강남' },
          { name: '투썸플레이스', region: '강남' },
          { name: '이디야커피', region: '강남' },
        ],
      });

      expect(result.status).toBe('complete');
      expect(result.found).toHaveLength(3);
      expect(result.comparison?.restaurants).toHaveLength(3);
    });

    it('should return partial status when some restaurants not found', async () => {
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockRestaurant1)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockRestaurant3);

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '스타벅스', region: '강남' },
          { name: '없는식당', region: '강남' },
          { name: '이디야커피', region: '강남' },
        ],
      });

      expect(result.status).toBe('partial');
      expect(result.found).toEqual(['스타벅스', '이디야커피']);
      expect(result.notFound).toEqual(['없는식당']);
      expect(result.comparison).not.toBeNull();
      expect(result.comparison?.restaurants).toHaveLength(2);
    });

    it('should return null comparison when less than 2 restaurants found', async () => {
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockRestaurant1)
        .mockResolvedValueOnce(null);

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '스타벅스', region: '강남' },
          { name: '없는식당', region: '강남' },
        ],
      });

      expect(result.status).toBe('partial');
      expect(result.found).toEqual(['스타벅스']);
      expect(result.notFound).toEqual(['없는식당']);
      expect(result.comparison).toBeNull();
      expect(result.message).toContain('최소 2개의 식당이 필요합니다');
    });

    it('should return null comparison when no restaurants found', async () => {
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '없는식당1', region: '강남' },
          { name: '없는식당2', region: '강남' },
        ],
      });

      expect(result.status).toBe('partial');
      expect(result.found).toEqual([]);
      expect(result.notFound).toEqual(['없는식당1', '없는식당2']);
      expect(result.comparison).toBeNull();
      expect(result.message).toBe('비교할 식당을 찾을 수 없습니다.');
    });
  });

  describe('Analysis', () => {
    it('should identify best hygiene restaurant', async () => {
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockRestaurant1) // AAA
        .mockResolvedValueOnce(mockRestaurant2); // AA

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '스타벅스', region: '강남' },
          { name: '투썸플레이스', region: '강남' },
        ],
      });

      expect(result.comparison?.analysis.bestHygiene).toBe('스타벅스');
    });

    it('should identify best rating restaurant', async () => {
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockRestaurant1) // 4.5
        .mockResolvedValueOnce(mockRestaurant2); // 4.2

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '스타벅스', region: '강남' },
          { name: '투썸플레이스', region: '강남' },
        ],
      });

      expect(result.comparison?.analysis.bestRating).toBe('스타벅스');
    });

    it('should identify best value restaurant', async () => {
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockRestaurant1) // medium, overall 96
        .mockResolvedValueOnce(mockRestaurant3); // low, overall 56

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '스타벅스', region: '강남' },
          { name: '이디야커피', region: '강남' },
        ],
      });

      // 스타벅스: 96 / 1.5 = 64
      // 이디야: 56 / 1.0 = 56
      expect(result.comparison?.analysis.bestValue).toBe('스타벅스');
    });

    it('should generate recommendation message', async () => {
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockRestaurant1)
        .mockResolvedValueOnce(mockRestaurant2);

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '스타벅스', region: '강남' },
          { name: '투썸플레이스', region: '강남' },
        ],
      });

      expect(result.comparison?.analysis.recommendation).toBeTruthy();
      expect(result.comparison?.analysis.recommendation).toContain('스타벅스');
    });
  });

  describe('Criteria Filtering', () => {
    it('should only analyze specified criteria', async () => {
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockRestaurant1)
        .mockResolvedValueOnce(mockRestaurant2);

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '스타벅스', region: '강남' },
          { name: '투썸플레이스', region: '강남' },
        ],
        criteria: ['hygiene'],
      });

      expect(result.comparison?.analysis.bestHygiene).toBe('스타벅스');
      expect(result.comparison?.analysis.bestRating).toBeNull();
      expect(result.comparison?.analysis.bestValue).toBeNull();
    });

    it('should analyze rating when specified', async () => {
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockRestaurant1)
        .mockResolvedValueOnce(mockRestaurant2);

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '스타벅스', region: '강남' },
          { name: '투썸플레이스', region: '강남' },
        ],
        criteria: ['rating'],
      });

      expect(result.comparison?.analysis.bestHygiene).toBeNull();
      expect(result.comparison?.analysis.bestRating).toBe('스타벅스');
      expect(result.comparison?.analysis.bestValue).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle intelligence service errors gracefully', async () => {
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockRestaurant1)
        .mockRejectedValueOnce(new Error('API Error'));

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '스타벅스', region: '강남' },
          { name: '에러식당', region: '강남' },
        ],
      });

      // 에러가 발생한 식당은 못 찾은 것으로 처리
      expect(result.found).toEqual(['스타벅스']);
      expect(result.notFound).toEqual(['에러식당']);
    });
  });

  describe('Restaurant Data Transformation', () => {
    it('should correctly transform restaurant intelligence to compared restaurant', async () => {
      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockRestaurant1)
        .mockResolvedValueOnce(mockRestaurant2);

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '스타벅스', region: '강남' },
          { name: '투썸플레이스', region: '강남' },
        ],
      });

      const starbucks = result.comparison?.restaurants[0];
      expect(starbucks?.name).toBe('스타벅스');
      expect(starbucks?.hygiene.grade).toBe('AAA');
      expect(starbucks?.hygiene.stars).toBe(3);
      expect(starbucks?.hygiene.hasViolations).toBe(false);
      expect(starbucks?.rating.naver).toBe(4.5);
      expect(starbucks?.rating.combined).toBe(4.5);
      expect(starbucks?.rating.reviewCount).toBe(328);
      expect(starbucks?.priceRange).toBe('medium');
      expect(starbucks?.scores.overall).toBe(96);
    });

    it('should calculate total review count correctly', async () => {
      const restaurantWithBothRatings = createMockRestaurant('테스트', {
        ratings: {
          kakao: { score: 4.0, reviews: 100 },
          naver: { score: 4.5, reviews: 200 },
          combined: 4.3,
        },
      });

      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(restaurantWithBothRatings)
        .mockResolvedValueOnce(mockRestaurant2);

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '테스트', region: '강남' },
          { name: '투썸플레이스', region: '강남' },
        ],
      });

      const testRestaurant = result.comparison?.restaurants[0];
      expect(testRestaurant?.rating.reviewCount).toBe(300);
    });
  });

  describe('Edge Cases', () => {
    it('should handle restaurants with null ratings', async () => {
      const restaurantNoRating = createMockRestaurant('무평점식당', {
        ratings: {
          kakao: null,
          naver: null,
          combined: null,
        },
      });

      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockRestaurant1)
        .mockResolvedValueOnce(restaurantNoRating);

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '스타벅스', region: '강남' },
          { name: '무평점식당', region: '강남' },
        ],
      });

      expect(result.status).toBe('complete');
      expect(result.comparison?.analysis.bestRating).toBe('스타벅스');
    });

    it('should handle restaurants with null price range', async () => {
      const restaurantNoPrice = createMockRestaurant('가격미정식당', {
        priceRange: null,
      });

      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(mockRestaurant1)
        .mockResolvedValueOnce(restaurantNoPrice);

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '스타벅스', region: '강남' },
          { name: '가격미정식당', region: '강남' },
        ],
      });

      expect(result.status).toBe('complete');
      expect(result.comparison?.analysis.bestValue).toBeTruthy();
    });

    it('should handle tie in hygiene scores', async () => {
      const restaurant1 = createMockRestaurant('식당1', {
        hygiene: {
          grade: 'AA',
          gradeLabel: '우수',
          stars: 2,
          hasViolations: false,
          violationCount: 0,
        },
        scores: { hygiene: 80, popularity: 90, overall: 84 },
      });
      const restaurant2 = createMockRestaurant('식당2', {
        hygiene: {
          grade: 'AA',
          gradeLabel: '우수',
          stars: 2,
          hasViolations: false,
          violationCount: 0,
        },
        scores: { hygiene: 80, popularity: 85, overall: 82 },
      });

      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(restaurant1)
        .mockResolvedValueOnce(restaurant2);

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '식당1', region: '강남' },
          { name: '식당2', region: '강남' },
        ],
      });

      // 동점이면 먼저 나온 것 유지
      expect(result.comparison?.analysis.bestHygiene).toBe('식당1');
    });

    it('should handle tie in ratings by review count', async () => {
      const restaurant1 = createMockRestaurant('식당1', {
        ratings: {
          kakao: null,
          naver: { score: 4.5, reviews: 100 },
          combined: 4.5,
        },
      });
      const restaurant2 = createMockRestaurant('식당2', {
        ratings: {
          kakao: null,
          naver: { score: 4.5, reviews: 200 },
          combined: 4.5,
        },
      });

      vi.mocked(intelligenceService.getRestaurantIntelligence)
        .mockResolvedValueOnce(restaurant1)
        .mockResolvedValueOnce(restaurant2);

      const service = new CompareRestaurantsServiceImpl(intelligenceService);

      const result = await service.compareRestaurants({
        restaurants: [
          { name: '식당1', region: '강남' },
          { name: '식당2', region: '강남' },
        ],
      });

      // 동점이면 리뷰 수 많은 것
      expect(result.comparison?.analysis.bestRating).toBe('식당2');
    });
  });

  describe('createCompareRestaurantsService', () => {
    it('should create a CompareRestaurantsServiceImpl instance', () => {
      const service = createCompareRestaurantsService(intelligenceService);

      expect(service).toBeInstanceOf(CompareRestaurantsServiceImpl);
    });
  });
});
