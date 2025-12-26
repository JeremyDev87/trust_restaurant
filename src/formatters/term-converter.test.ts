import { describe, it, expect } from 'vitest';
import {
  convertTerm,
  convertViolationType,
  convertViolationReason,
} from './term-converter.js';

describe('TermConverter', () => {
  describe('convertTerm', () => {
    it('should convert 시설개수명령 to 시설 개선 명령', () => {
      expect(convertTerm('시설개수명령')).toBe('시설 개선 명령');
    });

    it('should convert 품목제조정지 to 해당 품목 제조 금지', () => {
      expect(convertTerm('품목제조정지')).toBe('해당 품목 제조 금지');
    });

    it('should convert 위생적취급기준위반 to 위생 기준 위반', () => {
      expect(convertTerm('위생적취급기준위반')).toBe('위생 기준 위반');
    });

    it('should return original term if no conversion exists', () => {
      expect(convertTerm('알 수 없는 용어')).toBe('알 수 없는 용어');
    });

    it('should handle empty string', () => {
      expect(convertTerm('')).toBe('');
    });
  });

  describe('convertViolationType', () => {
    it('should keep 영업정지 as is', () => {
      expect(convertViolationType('영업정지')).toBe('영업정지');
    });

    it('should convert 영업허가취소 with space', () => {
      expect(convertViolationType('영업허가취소')).toBe('영업허가 취소');
    });

    it('should keep 과태료 as is', () => {
      expect(convertViolationType('과태료')).toBe('과태료');
    });

    it('should convert 시정명령 with space', () => {
      expect(convertViolationType('시정명령')).toBe('시정 명령');
    });

    it('should convert 영업소폐쇄 with space', () => {
      expect(convertViolationType('영업소폐쇄')).toBe('영업소 폐쇄');
    });

    it('should return original for unknown type', () => {
      expect(convertViolationType('기타처분')).toBe('기타처분');
    });
  });

  describe('convertViolationReason', () => {
    it('should convert 위생적취급기준위반', () => {
      expect(convertViolationReason('위생적취급기준위반')).toBe(
        '위생 기준 위반',
      );
    });

    it('should convert 식품위생법위반', () => {
      expect(convertViolationReason('식품위생법위반')).toBe('식품위생법 위반');
    });

    it('should convert 원산지표시위반', () => {
      expect(convertViolationReason('원산지표시위반')).toBe('원산지 표시 위반');
    });

    it('should handle compound reason with date prefix', () => {
      const input = '(20241115)위생적취급기준위반';
      expect(convertViolationReason(input)).toBe('(20241115)위생 기준 위반');
    });

    it('should handle reason with multiple known terms', () => {
      const input = '유통기한 경과 제품 보관';
      expect(convertViolationReason(input)).toBe('유통기한 경과 제품 보관');
    });

    it('should return original for unknown reason', () => {
      expect(convertViolationReason('기타 위반 사항')).toBe('기타 위반 사항');
    });
  });
});
