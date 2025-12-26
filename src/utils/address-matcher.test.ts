import { describe, it, expect } from 'vitest';
import {
  parseAddress,
  normalizeRegion,
  matchAddress,
  matchName,
  matchRestaurant,
} from './address-matcher.js';

describe('parseAddress', () => {
  it('should parse full Seoul address', () => {
    const result = parseAddress('서울특별시 강남구 역삼동 123-45');

    expect(result.sido).toBe('서울특별시');
    expect(result.sigungu).toBe('강남구');
    expect(result.eupmyeondong).toBe('역삼동');
    expect(result.full).toBe('서울특별시 강남구 역삼동 123-45');
  });

  it('should parse Gyeonggi-do address', () => {
    const result = parseAddress('경기도 성남시 분당구 정자동 178');

    expect(result.sido).toBe('경기도');
    expect(result.sigungu).toBe('성남시');
  });

  it('should handle address with detailed info', () => {
    const result = parseAddress('서울특별시 종로구 종로3가 123-45(1층 101호)');

    expect(result.sido).toBe('서울특별시');
    expect(result.sigungu).toBe('종로구');
    expect(result.eupmyeondong).toBe('종로3가');
  });

  it('should return full address even if parsing fails', () => {
    const result = parseAddress('잘못된 주소 형식');

    expect(result.full).toBe('잘못된 주소 형식');
    expect(result.sido).toBeUndefined();
  });
});

describe('normalizeRegion', () => {
  it('should return original region', () => {
    const result = normalizeRegion('강남구');
    expect(result).toContain('강남구');
  });

  it('should expand Seoul alias', () => {
    const result = normalizeRegion('서울 강남구');

    expect(result).toContain('서울 강남구');
    expect(result).toContain('서울특별시 강남구');
    expect(result).toContain('서울시 강남구');
  });

  it('should expand Gyeonggi alias', () => {
    const result = normalizeRegion('경기 성남시');

    expect(result).toContain('경기 성남시');
    expect(result).toContain('경기도 성남시');
  });

  it('should add gu/dong suffix for ambiguous region', () => {
    const result = normalizeRegion('강남');

    expect(result).toContain('강남');
    expect(result).toContain('강남구');
    expect(result).toContain('강남동');
  });

  it('should not add suffix if already has one', () => {
    const result = normalizeRegion('강남구');

    expect(result.filter(r => r === '강남구')).toHaveLength(1);
    expect(result).not.toContain('강남구구');
  });
});

describe('matchAddress', () => {
  it('should match exact district', () => {
    expect(matchAddress('서울특별시 강남구 역삼동 123-45', '강남구')).toBe(
      true,
    );
  });

  it('should match partial district name', () => {
    expect(matchAddress('서울특별시 강남구 역삼동 123-45', '강남')).toBe(true);
  });

  it('should match with sido prefix', () => {
    expect(matchAddress('서울특별시 강남구 역삼동 123-45', '서울 강남구')).toBe(
      true,
    );
  });

  it('should match dong level', () => {
    expect(matchAddress('서울특별시 강남구 역삼동 123-45', '역삼동')).toBe(
      true,
    );
  });

  it('should not match different district', () => {
    expect(matchAddress('서울특별시 강남구 역삼동 123-45', '종로구')).toBe(
      false,
    );
  });

  it('should be case insensitive', () => {
    expect(matchAddress('서울특별시 강남구 역삼동', '강남구')).toBe(true);
  });

  it('should ignore whitespace', () => {
    expect(matchAddress('서울특별시 강남구 역삼동', '강 남 구')).toBe(true);
  });

  it('should return false for empty inputs', () => {
    expect(matchAddress('', '강남구')).toBe(false);
    expect(matchAddress('서울특별시 강남구', '')).toBe(false);
  });
});

describe('matchName', () => {
  it('should match exact name', () => {
    expect(matchName('스타벅스 강남점', '스타벅스 강남점')).toBe(true);
  });

  it('should match partial name', () => {
    expect(matchName('스타벅스 강남점', '스타벅스')).toBe(true);
  });

  it('should be case insensitive for Korean', () => {
    expect(matchName('스타벅스', '스타벅스')).toBe(true);
  });

  it('should ignore whitespace', () => {
    expect(matchName('스타벅스 강남점', '스타벅스강남점')).toBe(true);
    expect(matchName('스타벅스강남점', '스타벅스 강남점')).toBe(true);
  });

  it('should not match different name', () => {
    expect(matchName('스타벅스 강남점', '투썸플레이스')).toBe(false);
  });

  it('should return false for empty inputs', () => {
    expect(matchName('', '스타벅스')).toBe(false);
    expect(matchName('스타벅스', '')).toBe(false);
  });
});

describe('matchRestaurant', () => {
  it('should match when both name and address match', () => {
    expect(
      matchRestaurant(
        '스타벅스 강남점',
        '서울특별시 강남구 역삼동 123-45',
        '스타벅스',
        '강남구',
      ),
    ).toBe(true);
  });

  it('should not match when only name matches', () => {
    expect(
      matchRestaurant(
        '스타벅스 강남점',
        '서울특별시 강남구 역삼동 123-45',
        '스타벅스',
        '종로구',
      ),
    ).toBe(false);
  });

  it('should not match when only address matches', () => {
    expect(
      matchRestaurant(
        '스타벅스 강남점',
        '서울특별시 강남구 역삼동 123-45',
        '투썸플레이스',
        '강남구',
      ),
    ).toBe(false);
  });

  it('should not match when neither matches', () => {
    expect(
      matchRestaurant(
        '스타벅스 강남점',
        '서울특별시 강남구 역삼동 123-45',
        '투썸플레이스',
        '종로구',
      ),
    ).toBe(false);
  });
});
