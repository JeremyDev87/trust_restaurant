import { describe, it, expect } from 'vitest';
import {
  formatTrustScore,
  formatTrustScoreHeader,
  formatTrustScoreSimple,
  formatScoreBar,
  formatIndicatorDetails,
} from './trust-score-formatter.js';
import type { TrustScoreResult } from '../types/trust-score.types.js';

describe('trust-score-formatter', () => {
  const mockResult: TrustScoreResult = {
    score: 75,
    grade: 'B',
    message: '가도 됩니다',
    indicatorScores: {
      hygieneGrade: 80,
      violationHistory: 100,
      haccp: 100,
      franchise: 50,
    },
    details: {
      hygieneGrade: 'AA',
      violationCount: 0,
      isHaccpCertified: true,
      isFranchise: false,
    },
  };

  describe('formatScoreBar', () => {
    it('should format 100 as full bar', () => {
      expect(formatScoreBar(100)).toBe('█████');
    });

    it('should format 0 as empty bar', () => {
      expect(formatScoreBar(0)).toBe('░░░░░');
    });

    it('should format 60 as 3 filled', () => {
      expect(formatScoreBar(60)).toBe('███░░');
    });

    it('should format 50 as 3 filled (rounds up)', () => {
      expect(formatScoreBar(50)).toBe('███░░');
    });

    it('should format 40 as 2 filled', () => {
      expect(formatScoreBar(40)).toBe('██░░░');
    });
  });

  describe('formatTrustScoreHeader', () => {
    it('should format grade A with green icon', () => {
      const result: TrustScoreResult = {
        ...mockResult,
        score: 85,
        grade: 'A',
        message: '안심하고 가세요',
      };
      expect(formatTrustScoreHeader(result)).toBe(
        '🟢 신뢰도: A등급 (85점) - 안심하고 가세요',
      );
    });

    it('should format grade B with yellow icon', () => {
      expect(formatTrustScoreHeader(mockResult)).toBe(
        '🟡 신뢰도: B등급 (75점) - 가도 됩니다',
      );
    });

    it('should format grade C with orange icon', () => {
      const result: TrustScoreResult = {
        ...mockResult,
        score: 55,
        grade: 'C',
        message: '참고하세요',
      };
      expect(formatTrustScoreHeader(result)).toBe(
        '🟠 신뢰도: C등급 (55점) - 참고하세요',
      );
    });

    it('should format grade D with red icon', () => {
      const result: TrustScoreResult = {
        ...mockResult,
        score: 30,
        grade: 'D',
        message: '주의가 필요합니다',
      };
      expect(formatTrustScoreHeader(result)).toBe(
        '🔴 신뢰도: D등급 (30점) - 주의가 필요합니다',
      );
    });
  });

  describe('formatIndicatorDetails', () => {
    it('should format all indicators', () => {
      const lines = formatIndicatorDetails(mockResult.indicatorScores);

      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe('   위생등급: ████░ 80점');
      expect(lines[1]).toBe('   행정처분: █████ 100점');
      expect(lines[2]).toBe('   HACCP인증: █████ 100점');
      expect(lines[3]).toBe('   프랜차이즈: ███░░ 50점');
    });
  });

  describe('formatTrustScore', () => {
    it('should include details by default', () => {
      const formatted = formatTrustScore(mockResult);

      expect(formatted.headerLine).toBe(
        '🟡 신뢰도: B등급 (75점) - 가도 됩니다',
      );
      expect(formatted.detailLines).toHaveLength(4);
      expect(formatted.text).toContain('신뢰도: B등급');
      expect(formatted.text).toContain('위생등급:');
      expect(formatted.text).toContain('HACCP인증:');
    });

    it('should exclude details when requested', () => {
      const formatted = formatTrustScore(mockResult, false);

      expect(formatted.headerLine).toBe(
        '🟡 신뢰도: B등급 (75점) - 가도 됩니다',
      );
      expect(formatted.detailLines).toHaveLength(0);
      expect(formatted.text).toBe('🟡 신뢰도: B등급 (75점) - 가도 됩니다');
    });

    it('should join header and details with newlines', () => {
      const formatted = formatTrustScore(mockResult);
      const lines = formatted.text.split('\n');

      expect(lines[0]).toBe('🟡 신뢰도: B등급 (75점) - 가도 됩니다');
      expect(lines[1]).toBe('   위생등급: ████░ 80점');
    });
  });

  describe('formatTrustScoreSimple', () => {
    it('should return only header', () => {
      expect(formatTrustScoreSimple(mockResult)).toBe(
        '🟡 신뢰도: B등급 (75점) - 가도 됩니다',
      );
    });
  });
});
