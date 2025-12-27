import { describe, it, expect } from 'vitest';
import {
  calculateTrustScore,
  calculateIndicatorScore,
  determineGrade,
} from './trust-score.service.js';

describe('trust-score.service', () => {
  describe('calculateIndicatorScore', () => {
    it('hygieneGrade scoring', () => {
      expect(calculateIndicatorScore.hygieneGrade('AAA')).toBe(100);
      expect(calculateIndicatorScore.hygieneGrade('AA')).toBe(80);
      expect(calculateIndicatorScore.hygieneGrade('A')).toBe(60);
      expect(calculateIndicatorScore.hygieneGrade(null)).toBe(40);
    });

    it('violationHistory scoring', () => {
      expect(calculateIndicatorScore.violationHistory(0)).toBe(100);
      expect(calculateIndicatorScore.violationHistory(1)).toBe(60);
      expect(calculateIndicatorScore.violationHistory(2)).toBe(20);
    });

    it('haccp scoring', () => {
      expect(calculateIndicatorScore.haccp(true)).toBe(100);
      expect(calculateIndicatorScore.haccp(false)).toBe(30);
    });

    it('franchise scoring', () => {
      expect(calculateIndicatorScore.franchise(true)).toBe(70);
      expect(calculateIndicatorScore.franchise(false)).toBe(50);
    });
  });

  describe('determineGrade', () => {
    it('returns correct grades', () => {
      expect(determineGrade(80)).toBe('A');
      expect(determineGrade(60)).toBe('B');
      expect(determineGrade(40)).toBe('C');
      expect(determineGrade(39)).toBe('D');
    });
  });

  describe('calculateTrustScore', () => {
    it('calculates weighted score for HACCP certified restaurant', () => {
      // 위생등급 AAA(100)*0.35 + 행정처분 0건(100)*0.30 + HACCP(100)*0.25 + 프랜차이즈(70)*0.10
      // = 35 + 30 + 25 + 7 = 97
      const result = calculateTrustScore({
        hygieneGrade: 'AAA',
        violationCount: 0,
        isHaccpCertified: true,
        isFranchise: true,
      });
      expect(result.score).toBe(97);
      expect(result.grade).toBe('A');
      expect(result.message).toBe('안심하고 가세요');
    });

    it('calculates weighted score for non-certified restaurant', () => {
      // 위생등급 null(40)*0.35 + 행정처분 2건(20)*0.30 + HACCP없음(30)*0.25 + 비프랜(50)*0.10
      // = 14 + 6 + 7.5 + 5 = 32.5 → 33
      const result = calculateTrustScore({
        hygieneGrade: null,
        violationCount: 2,
        isHaccpCertified: false,
        isFranchise: false,
      });
      expect(result.score).toBe(33);
      expect(result.grade).toBe('D');
      expect(result.message).toBe('주의가 필요합니다');
    });

    it('returns correct details', () => {
      const result = calculateTrustScore({
        hygieneGrade: 'AA',
        violationCount: 1,
        isHaccpCertified: true,
        isFranchise: false,
      });
      expect(result.details).toEqual({
        hygieneGrade: 'AA',
        violationCount: 1,
        isHaccpCertified: true,
        isFranchise: false,
      });
    });

    it('returns correct indicator scores', () => {
      const result = calculateTrustScore({
        hygieneGrade: 'A',
        violationCount: 0,
        isHaccpCertified: false,
        isFranchise: true,
      });
      expect(result.indicatorScores).toEqual({
        hygieneGrade: 60,
        violationHistory: 100,
        haccp: 30,
        franchise: 70,
      });
    });
  });
});
