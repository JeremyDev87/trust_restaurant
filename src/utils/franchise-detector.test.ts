import { describe, it, expect } from 'vitest';
import { isFranchise, FRANCHISE_BRANDS } from './franchise-detector.js';

describe('franchise-detector', () => {
  describe('isFranchise', () => {
    it('should detect major franchises', () => {
      expect(isFranchise('스타벅스 강남역점')).toBe(true);
      expect(isFranchise('맥도날드 강남점')).toBe(true);
      expect(isFranchise('본죽 강남역점')).toBe(true);
    });

    it('should return false for independent restaurants', () => {
      expect(isFranchise('할머니손칼국수')).toBe(false);
      expect(isFranchise('맛있는집')).toBe(false);
    });

    it('should handle empty input', () => {
      expect(isFranchise('')).toBe(false);
      expect(isFranchise('   ')).toBe(false);
    });
  });

  describe('FRANCHISE_BRANDS', () => {
    it('should have at least 30 brands', () => {
      expect(FRANCHISE_BRANDS.length).toBeGreaterThanOrEqual(30);
    });
  });
});
