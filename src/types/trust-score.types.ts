/**
 * 신뢰도 점수 시스템 타입 정의 (v2 - HACCP 추가)
 */

export type TrustGrade = 'A' | 'B' | 'C' | 'D';

export interface TrustIndicatorScores {
  hygieneGrade: number;
  violationHistory: number;
  haccp: number;
  franchise: number;
}

export interface TrustIndicatorDetails {
  hygieneGrade: string | null;
  violationCount: number;
  isHaccpCertified: boolean;
  isFranchise: boolean;
}

export interface TrustScoreResult {
  score: number;
  grade: TrustGrade;
  message: string;
  indicatorScores: TrustIndicatorScores;
  details: TrustIndicatorDetails;
}

export const TRUST_SCORE_WEIGHTS = {
  hygieneGrade: 0.35,
  violationHistory: 0.3,
  haccp: 0.25,
  franchise: 0.1,
} as const;

export const TRUST_GRADE_MESSAGES: Record<TrustGrade, string> = {
  A: '안심하고 가세요',
  B: '가도 됩니다',
  C: '참고하세요',
  D: '주의가 필요합니다',
} as const;
