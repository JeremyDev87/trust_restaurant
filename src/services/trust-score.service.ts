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
      case 'AAA':
        return 100;
      case 'AA':
        return 80;
      case 'A':
        return 60;
      default:
        return 40;
    }
  },

  violationHistory(count: number): number {
    if (count === 0) return 100;
    if (count === 1) return 60;
    return 20;
  },

  haccp(isHaccpCertified: boolean): number {
    return isHaccpCertified ? 100 : 30;
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
  isHaccpCertified: boolean;
  isFranchise: boolean;
}

export function calculateTrustScore(input: TrustScoreInput): TrustScoreResult {
  const indicatorScores: TrustIndicatorScores = {
    hygieneGrade: calculateIndicatorScore.hygieneGrade(input.hygieneGrade),
    violationHistory: calculateIndicatorScore.violationHistory(input.violationCount),
    haccp: calculateIndicatorScore.haccp(input.isHaccpCertified),
    franchise: calculateIndicatorScore.franchise(input.isFranchise),
  };

  const score = Math.round(
    indicatorScores.hygieneGrade * TRUST_SCORE_WEIGHTS.hygieneGrade +
      indicatorScores.violationHistory * TRUST_SCORE_WEIGHTS.violationHistory +
      indicatorScores.haccp * TRUST_SCORE_WEIGHTS.haccp +
      indicatorScores.franchise * TRUST_SCORE_WEIGHTS.franchise,
  );

  const grade = determineGrade(score);

  const details: TrustIndicatorDetails = {
    hygieneGrade: input.hygieneGrade,
    violationCount: input.violationCount,
    isHaccpCertified: input.isHaccpCertified,
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
