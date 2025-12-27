import { describe, it, expect } from 'vitest';
import {
  formatRecommendResult,
  formatRecommendResultSimple,
  formatRecommendResultMarkdown,
} from './recommend-formatter.js';
import type {
  RecommendRestaurantsResult,
  RecommendedRestaurant,
} from '../types/recommend.types.js';

describe('RecommendFormatter', () => {
  const createMockRecommendedRestaurant = (
    rank: number,
    name: string,
    overrides: Partial<RecommendedRestaurant> = {},
  ): RecommendedRestaurant => ({
    rank,
    name,
    address: `서울 강남구 ${name} 123`,
    category: '음식점 > 한식',
    hygiene: {
      grade: 'AA',
      stars: 2,
      hasViolations: false,
    },
    rating: {
      combined: 4.5,
      reviewCount: 150,
    },
    priceRange: 'medium',
    scores: {
      total: 80,
      hygiene: 35,
      rating: 30,
      reviews: 10,
      purpose: 5,
    },
    highlights: ['AA 등급', '평점 4.5', '행정처분 없음'],
    ...overrides,
  });

  const mockSuccessResult: RecommendRestaurantsResult = {
    status: 'success',
    area: '강남역',
    filters: {
      purpose: '회식',
      category: '한식',
      priority: 'balanced',
      budget: 'medium',
    },
    totalCandidates: 10,
    recommendations: [
      createMockRecommendedRestaurant(1, '본죽&비빔밥', {
        hygiene: { grade: 'AAA', stars: 3, hasViolations: false },
        priceRange: 'low',
        highlights: ['AAA 등급', '평점 4.5', '행정처분 없음', '리뷰 328개', '가성비 좋음'],
      }),
      createMockRecommendedRestaurant(2, '계절밥상', {
        hygiene: { grade: 'AA', stars: 2, hasViolations: false },
        priceRange: 'medium',
      }),
      createMockRecommendedRestaurant(3, '한정식마을', {
        hygiene: { grade: 'A', stars: 1, hasViolations: true },
        rating: { combined: 4.2, reviewCount: 89 },
        priceRange: 'high',
        highlights: ['A 등급', '평점 4.2'],
      }),
    ],
    message: '"강남역" 회식 추천 Top 3 (균형 모드)',
  };

  const mockNoResultsResult: RecommendRestaurantsResult = {
    status: 'no_results',
    area: '존재하지않는지역',
    filters: {
      priority: 'balanced',
    },
    totalCandidates: 0,
    recommendations: [],
    message: '"존재하지않는지역" 지역에서 조건에 맞는 식당을 찾을 수 없습니다.',
  };

  const mockAreaTooBroadResult: RecommendRestaurantsResult = {
    status: 'area_too_broad',
    area: '강남구',
    filters: {
      priority: 'balanced',
    },
    totalCandidates: 500,
    recommendations: [],
    message:
      '"강남구" 지역은 범위가 너무 넓습니다. 다음 지역을 시도해 보세요: 강남역, 역삼역, 선릉역',
  };

  describe('formatRecommendResult', () => {
    it('should format success result with header', () => {
      const result = formatRecommendResult(mockSuccessResult);

      expect(result.header).toContain('강남역');
      expect(result.header).toContain('회식');
      expect(result.header).toContain('Top 3');
    });

    it('should format success result with list', () => {
      const result = formatRecommendResult(mockSuccessResult);

      expect(result.list).toContain('본죽&비빔밥');
      expect(result.list).toContain('계절밥상');
      expect(result.list).toContain('한정식마을');
    });

    it('should include hygiene grades in list', () => {
      const result = formatRecommendResult(mockSuccessResult);

      expect(result.list).toContain('AAA');
      expect(result.list).toContain('AA');
    });

    it('should include ratings in list', () => {
      const result = formatRecommendResult(mockSuccessResult);

      expect(result.list).toContain('4.5');
    });

    it('should format summary correctly', () => {
      const result = formatRecommendResult(mockSuccessResult);

      expect(result.summary).toContain('10개 후보');
      expect(result.summary).toContain('3개 추천');
    });

    it('should combine all sections in text', () => {
      const result = formatRecommendResult(mockSuccessResult);

      expect(result.text).toContain(result.header);
      expect(result.text).toContain(result.list);
    });

    it('should handle no_results status', () => {
      const result = formatRecommendResult(mockNoResultsResult);

      expect(result.text).toContain('찾을 수 없습니다');
      expect(result.header).toBe('');
      expect(result.list).toBe('');
    });

    it('should handle area_too_broad status', () => {
      const result = formatRecommendResult(mockAreaTooBroadResult);

      expect(result.text).toContain('범위가 너무 넓습니다');
      expect(result.text).toContain('강남역');
    });

    describe('options', () => {
      it('should show details by default', () => {
        const result = formatRecommendResult(mockSuccessResult);

        expect(result.list).toContain('1인');
        expect(result.list).toContain('행정처분');
      });

      it('should hide details when showDetails is false', () => {
        const result = formatRecommendResult(mockSuccessResult, {
          showDetails: false,
        });

        expect(result.list).not.toContain('1인');
        expect(result.list).not.toContain('최근 3년');
      });

      it('should show scores when showScores is true', () => {
        const result = formatRecommendResult(mockSuccessResult, {
          showScores: true,
        });

        expect(result.list).toContain('점수');
        expect(result.list).toContain('총');
      });

      it('should not show scores by default', () => {
        const result = formatRecommendResult(mockSuccessResult);

        expect(result.list).not.toContain('[점수]');
      });
    });
  });

  describe('formatRecommendResultSimple', () => {
    it('should return simple format for success', () => {
      const result = formatRecommendResultSimple(mockSuccessResult);

      expect(result).toContain('강남역');
      expect(result).toContain('추천');
      expect(result).toContain('본죽&비빔밥');
    });

    it('should include top 3 names', () => {
      const result = formatRecommendResultSimple(mockSuccessResult);

      expect(result).toContain('본죽&비빔밥');
      expect(result).toContain('계절밥상');
      expect(result).toContain('한정식마을');
    });

    it('should return message for no_results', () => {
      const result = formatRecommendResultSimple(mockNoResultsResult);

      expect(result).toBe(mockNoResultsResult.message);
    });

    it('should return message for area_too_broad', () => {
      const result = formatRecommendResultSimple(mockAreaTooBroadResult);

      expect(result).toBe(mockAreaTooBroadResult.message);
    });
  });

  describe('formatRecommendResultMarkdown', () => {
    it('should format with markdown headers', () => {
      const result = formatRecommendResultMarkdown(mockSuccessResult);

      expect(result).toContain('## 강남역');
      expect(result).toContain('### 1.');
      expect(result).toContain('### 2.');
    });

    it('should include markdown bold for labels', () => {
      const result = formatRecommendResultMarkdown(mockSuccessResult);

      expect(result).toContain('**위생등급**');
      expect(result).toContain('**평점**');
      expect(result).toContain('**카테고리**');
    });

    it('should include highlights', () => {
      const result = formatRecommendResultMarkdown(mockSuccessResult);

      expect(result).toContain('**특징**');
    });

    it('should include summary at bottom', () => {
      const result = formatRecommendResultMarkdown(mockSuccessResult);

      expect(result).toContain('총 10개 후보');
    });

    it('should return message for non-success status', () => {
      const result = formatRecommendResultMarkdown(mockNoResultsResult);

      expect(result).toBe(mockNoResultsResult.message);
    });

    it('should show scores when option is enabled', () => {
      const result = formatRecommendResultMarkdown(mockSuccessResult, {
        showScores: true,
      });

      expect(result).toContain('**추천 점수**');
    });
  });

  describe('edge cases', () => {
    it('should handle null ratings', () => {
      const resultWithNullRating: RecommendRestaurantsResult = {
        ...mockSuccessResult,
        recommendations: [
          createMockRecommendedRestaurant(1, '테스트식당', {
            rating: { combined: null, reviewCount: 0 },
          }),
        ],
      };

      const result = formatRecommendResult(resultWithNullRating);

      expect(result.list).toContain('평점 정보 없음');
    });

    it('should handle null hygiene grade', () => {
      const resultWithNullGrade: RecommendRestaurantsResult = {
        ...mockSuccessResult,
        recommendations: [
          createMockRecommendedRestaurant(1, '테스트식당', {
            hygiene: { grade: null, stars: 0, hasViolations: false },
          }),
        ],
      };

      const result = formatRecommendResult(resultWithNullGrade);

      expect(result.list).toContain('미등록');
    });

    it('should handle null price range', () => {
      const resultWithNullPrice: RecommendRestaurantsResult = {
        ...mockSuccessResult,
        recommendations: [
          createMockRecommendedRestaurant(1, '테스트식당', {
            priceRange: null,
          }),
        ],
      };

      const result = formatRecommendResult(resultWithNullPrice);

      expect(result.list).toContain('가격 정보 없음');
    });

    it('should handle empty recommendations', () => {
      const emptyResult: RecommendRestaurantsResult = {
        status: 'success',
        area: '강남역',
        filters: { priority: 'balanced' },
        totalCandidates: 0,
        recommendations: [],
        message: '추천 결과 없음',
      };

      const result = formatRecommendResult(emptyResult);

      expect(result.list).toContain('추천 결과가 없습니다');
    });

    it('should show medal icons for top 3 ranks', () => {
      const result = formatRecommendResult(mockSuccessResult);

      // 메달 이모지가 포함되어야 함 (1, 2, 3위)
      expect(result.list).toMatch(/\uD83E\uDD47/); // 금메달
      expect(result.list).toMatch(/\uD83E\uDD48/); // 은메달
      expect(result.list).toMatch(/\uD83E\uDD49/); // 동메달
    });

    it('should show number for rank 4+', () => {
      const resultWith5Restaurants: RecommendRestaurantsResult = {
        ...mockSuccessResult,
        recommendations: [
          createMockRecommendedRestaurant(1, '식당1'),
          createMockRecommendedRestaurant(2, '식당2'),
          createMockRecommendedRestaurant(3, '식당3'),
          createMockRecommendedRestaurant(4, '식당4'),
          createMockRecommendedRestaurant(5, '식당5'),
        ],
      };

      const result = formatRecommendResult(resultWith5Restaurants);

      expect(result.list).toContain('4.');
      expect(result.list).toContain('5.');
    });

    it('should show violation warning when hasViolations is true', () => {
      const resultWithViolation: RecommendRestaurantsResult = {
        ...mockSuccessResult,
        recommendations: [
          createMockRecommendedRestaurant(1, '테스트식당', {
            hygiene: { grade: 'A', stars: 1, hasViolations: true },
          }),
        ],
      };

      const result = formatRecommendResult(resultWithViolation);

      expect(result.list).toContain('이력 있음');
    });
  });

  describe('priority labels', () => {
    it('should show "위생 우선" for hygiene priority', () => {
      const hygieneResult: RecommendRestaurantsResult = {
        ...mockSuccessResult,
        filters: { ...mockSuccessResult.filters, priority: 'hygiene' },
      };

      const result = formatRecommendResult(hygieneResult);

      expect(result.header).toContain('위생 우선');
    });

    it('should show "평점 우선" for rating priority', () => {
      const ratingResult: RecommendRestaurantsResult = {
        ...mockSuccessResult,
        filters: { ...mockSuccessResult.filters, priority: 'rating' },
      };

      const result = formatRecommendResult(ratingResult);

      expect(result.header).toContain('평점 우선');
    });

    it('should show "균형 모드" for balanced priority', () => {
      const result = formatRecommendResult(mockSuccessResult);

      expect(result.header).toContain('균형 모드');
    });
  });
});
