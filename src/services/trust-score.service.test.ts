import { describe, it, expect } from 'vitest';
import { calculateTrustScore, calculateIndicatorScore, determineGrade } from './trust-score.service.js';

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

    it('businessDuration scoring', () => {
      expect(calculateIndicatorScore.businessDuration(10)).toBe(100);
      expect(calculateIndicatorScore.businessDuration(5)).toBe(80);
      expect(calculateIndicatorScore.businessDuration(3)).toBe(60);
      expect(calculateIndicatorScore.businessDuration(1)).toBe(40);
      expect(calculateIndicatorScore.businessDuration(0)).toBe(20);
      expect(calculateIndicatorScore.businessDuration(null)).toBe(50);
    });

    it('rating scoring', () => {
      expect(calculateIndicatorScore.rating(5.0)).toBe(100);
      expect(calculateIndicatorScore.rating(4.0)).toBe(80);
      expect(calculateIndicatorScore.rating(null)).toBe(50);
    });

    it('reviewCount scoring', () => {
      expect(calculateIndicatorScore.reviewCount(1000)).toBe(100);
      expect(calculateIndicatorScore.reviewCount(500)).toBe(80);
      expect(calculateIndicatorScore.reviewCount(100)).toBe(60);
      expect(calculateIndicatorScore.reviewCount(50)).toBe(40);
      expect(calculateIndicatorScore.reviewCount(10)).toBe(20);
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
    it('calculates weighted score', () => {
      const result = calculateTrustScore({
        hygieneGrade: null,
        violationCount: 0,
        businessYears: 7,
        rating: 4.2,
        reviewCount: 523,
        isFranchise: false,
      });
      expect(result.score).toBe(73);
      expect(result.grade).toBe('B');
    });
  });
});
