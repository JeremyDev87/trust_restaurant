/**
 * 날짜 포맷 유틸리티 테스트
 */

import { describe, it, expect } from 'vitest';
import { formatDate } from './date-formatter.js';

describe('formatDate', () => {
  describe('유효한 날짜 변환', () => {
    it('8자리 날짜를 YYYY-MM-DD 형식으로 변환한다', () => {
      expect(formatDate('20240115')).toBe('2024-01-15');
    });

    it('월말 날짜를 올바르게 변환한다', () => {
      expect(formatDate('20241231')).toBe('2024-12-31');
    });

    it('연초 날짜를 올바르게 변환한다', () => {
      expect(formatDate('20240101')).toBe('2024-01-01');
    });

    it('과거 날짜를 올바르게 변환한다', () => {
      expect(formatDate('19990101')).toBe('1999-01-01');
    });
  });

  describe('무효한 입력 처리', () => {
    it('undefined는 null을 반환한다', () => {
      expect(formatDate(undefined)).toBeNull();
    });

    it('빈 문자열은 null을 반환한다', () => {
      expect(formatDate('')).toBeNull();
    });

    it('8자리 미만의 문자열은 null을 반환한다', () => {
      expect(formatDate('2024')).toBeNull();
      expect(formatDate('202401')).toBeNull();
      expect(formatDate('2024011')).toBeNull();
    });

    it('8자리 초과의 문자열은 null을 반환한다', () => {
      expect(formatDate('202401150')).toBeNull();
      expect(formatDate('20240115123')).toBeNull();
    });
  });

  describe('엣지 케이스', () => {
    it('숫자가 아닌 8자리 문자열도 변환한다', () => {
      // 실제로는 숫자만 오지만, 함수는 길이만 체크함
      expect(formatDate('YYYYMMDD')).toBe('YYYY-MM-DD');
    });

    it('공백이 포함된 8자리 문자열도 변환한다', () => {
      // 함수는 길이만 체크하므로 공백 포함 8자리도 변환됨
      expect(formatDate('2024 115')).toBe('2024- 1-15');
    });

    it('7자리 + 공백은 8자리이므로 변환된다', () => {
      expect(formatDate('2024011 ')).toBe('2024-01-1 ');
    });
  });
});
