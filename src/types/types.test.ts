import { describe, it, expect } from 'vitest';
import type {
  C004Response,
  C004Row,
  I2630Response,
  I2630Row,
} from './api/index.js';
import type {
  RestaurantHygieneResult,
  HygieneGrade,
  ViolationItem,
  GetRestaurantHygieneInput,
  HygieneError,
} from './domain/index.js';
import { HYGIENE_GRADE_MAP } from '../config/constants.js';

// 테스트 픽스처 임포트
import c004Sample from '../../tests/fixtures/c004-sample.json';
import i2630Sample from '../../tests/fixtures/i2630-sample.json';

describe('API Types', () => {
  describe('C004 Response', () => {
    it('should match C004Response structure', () => {
      const response = c004Sample as C004Response;

      expect(response.C004).toBeDefined();
      expect(response.C004.total_count).toBe('2');
      expect(response.C004.row).toHaveLength(2);
      expect(response.C004.RESULT.CODE).toBe('INFO-000');
    });

    it('should have valid C004Row fields', () => {
      const response = c004Sample as C004Response;
      const row = response.C004.row![0] as C004Row;

      expect(row.BSSH_NM).toBe('스타벅스 선릉로점');
      expect(row.ADDR).toContain('강남구');
      expect(row.HG_ASGN_LV).toBe('매우우수');
      expect(row.ASGN_FROM).toBe('20240810');
      expect(row.ASGN_TO).toBe('20260809');
      expect(row.INDUTY_NM).toBe('휴게음식점');
    });
  });

  describe('I2630 Response', () => {
    it('should match I2630Response structure', () => {
      const response = i2630Sample as I2630Response;

      expect(response.I2630).toBeDefined();
      expect(response.I2630.total_count).toBe('2');
      expect(response.I2630.row).toHaveLength(2);
      expect(response.I2630.RESULT.CODE).toBe('INFO-000');
    });

    it('should have valid I2630Row fields', () => {
      const response = i2630Sample as I2630Response;
      const row = response.I2630.row![0] as I2630Row;

      expect(row.PRCSCITYPOINT_BSSHNM).toBe('야간비행');
      expect(row.ADDR).toContain('화성시');
      expect(row.DSPS_TYPECD_NM).toBe('영업정지');
      expect(row.DSPS_DCSNDT).toBe('20251224');
      expect(row.DSPS_BGNDT).toBe('20260105');
      expect(row.DSPS_ENDDT).toBe('20260107');
    });
  });
});

describe('Domain Types', () => {
  describe('HygieneGrade', () => {
    it('should create valid HygieneGrade with grade', () => {
      const grade: HygieneGrade = {
        has_grade: true,
        grade: 'AA',
        grade_label: '우수',
        grade_date: '2024-01-22',
        valid_until: '2026-01-21',
        stars: 2,
      };

      expect(grade.has_grade).toBe(true);
      expect(grade.grade).toBe('AA');
      expect(grade.stars).toBe(2);
    });

    it('should create valid HygieneGrade without grade', () => {
      const grade: HygieneGrade = {
        has_grade: false,
        grade: null,
        grade_label: null,
        grade_date: null,
        valid_until: null,
        stars: 0,
      };

      expect(grade.has_grade).toBe(false);
      expect(grade.grade).toBeNull();
      expect(grade.stars).toBe(0);
    });
  });

  describe('ViolationItem', () => {
    it('should create valid ViolationItem without period', () => {
      const item: ViolationItem = {
        date: '2023-05-12',
        type: '과태료',
        content: '과태료 50만원',
        reason: '유통기한 경과 제품 보관',
      };

      expect(item.date).toBe('2023-05-12');
      expect(item.type).toBe('과태료');
      expect(item.period).toBeUndefined();
    });

    it('should create valid ViolationItem with period', () => {
      const item: ViolationItem = {
        date: '2025-12-24',
        type: '영업정지',
        content: '영업정지 3일',
        reason: '청소년에게 주류 제공',
        period: {
          start: '2026-01-05',
          end: '2026-01-07',
        },
      };

      expect(item.period).toBeDefined();
      expect(item.period!.start).toBe('2026-01-05');
      expect(item.period!.end).toBe('2026-01-07');
    });
  });

  describe('RestaurantHygieneResult', () => {
    it('should create valid complete result', () => {
      const result: RestaurantHygieneResult = {
        restaurant: {
          name: '맛있는 마라탕',
          address: '서울특별시 종로구 종로3가 123-45',
          business_type: '일반음식점',
        },
        hygiene_grade: {
          has_grade: true,
          grade: 'AA',
          grade_label: '우수',
          grade_date: '2024-01-22',
          valid_until: '2026-01-21',
          stars: 2,
        },
        violations: {
          total_count: 0,
          recent_items: [],
          has_more: false,
        },
      };

      expect(result.restaurant.name).toBe('맛있는 마라탕');
      expect(result.hygiene_grade.grade).toBe('AA');
      expect(result.violations.total_count).toBe(0);
    });
  });

  describe('GetRestaurantHygieneInput', () => {
    it('should accept required fields only', () => {
      const input: GetRestaurantHygieneInput = {
        restaurant_name: '맛있는 마라탕',
        region: '종로구',
      };

      expect(input.restaurant_name).toBe('맛있는 마라탕');
      expect(input.region).toBe('종로구');
      expect(input.include_history).toBeUndefined();
    });

    it('should accept all fields', () => {
      const input: GetRestaurantHygieneInput = {
        restaurant_name: '맛있는 마라탕',
        region: '종로구',
        include_history: false,
      };

      expect(input.include_history).toBe(false);
    });
  });

  describe('HygieneError', () => {
    it('should create NOT_FOUND error', () => {
      const error: HygieneError = {
        code: 'NOT_FOUND',
        message: '해당 조건으로 식당을 찾을 수 없습니다.',
      };

      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create MULTIPLE_RESULTS error with candidates', () => {
      const error: HygieneError = {
        code: 'MULTIPLE_RESULTS',
        message: '동일한 이름의 식당이 2곳 있습니다.',
        candidates: [
          { name: '맛있는 마라탕', address: '종로3가점', license_no: '123' },
          { name: '맛있는 마라탕', address: '광화문점', license_no: '456' },
        ],
      };

      expect(error.code).toBe('MULTIPLE_RESULTS');
      expect(error.candidates).toHaveLength(2);
    });

    it('should create INVALID_INPUT error', () => {
      const error: HygieneError = {
        code: 'INVALID_INPUT',
        message: '지역을 입력해주세요.',
        missing_field: 'region',
      };

      expect(error.code).toBe('INVALID_INPUT');
      expect(error.missing_field).toBe('region');
    });
  });
});

describe('Constants', () => {
  describe('HYGIENE_GRADE_MAP', () => {
    it('should map 매우우수 correctly', () => {
      expect(HYGIENE_GRADE_MAP['매우우수']).toEqual({
        grade: 'AAA',
        label: '매우 우수',
        stars: 3,
      });
    });

    it('should map 우수 correctly', () => {
      expect(HYGIENE_GRADE_MAP['우수']).toEqual({
        grade: 'AA',
        label: '우수',
        stars: 2,
      });
    });

    it('should map 좋음 correctly', () => {
      expect(HYGIENE_GRADE_MAP['좋음']).toEqual({
        grade: 'A',
        label: '좋음',
        stars: 1,
      });
    });
  });
});
