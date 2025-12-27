/**
 * 신뢰도 점수 계산 서비스
 */

import type {
  TrustScoreResult,
  TrustIndicatorScores,
  TrustIndicatorDetails,
  TrustGrade,
} from '../types/trust-score.types.js';
import {
  TRUST_SCORE_WEIGHTS,
  TRUST_GRADE_MESSAGES,
} from '../types/trust-score.types.js';

export const calculateIndicatorScore = {
  hygieneGrade(grade: string | null): number {
    switch (grade) {
      case 'AAA': return 100;
      case 'AA': return 80;
      case 'A': return 60;
      default: return 40;
    }
  },

  violationHistory(count: number): number {
    if (count === 0) return 100;
    if (count === 1) return 60;
    return 20;
  },

  businessDuration(years: number | null): number {
    if (years === null) return 50;
    if (years >= 10) return 100;
    if (years >= 5) return 80;
    if (years >= 3) return 60;
    if (years >= 1) return 40;
    return 20;
  },

  rating(score: number | null): number {
    if (score === null) return 50;
    return Math.min(100, Math.round(score * 20));
  },

  reviewCount(count: number): number {
    if (count >= 1000) return 100;
    if (count >= 500) return 80;
    if (count >= 100) return 60;
    if (count >= 50) return 40;
    return 20;
  },

  franchise(isFranchise: boolean): number {
    return isFranchise ? 70 : 50;
  },
};

export function determineGrade(score: number): TrustGrade {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

export interface TrustScoreInput {
  hygieneGrade: string | null;
  violationCount: number;
  businessYears: number | null;
  rating: number | null;
  reviewCount: number;
  isFranchise: boolean;
}

export function calculateTrustScore(input: TrustScoreInput): TrustScoreResult {
  const indicatorScores: TrustIndicatorScores = {
    hygieneGrade: calculateIndicatorScore.hygieneGrade(input.hygieneGrade),
    violationHistory: calculateIndicatorScore.violationHistory(input.violationCount),
    businessDuration: calculateIndicatorScore.businessDuration(input.businessYears),
    rating: calculateIndicatorScore.rating(input.rating),
    reviewCount: calculateIndicatorScore.reviewCount(input.reviewCount),
    franchise: calculateIndicatorScore.franchise(input.isFranchise),
  };

  const score = Math.round(
    indicatorScores.hygieneGrade * TRUST_SCORE_WEIGHTS.hygieneGrade +
    indicatorScores.violationHistory * TRUST_SCORE_WEIGHTS.violationHistory +
    indicatorScores.businessDuration * TRUST_SCORE_WEIGHTS.businessDuration +
    indicatorScores.rating * TRUST_SCORE_WEIGHTS.rating +
    indicatorScores.reviewCount * TRUST_SCORE_WEIGHTS.reviewCount +
    indicatorScores.franchise * TRUST_SCORE_WEIGHTS.franchise
  );

  const grade = determineGrade(score);

  const details: TrustIndicatorDetails = {
    hygieneGrade: input.hygieneGrade,
    violationCount: input.violationCount,
    businessYears: input.businessYears,
    rating: input.rating,
    reviewCount: input.reviewCount,
    isFranchise: input.isFranchise,
  };

  return {
    score,
    grade,
    message: TRUST_GRADE_MESSAGES[grade],
    indicatorScores,
    details,
  };
}
