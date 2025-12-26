/**
 * 입력 검증 유틸리티 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeString,
  containsDangerousChars,
  containsKorean,
  restaurantNameSchema,
  regionSchema,
  areaSchema,
  addressSchema,
  HygieneRequestSchema,
  AreaSearchRequestSchema,
  BulkHygieneRequestSchema,
  validateRequest,
  INPUT_LIMITS,
} from './validation.js';

describe('normalizeString', () => {
  it('앞뒤 공백을 제거한다', () => {
    expect(normalizeString('  스타벅스  ')).toBe('스타벅스');
  });

  it('연속 공백을 단일 공백으로 변환한다', () => {
    expect(normalizeString('스타벅스   강남역점')).toBe('스타벅스 강남역점');
  });

  it('제로폭 문자를 제거한다', () => {
    expect(normalizeString('스타\u200B벅스')).toBe('스타벅스');
    expect(normalizeString('스타\uFEFF벅스')).toBe('스타벅스');
  });

  it('복합 정규화를 수행한다', () => {
    expect(normalizeString('  스타  \u200B벅스   강남  ')).toBe(
      '스타 벅스 강남',
    );
  });
});

describe('containsDangerousChars', () => {
  it('정상 문자열은 false를 반환한다', () => {
    expect(containsDangerousChars('스타벅스')).toBe(false);
    expect(containsDangerousChars('Starbucks')).toBe(false);
    expect(containsDangerousChars('스타벅스 강남역점')).toBe(false);
    expect(containsDangerousChars('강남구 역삼동 123-45')).toBe(false);
  });

  it('HTML 태그 문자는 true를 반환한다', () => {
    expect(containsDangerousChars('<script>')).toBe(true);
    expect(containsDangerousChars('스타벅스<')).toBe(true);
    expect(containsDangerousChars('>스타벅스')).toBe(true);
  });

  it('따옴표 문자는 true를 반환한다', () => {
    expect(containsDangerousChars("스타벅스'")).toBe(true);
    expect(containsDangerousChars('스타벅스"')).toBe(true);
    expect(containsDangerousChars('스타벅스`')).toBe(true);
  });

  it('백슬래시는 true를 반환한다', () => {
    expect(containsDangerousChars('스타벅스\\')).toBe(true);
  });

  it('세미콜론은 true를 반환한다', () => {
    expect(containsDangerousChars('스타벅스;')).toBe(true);
  });
});

describe('containsKorean', () => {
  it('한글이 포함된 문자열은 true를 반환한다', () => {
    expect(containsKorean('강남구')).toBe(true);
    expect(containsKorean('Seoul 강남')).toBe(true);
    expect(containsKorean('123 역삼동')).toBe(true);
  });

  it('한글이 없는 문자열은 false를 반환한다', () => {
    expect(containsKorean('Gangnam')).toBe(false);
    expect(containsKorean('123-456')).toBe(false);
    expect(containsKorean('')).toBe(false);
  });
});

describe('restaurantNameSchema', () => {
  it('유효한 식당명을 통과시킨다', () => {
    expect(restaurantNameSchema.parse('스타벅스')).toBe('스타벅스');
    expect(restaurantNameSchema.parse('Starbucks')).toBe('Starbucks');
    expect(restaurantNameSchema.parse('스타벅스 강남역점')).toBe(
      '스타벅스 강남역점',
    );
  });

  it('공백을 정규화한다', () => {
    expect(restaurantNameSchema.parse('  스타벅스  ')).toBe('스타벅스');
    expect(restaurantNameSchema.parse('스타벅스   강남점')).toBe(
      '스타벅스 강남점',
    );
  });

  it('빈 문자열을 거부한다', () => {
    expect(() => restaurantNameSchema.parse('')).toThrow();
    expect(() => restaurantNameSchema.parse('   ')).toThrow();
  });

  it('최대 길이를 초과하면 거부한다', () => {
    const longName = '가'.repeat(INPUT_LIMITS.MAX_RESTAURANT_NAME_LENGTH + 1);
    expect(() => restaurantNameSchema.parse(longName)).toThrow();
  });

  it('위험 문자를 거부한다', () => {
    expect(() => restaurantNameSchema.parse('스타벅스<script>')).toThrow();
    expect(() => restaurantNameSchema.parse("스타벅스'")).toThrow();
  });
});

describe('regionSchema', () => {
  it('유효한 지역명을 통과시킨다', () => {
    expect(regionSchema.parse('강남구')).toBe('강남구');
    expect(regionSchema.parse('서울특별시 강남구')).toBe('서울특별시 강남구');
    expect(regionSchema.parse('역삼동')).toBe('역삼동');
  });

  it('한글이 없으면 거부한다', () => {
    expect(() => regionSchema.parse('Gangnam')).toThrow('한글');
    expect(() => regionSchema.parse('123')).toThrow('한글');
  });

  it('빈 문자열을 거부한다', () => {
    expect(() => regionSchema.parse('')).toThrow();
  });

  it('최대 길이를 초과하면 거부한다', () => {
    const longRegion = '가'.repeat(INPUT_LIMITS.MAX_REGION_LENGTH + 1);
    expect(() => regionSchema.parse(longRegion)).toThrow();
  });
});

describe('areaSchema', () => {
  it('유효한 지역명을 통과시킨다', () => {
    expect(areaSchema.parse('강남구')).toBe('강남구');
    expect(areaSchema.parse('역삼역')).toBe('역삼역');
    expect(areaSchema.parse('홍대입구')).toBe('홍대입구');
  });

  it('한글이 없으면 거부한다', () => {
    expect(() => areaSchema.parse('Gangnam')).toThrow('한글');
  });
});

describe('addressSchema', () => {
  it('유효한 주소를 통과시킨다', () => {
    expect(addressSchema.parse('서울특별시 강남구 역삼동 123-45')).toBe(
      '서울특별시 강남구 역삼동 123-45',
    );
    expect(addressSchema.parse('강남대로 123길 45')).toBe('강남대로 123길 45');
  });

  it('빈 문자열을 거부한다', () => {
    expect(() => addressSchema.parse('')).toThrow();
  });

  it('최대 길이를 초과하면 거부한다', () => {
    const longAddress = '가'.repeat(INPUT_LIMITS.MAX_ADDRESS_LENGTH + 1);
    expect(() => addressSchema.parse(longAddress)).toThrow();
  });
});

describe('HygieneRequestSchema', () => {
  it('유효한 요청을 통과시킨다', () => {
    const result = HygieneRequestSchema.parse({
      restaurant_name: '스타벅스',
      region: '강남구',
    });

    expect(result.restaurant_name).toBe('스타벅스');
    expect(result.region).toBe('강남구');
    expect(result.include_history).toBe(true); // 기본값
  });

  it('include_history를 지정할 수 있다', () => {
    const result = HygieneRequestSchema.parse({
      restaurant_name: '스타벅스',
      region: '강남구',
      include_history: false,
    });

    expect(result.include_history).toBe(false);
  });

  it('식당명이 없으면 거부한다', () => {
    expect(() =>
      HygieneRequestSchema.parse({
        region: '강남구',
      }),
    ).toThrow();
  });

  it('지역명이 없으면 거부한다', () => {
    expect(() =>
      HygieneRequestSchema.parse({
        restaurant_name: '스타벅스',
      }),
    ).toThrow();
  });

  it('지역명에 한글이 없으면 거부한다', () => {
    expect(() =>
      HygieneRequestSchema.parse({
        restaurant_name: '스타벅스',
        region: 'Gangnam',
      }),
    ).toThrow('한글');
  });
});

describe('AreaSearchRequestSchema', () => {
  it('유효한 요청을 통과시킨다', () => {
    const result = AreaSearchRequestSchema.parse({
      area: '강남구',
    });

    expect(result.area).toBe('강남구');
    expect(result.category).toBe('all'); // 기본값
  });

  it('카테고리를 지정할 수 있다', () => {
    const result = AreaSearchRequestSchema.parse({
      area: '강남구',
      category: 'restaurant',
    });

    expect(result.category).toBe('restaurant');
  });

  it('잘못된 카테고리를 거부한다', () => {
    expect(() =>
      AreaSearchRequestSchema.parse({
        area: '강남구',
        category: 'invalid',
      }),
    ).toThrow();
  });
});

describe('BulkHygieneRequestSchema', () => {
  it('유효한 요청을 통과시킨다', () => {
    const result = BulkHygieneRequestSchema.parse({
      restaurants: [
        { name: '스타벅스', address: '강남구 역삼동 123' },
        { name: '맥도날드', address: '서초구 서초동 456' },
      ],
    });

    expect(result.restaurants).toHaveLength(2);
    expect(result.filter).toBe('all'); // 기본값
    expect(result.limit).toBe(10); // 기본값
  });

  it('빈 배열을 거부한다', () => {
    expect(() =>
      BulkHygieneRequestSchema.parse({
        restaurants: [],
      }),
    ).toThrow('최소 1개');
  });

  it('최대 개수를 초과하면 거부한다', () => {
    const tooMany = Array(INPUT_LIMITS.MAX_BULK_RESTAURANTS + 1)
      .fill(null)
      .map((_, i) => ({
        name: `식당${i}`,
        address: `주소${i} 강남구`,
      }));

    expect(() =>
      BulkHygieneRequestSchema.parse({
        restaurants: tooMany,
      }),
    ).toThrow('최대');
  });

  it('limit 범위를 검증한다', () => {
    expect(() =>
      BulkHygieneRequestSchema.parse({
        restaurants: [{ name: '스타벅스', address: '강남구' }],
        limit: 0,
      }),
    ).toThrow('최소 1개');

    expect(() =>
      BulkHygieneRequestSchema.parse({
        restaurants: [{ name: '스타벅스', address: '강남구' }],
        limit: INPUT_LIMITS.MAX_BULK_LIMIT + 1,
      }),
    ).toThrow('최대');
  });

  it('필터 옵션을 검증한다', () => {
    const result = BulkHygieneRequestSchema.parse({
      restaurants: [{ name: '스타벅스', address: '강남구' }],
      filter: 'clean',
    });

    expect(result.filter).toBe('clean');

    expect(() =>
      BulkHygieneRequestSchema.parse({
        restaurants: [{ name: '스타벅스', address: '강남구' }],
        filter: 'invalid',
      }),
    ).toThrow();
  });
});

describe('validateRequest', () => {
  it('성공 시 success: true와 data를 반환한다', () => {
    const result = validateRequest(HygieneRequestSchema, {
      restaurant_name: '스타벅스',
      region: '강남구',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.restaurant_name).toBe('스타벅스');
      expect(result.data.region).toBe('강남구');
    }
  });

  it('실패 시 success: false와 error를 반환한다', () => {
    const result = validateRequest(HygieneRequestSchema, {
      restaurant_name: '',
      region: '강남구',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_REQUEST');
      expect(result.error.message).toBeTruthy();
      expect(result.error.details).toBeDefined();
    }
  });

  it('여러 에러를 모두 반환한다', () => {
    const result = validateRequest(HygieneRequestSchema, {
      restaurant_name: '',
      region: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details?.length).toBeGreaterThan(0);
    }
  });
});
