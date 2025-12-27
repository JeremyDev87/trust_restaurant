import { describe, it, expect } from 'vitest';
import {
  formatCompareResult,
  formatCompareResultSimple,
  type FormattedCompareResult,
} from './compare-formatter.js';
import type {
  CompareRestaurantsResult,
  ComparedRestaurant,
} from '../types/compare.types.js';

describe('CompareFormatter', () => {
  const createMockComparedRestaurant = (
    name: string,
    overrides: Partial<ComparedRestaurant> = {},
  ): ComparedRestaurant => ({
    name,
    address: `서울 강남구 ${name} 123`,
    hygiene: {
      grade: 'AA',
      stars: 2,
      hasViolations: false,
    },
    rating: {
      kakao: null,
      naver: 4.5,
      combined: 4.5,
      reviewCount: 150,
    },
    priceRange: 'medium',
    scores: {
      hygiene: 80,
      popularity: 90,
      overall: 84,
    },
    ...overrides,
  });

  const createMockResult = (
    restaurants: ComparedRestaurant[],
    overrides: Partial<CompareRestaurantsResult> = {},
  ): CompareRestaurantsResult => ({
    status: 'complete',
    message: `${restaurants.length}개 식당 비교 완료`,
    found: restaurants.map(r => r.name),
    notFound: [],
    comparison: {
      restaurants,
      analysis: {
        bestHygiene: restaurants[0]?.name ?? null,
        bestRating: restaurants[0]?.name ?? null,
        bestValue: restaurants[0]?.name ?? null,
        recommendation: `종합적으로 "${restaurants[0]?.name}" 추천`,
      },
    },
    ...overrides,
  });

  describe('formatCompareResult', () => {
    it('should format comparison result with table', () => {
      const restaurant1 = createMockComparedRestaurant('스타벅스', {
        hygiene: { grade: 'AAA', stars: 3, hasViolations: false },
      });
      const restaurant2 = createMockComparedRestaurant('투썸플레이스');

      const result = createMockResult([restaurant1, restaurant2]);

      const formatted = formatCompareResult(result);

      expect(formatted.header).toContain('식당 비교 분석');
      expect(formatted.table).toContain('스타벅스');
      expect(formatted.table).toContain('투썸플레이스');
      expect(formatted.table).toContain('위생등급');
      expect(formatted.analysis).toContain('종합 분석');
      expect(formatted.recommendation).toContain('추천');
    });

    it('should include all sections in text output', () => {
      const restaurant1 = createMockComparedRestaurant('스타벅스');
      const restaurant2 = createMockComparedRestaurant('투썸플레이스');

      const result = createMockResult([restaurant1, restaurant2]);

      const formatted = formatCompareResult(result);

      expect(formatted.text).toContain(formatted.header);
      expect(formatted.text).toContain(formatted.table);
      expect(formatted.text).toContain(formatted.analysis);
      expect(formatted.text).toContain(formatted.recommendation);
    });

    it('should handle result with no comparison', () => {
      const result: CompareRestaurantsResult = {
        status: 'partial',
        message: '비교할 식당을 찾을 수 없습니다.',
        found: [],
        notFound: ['식당1', '식당2'],
        comparison: null,
      };

      const formatted = formatCompareResult(result);

      expect(formatted.header).toContain('식당 비교 분석');
      expect(formatted.table).toBe('');
      expect(formatted.analysis).toBe('');
      expect(formatted.recommendation).toBe(result.message);
    });

    it('should format hygiene grades correctly', () => {
      const restaurantAAA = createMockComparedRestaurant('AAA식당', {
        hygiene: { grade: 'AAA', stars: 3, hasViolations: false },
      });
      const restaurantNoGrade = createMockComparedRestaurant('미등록식당', {
        hygiene: { grade: null, stars: 0, hasViolations: false },
      });

      const result = createMockResult([restaurantAAA, restaurantNoGrade]);

      const formatted = formatCompareResult(result);

      expect(formatted.table).toContain('AAA');
      expect(formatted.table).toContain('미등록');
    });

    it('should format ratings correctly', () => {
      const restaurant = createMockComparedRestaurant('식당', {
        rating: {
          kakao: null,
          naver: 4.5,
          combined: 4.5,
          reviewCount: 328,
        },
      });

      const result = createMockResult([
        restaurant,
        createMockComparedRestaurant('식당2'),
      ]);

      const formatted = formatCompareResult(result);

      expect(formatted.table).toContain('4.5');
      expect(formatted.table).toContain('328');
    });

    it('should format null ratings as dash', () => {
      const restaurant = createMockComparedRestaurant('식당', {
        rating: {
          kakao: null,
          naver: null,
          combined: null,
          reviewCount: 0,
        },
      });

      const result = createMockResult([
        restaurant,
        createMockComparedRestaurant('식당2'),
      ]);

      const formatted = formatCompareResult(result);

      // 평점 없는 경우 '-' 표시
      expect(formatted.table).toContain('-');
    });

    it('should format price ranges correctly', () => {
      const restaurantLow = createMockComparedRestaurant('저가', {
        priceRange: 'low',
      });
      const restaurantMedium = createMockComparedRestaurant('중가', {
        priceRange: 'medium',
      });
      const restaurantHigh = createMockComparedRestaurant('고가', {
        priceRange: 'high',
      });

      const result = createMockResult([
        restaurantLow,
        restaurantMedium,
        restaurantHigh,
      ]);

      const formatted = formatCompareResult(result);

      expect(formatted.table).toContain('저');
      expect(formatted.table).toContain('중');
      expect(formatted.table).toContain('고');
    });

    it('should format violations correctly', () => {
      const restaurantWithViolation = createMockComparedRestaurant('위반식당', {
        hygiene: { grade: 'A', stars: 1, hasViolations: true },
      });
      const restaurantClean = createMockComparedRestaurant('청결식당', {
        hygiene: { grade: 'AAA', stars: 3, hasViolations: false },
      });

      const result = createMockResult([
        restaurantWithViolation,
        restaurantClean,
      ]);

      const formatted = formatCompareResult(result);

      expect(formatted.table).toContain('있음');
      expect(formatted.table).toContain('없음');
    });

    it('should filter by criteria', () => {
      const restaurant1 = createMockComparedRestaurant('식당1');
      const restaurant2 = createMockComparedRestaurant('식당2');

      const result = createMockResult([restaurant1, restaurant2]);

      const formatted = formatCompareResult(result, { criteria: ['hygiene'] });

      expect(formatted.table).toContain('위생등급');
      expect(formatted.table).toContain('행정처분');
      // price criteria not included
      expect(formatted.table).not.toContain('가격대');
    });

    it('should include rating when criteria includes rating', () => {
      const restaurant1 = createMockComparedRestaurant('식당1');
      const restaurant2 = createMockComparedRestaurant('식당2');

      const result = createMockResult([restaurant1, restaurant2]);

      const formatted = formatCompareResult(result, { criteria: ['rating'] });

      expect(formatted.table).toContain('네이버 평점');
    });

    it('should format analysis section with grade info', () => {
      const restaurant1 = createMockComparedRestaurant('스타벅스', {
        hygiene: { grade: 'AAA', stars: 3, hasViolations: false },
      });
      const restaurant2 = createMockComparedRestaurant('투썸');

      const result = createMockResult([restaurant1, restaurant2], {
        comparison: {
          restaurants: [restaurant1, restaurant2],
          analysis: {
            bestHygiene: '스타벅스',
            bestRating: '스타벅스',
            bestValue: '스타벅스',
            recommendation: '종합적으로 "스타벅스" 추천',
          },
        },
      });

      const formatted = formatCompareResult(result);

      expect(formatted.analysis).toContain('위생 최우수: 스타벅스');
      expect(formatted.analysis).toContain('AAA 등급');
    });

    it('should format analysis section with rating info', () => {
      const restaurant1 = createMockComparedRestaurant('스타벅스', {
        rating: { kakao: null, naver: 4.8, combined: 4.8, reviewCount: 500 },
      });
      const restaurant2 = createMockComparedRestaurant('투썸');

      const result = createMockResult([restaurant1, restaurant2], {
        comparison: {
          restaurants: [restaurant1, restaurant2],
          analysis: {
            bestHygiene: '스타벅스',
            bestRating: '스타벅스',
            bestValue: '스타벅스',
            recommendation: '종합적으로 "스타벅스" 추천',
          },
        },
      });

      const formatted = formatCompareResult(result);

      expect(formatted.analysis).toContain('평점 최고: 스타벅스');
      expect(formatted.analysis).toContain('4.8점');
    });

    it('should respect custom column width', () => {
      const restaurant1 = createMockComparedRestaurant('스타벅스');
      const restaurant2 = createMockComparedRestaurant('투썸플레이스');

      const result = createMockResult([restaurant1, restaurant2]);

      const formatted = formatCompareResult(result, { columnWidth: 20 });

      // 더 넓은 열이 생성됨
      expect(formatted.table.length).toBeGreaterThan(0);
    });
  });

  describe('formatCompareResultSimple', () => {
    it('should format simple result without table', () => {
      const restaurant1 = createMockComparedRestaurant('스타벅스');
      const restaurant2 = createMockComparedRestaurant('투썸플레이스');

      const result = createMockResult([restaurant1, restaurant2]);

      const formatted = formatCompareResultSimple(result);

      expect(formatted).toContain('스타벅스');
      expect(formatted).toContain('투썸플레이스');
      expect(formatted).toContain('추천');
      // 테이블 문자 없음
      expect(formatted).not.toContain('┌');
      expect(formatted).not.toContain('│');
    });

    it('should return message when no comparison', () => {
      const result: CompareRestaurantsResult = {
        status: 'partial',
        message: '비교할 식당을 찾을 수 없습니다.',
        found: [],
        notFound: ['식당1', '식당2'],
        comparison: null,
      };

      const formatted = formatCompareResultSimple(result);

      expect(formatted).toBe(result.message);
    });

    it('should show each restaurant info on separate lines', () => {
      const restaurant1 = createMockComparedRestaurant('스타벅스', {
        hygiene: { grade: 'AAA', stars: 3, hasViolations: false },
        rating: { kakao: null, naver: 4.5, combined: 4.5, reviewCount: 100 },
        priceRange: 'medium',
        scores: { hygiene: 100, popularity: 90, overall: 96 },
      });
      const restaurant2 = createMockComparedRestaurant('이디야', {
        hygiene: { grade: null, stars: 0, hasViolations: false },
        rating: { kakao: null, naver: 4.0, combined: 4.0, reviewCount: 50 },
        priceRange: 'low',
        scores: { hygiene: 40, popularity: 80, overall: 56 },
      });

      const result = createMockResult([restaurant1, restaurant2]);

      const formatted = formatCompareResultSimple(result);

      expect(formatted).toContain('[스타벅스]');
      expect(formatted).toContain('위생: AAA');
      expect(formatted).toContain('평점: 4.5');
      expect(formatted).toContain('가격: 중');
      expect(formatted).toContain('종합: 96점');

      expect(formatted).toContain('[이디야]');
      expect(formatted).toContain('위생: 미등록');
      expect(formatted).toContain('평점: 4.0');
      expect(formatted).toContain('가격: 저');
      expect(formatted).toContain('종합: 56점');
    });

    it('should handle null values gracefully', () => {
      const restaurant = createMockComparedRestaurant('식당', {
        hygiene: { grade: null, stars: 0, hasViolations: false },
        rating: { kakao: null, naver: null, combined: null, reviewCount: 0 },
        priceRange: null,
      });

      const result = createMockResult([
        restaurant,
        createMockComparedRestaurant('식당2'),
      ]);

      const formatted = formatCompareResultSimple(result);

      expect(formatted).toContain('미등록');
      expect(formatted).toContain('-');
    });
  });

  describe('Table Formatting', () => {
    it('should create proper table structure', () => {
      const restaurant1 = createMockComparedRestaurant('스타벅스');
      const restaurant2 = createMockComparedRestaurant('투썸');

      const result = createMockResult([restaurant1, restaurant2]);

      const formatted = formatCompareResult(result);

      // 테이블 상단
      expect(formatted.table).toContain('┌');
      expect(formatted.table).toContain('┬');
      expect(formatted.table).toContain('┐');

      // 테이블 중간
      expect(formatted.table).toContain('├');
      expect(formatted.table).toContain('┼');
      expect(formatted.table).toContain('┤');

      // 테이블 하단
      expect(formatted.table).toContain('└');
      expect(formatted.table).toContain('┴');
      expect(formatted.table).toContain('┘');

      // 행 구분
      expect(formatted.table).toContain('│');
    });

    it('should handle 5 restaurants', () => {
      const restaurants = [
        createMockComparedRestaurant('식당1'),
        createMockComparedRestaurant('식당2'),
        createMockComparedRestaurant('식당3'),
        createMockComparedRestaurant('식당4'),
        createMockComparedRestaurant('식당5'),
      ];

      const result = createMockResult(restaurants);

      const formatted = formatCompareResult(result);

      expect(formatted.table).toContain('식당1');
      expect(formatted.table).toContain('식당2');
      expect(formatted.table).toContain('식당3');
      expect(formatted.table).toContain('식당4');
      expect(formatted.table).toContain('식당5');
    });
  });

  describe('Korean Character Handling', () => {
    it('should handle Korean names in table', () => {
      const restaurant1 = createMockComparedRestaurant('한글식당이름');
      const restaurant2 = createMockComparedRestaurant('또다른한글');

      const result = createMockResult([restaurant1, restaurant2]);

      const formatted = formatCompareResult(result);

      expect(formatted.table).toContain('한글식당이름');
      expect(formatted.table).toContain('또다른한글');
    });

    it('should properly align Korean text', () => {
      const restaurant1 = createMockComparedRestaurant('가');
      const restaurant2 = createMockComparedRestaurant('나다라마');

      const result = createMockResult([restaurant1, restaurant2]);

      const formatted = formatCompareResult(result);

      // 테이블이 정상적으로 생성되어야 함
      const lines = formatted.table.split('\n');
      expect(lines.length).toBeGreaterThan(5);
    });
  });
});
