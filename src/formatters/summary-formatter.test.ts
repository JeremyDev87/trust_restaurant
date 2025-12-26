import { describe, it, expect } from 'vitest';
import {
  formatSummary,
  formatHygieneGrade,
  formatViolations,
  formatStars,
  formatDate,
} from './summary-formatter.js';
import type { RestaurantHygieneResult } from '../types/domain/restaurant.types.js';

describe('SummaryFormatter', () => {
  describe('formatStars', () => {
    it('should format 3 stars for AAA grade', () => {
      expect(formatStars(3)).toBe('★★★');
    });

    it('should format 2 stars for AA grade', () => {
      expect(formatStars(2)).toBe('★★☆');
    });

    it('should format 1 star for A grade', () => {
      expect(formatStars(1)).toBe('★☆☆');
    });

    it('should return empty for 0 stars', () => {
      expect(formatStars(0)).toBe('');
    });
  });

  describe('formatDate', () => {
    it('should format YYYY-MM-DD to YYYY.MM.DD', () => {
      expect(formatDate('2024-01-15')).toBe('2024.01.15');
    });

    it('should handle empty date', () => {
      expect(formatDate('')).toBe('');
    });

    it('should handle null date', () => {
      expect(formatDate(null)).toBe('');
    });
  });

  describe('formatHygieneGrade', () => {
    it('should format AAA grade with trophy icon', () => {
      const grade = {
        has_grade: true,
        grade: 'AAA' as const,
        grade_label: '매우 우수' as const,
        grade_date: '2024-01-15',
        valid_until: '2026-01-14',
        stars: 3 as const,
      };

      const result = formatHygieneGrade(grade);

      expect(result).toBe('🏆 위생등급: ★★★ 매우 우수 (AAA)');
    });

    it('should format AA grade with 2 stars', () => {
      const grade = {
        has_grade: true,
        grade: 'AA' as const,
        grade_label: '우수' as const,
        grade_date: '2024-01-15',
        valid_until: '2026-01-14',
        stars: 2 as const,
      };

      const result = formatHygieneGrade(grade);

      expect(result).toBe('🏆 위생등급: ★★☆ 우수 (AA)');
    });

    it('should format A grade with 1 star', () => {
      const grade = {
        has_grade: true,
        grade: 'A' as const,
        grade_label: '좋음' as const,
        grade_date: '2024-01-15',
        valid_until: '2026-01-14',
        stars: 1 as const,
      };

      const result = formatHygieneGrade(grade);

      expect(result).toBe('🏆 위생등급: ★☆☆ 좋음 (A)');
    });

    it('should format no grade with info icon', () => {
      const grade = {
        has_grade: false,
        grade: null,
        grade_label: null,
        grade_date: null,
        valid_until: null,
        stars: 0 as const,
      };

      const result = formatHygieneGrade(grade);

      expect(result).toBe('ℹ️ 위생등급: 등급 미보유 (미신청 업소)');
    });
  });

  describe('formatViolations', () => {
    it('should format empty violations with check icon', () => {
      const violations = {
        total_count: 0,
        recent_items: [],
        has_more: false,
      };

      const result = formatViolations(violations);

      expect(result).toBe('✅ 행정처분: 최근 3년간 처분 이력이 없습니다.');
    });

    it('should format single violation', () => {
      const violations = {
        total_count: 1,
        recent_items: [
          {
            date: '2023-05-12',
            type: '과태료',
            content: '과태료 50만원',
            reason: '유통기한 경과 제품 보관',
          },
        ],
        has_more: false,
      };

      const result = formatViolations(violations);

      expect(result).toContain('⚠️ 행정처분: 1건');
      expect(result).toContain('2023.05.12');
      expect(result).toContain('과태료');
      expect(result).toContain('유통기한 경과 제품 보관');
    });

    it('should format multiple violations', () => {
      const violations = {
        total_count: 2,
        recent_items: [
          {
            date: '2024-01-15',
            type: '영업정지',
            content: '영업정지 7일',
            reason: '위생적취급기준위반',
          },
          {
            date: '2023-08-20',
            type: '과태료',
            content: '과태료 100만원',
            reason: '이물질 혼입',
          },
        ],
        has_more: false,
      };

      const result = formatViolations(violations);

      expect(result).toContain('⚠️ 행정처분: 2건');
      expect(result).toContain('2024.01.15');
      expect(result).toContain('영업정지');
      expect(result).toContain('2023.08.20');
      expect(result).toContain('과태료');
    });

    it('should limit to 3 violations and show "외 N건"', () => {
      const violations = {
        total_count: 5,
        recent_items: [
          {
            date: '2024-01-15',
            type: '영업정지',
            content: '영업정지 7일',
            reason: '위반1',
          },
          {
            date: '2023-08-20',
            type: '과태료',
            content: '과태료 100만원',
            reason: '위반2',
          },
          {
            date: '2023-03-05',
            type: '시정명령',
            content: '시정 명령',
            reason: '위반3',
          },
          {
            date: '2022-12-01',
            type: '과태료',
            content: '과태료 50만원',
            reason: '위반4',
          },
          {
            date: '2022-06-15',
            type: '시정명령',
            content: '시정 명령',
            reason: '위반5',
          },
        ],
        has_more: true,
      };

      const result = formatViolations(violations);

      expect(result).toContain('⚠️ 행정처분: 5건');
      // 최대 3건만 표시
      expect(result).toContain('2024.01.15');
      expect(result).toContain('2023.08.20');
      expect(result).toContain('2023.03.05');
      expect(result).not.toContain('2022.12.01');
      expect(result).toContain('외 2건');
    });

    it('should convert legal terms in violation reason', () => {
      const violations = {
        total_count: 1,
        recent_items: [
          {
            date: '2024-01-15',
            type: '시설개수명령',
            content: '시설 개선 명령',
            reason: '위생적취급기준위반',
          },
        ],
        has_more: false,
      };

      const result = formatViolations(violations);

      expect(result).toContain('시설 개선 명령');
      expect(result).toContain('위생 기준 위반');
    });

    it('should handle API error case', () => {
      const result = formatViolations(null);

      expect(result).toBe('❓ 행정처분: 현재 조회할 수 없습니다.');
    });
  });

  describe('formatSummary', () => {
    it('S-001: 위생등급 보유 + 처분 이력 없음', () => {
      const data: RestaurantHygieneResult = {
        restaurant: {
          name: '스타벅스 강남점',
          address: '서울특별시 강남구 역삼동 123',
          business_type: '휴게음식점',
        },
        hygiene_grade: {
          has_grade: true,
          grade: 'AA',
          grade_label: '우수',
          grade_date: '2024-01-15',
          valid_until: '2026-01-14',
          stars: 2,
        },
        violations: {
          total_count: 0,
          recent_items: [],
          has_more: false,
        },
      };

      const result = formatSummary(data);

      expect(result.hygieneSection).toBe('🏆 위생등급: ★★☆ 우수 (AA)');
      expect(result.violationSection).toBe(
        '✅ 행정처분: 최근 3년간 처분 이력이 없습니다.',
      );
      expect(result.text).toContain('🏆 위생등급:');
      expect(result.text).toContain('✅ 행정처분:');
    });

    it('S-002: 위생등급 보유 + 처분 이력 있음', () => {
      const data: RestaurantHygieneResult = {
        restaurant: {
          name: '테스트 식당',
          address: '서울특별시 강남구',
          business_type: '일반음식점',
        },
        hygiene_grade: {
          has_grade: true,
          grade: 'A',
          grade_label: '좋음',
          grade_date: '2024-01-15',
          valid_until: '2026-01-14',
          stars: 1,
        },
        violations: {
          total_count: 1,
          recent_items: [
            {
              date: '2023-05-12',
              type: '과태료',
              content: '과태료 50만원',
              reason: '유통기한 경과 제품 보관',
            },
          ],
          has_more: false,
        },
      };

      const result = formatSummary(data);

      expect(result.hygieneSection).toBe('🏆 위생등급: ★☆☆ 좋음 (A)');
      expect(result.violationSection).toContain('⚠️ 행정처분: 1건');
      expect(result.violationSection).toContain('2023.05.12');
    });

    it('S-003: 위생등급 미보유 + 처분 이력 없음', () => {
      const data: RestaurantHygieneResult = {
        restaurant: {
          name: '동네 식당',
          address: '서울특별시 종로구',
          business_type: '일반음식점',
        },
        hygiene_grade: {
          has_grade: false,
          grade: null,
          grade_label: null,
          grade_date: null,
          valid_until: null,
          stars: 0,
        },
        violations: {
          total_count: 0,
          recent_items: [],
          has_more: false,
        },
      };

      const result = formatSummary(data);

      expect(result.hygieneSection).toBe(
        'ℹ️ 위생등급: 등급 미보유 (미신청 업소)',
      );
      expect(result.violationSection).toBe(
        '✅ 행정처분: 최근 3년간 처분 이력이 없습니다.',
      );
    });

    it('S-004: 위생등급 미보유 + 처분 이력 다수', () => {
      const data: RestaurantHygieneResult = {
        restaurant: {
          name: '문제 식당',
          address: '서울특별시 종로구',
          business_type: '일반음식점',
        },
        hygiene_grade: {
          has_grade: false,
          grade: null,
          grade_label: null,
          grade_date: null,
          valid_until: null,
          stars: 0,
        },
        violations: {
          total_count: 3,
          recent_items: [
            {
              date: '2024-01-15',
              type: '영업정지',
              content: '영업정지 7일',
              reason: '위생적취급기준위반',
            },
            {
              date: '2023-08-20',
              type: '과태료',
              content: '과태료 100만원',
              reason: '이물질 혼입',
            },
            {
              date: '2023-03-05',
              type: '시정명령',
              content: '시정 명령',
              reason: '조리시설 위생 불량',
            },
          ],
          has_more: false,
        },
      };

      const result = formatSummary(data);

      expect(result.hygieneSection).toBe(
        'ℹ️ 위생등급: 등급 미보유 (미신청 업소)',
      );
      expect(result.violationSection).toContain('⚠️ 행정처분: 3건');
      expect(result.violationSection).toContain('2024.01.15');
      expect(result.violationSection).toContain('2023.08.20');
      expect(result.violationSection).toContain('2023.03.05');
    });

    it('E-002: 부분 데이터만 존재 (처분 조회 실패)', () => {
      const data: RestaurantHygieneResult = {
        restaurant: {
          name: '스타벅스 강남점',
          address: '서울특별시 강남구',
          business_type: '휴게음식점',
        },
        hygiene_grade: {
          has_grade: true,
          grade: 'AA',
          grade_label: '우수',
          grade_date: '2024-01-15',
          valid_until: '2026-01-14',
          stars: 2,
        },
        violations: {
          total_count: 0,
          recent_items: [],
          has_more: false,
        },
      };

      // API 오류 시뮬레이션: violations를 null로 전달
      const result = formatSummary({
        ...data,
        violations: null as unknown as RestaurantHygieneResult['violations'],
      });

      expect(result.hygieneSection).toBe('🏆 위생등급: ★★☆ 우수 (AA)');
      expect(result.violationSection).toBe(
        '❓ 행정처분: 현재 조회할 수 없습니다.',
      );
    });
  });
});
