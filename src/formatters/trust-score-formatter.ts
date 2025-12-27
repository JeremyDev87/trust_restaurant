/**
 * 신뢰도 점수 포맷터
 *
 * TrustScoreResult를 사용자 친화적인 한국어 요약으로 변환합니다.
 */

import type {
  TrustScoreResult,
  TrustGrade,
  TrustIndicatorScores,
} from '../types/trust-score.types.js';

/**
 * 등급별 아이콘
 */
const GRADE_ICONS: Record<TrustGrade, string> = {
  A: '🟢',
  B: '🟡',
  C: '🟠',
  D: '🔴',
} as const;

/**
 * 지표 이름 (한국어)
 */
const INDICATOR_NAMES = {
  hygieneGrade: '위생등급',
  violationHistory: '행정처분',
  haccp: 'HACCP인증',
  franchise: '프랜차이즈',
} as const;

/**
 * 포맷된 신뢰도 점수 결과
 */
export interface FormattedTrustScore {
  /** 전체 요약 텍스트 */
  text: string;
  /** 헤더 라인 (등급 + 점수 + 메시지) */
  headerLine: string;
  /** 지표별 상세 라인 */
  detailLines: string[];
}

/**
 * 신뢰도 점수 헤더 포맷팅
 *
 * @param result - 신뢰도 점수 결과
 * @returns 헤더 라인
 */
export function formatTrustScoreHeader(result: TrustScoreResult): string {
  const icon = GRADE_ICONS[result.grade];
  return `${icon} 신뢰도: ${result.grade}등급 (${result.score}점) - ${result.message}`;
}

/**
 * 지표 점수 막대 포맷팅
 *
 * @param score - 점수 (0-100)
 * @returns 막대 문자열
 */
export function formatScoreBar(score: number): string {
  const filled = Math.round(score / 20);
  const empty = 5 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * 지표별 상세 정보 포맷팅
 *
 * @param scores - 지표별 점수
 * @returns 상세 라인 배열
 */
export function formatIndicatorDetails(scores: TrustIndicatorScores): string[] {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(scores)) {
    const name = INDICATOR_NAMES[key as keyof typeof INDICATOR_NAMES];
    const bar = formatScoreBar(value);
    lines.push(`   ${name}: ${bar} ${value}점`);
  }

  return lines;
}

/**
 * 신뢰도 점수 전체 포맷팅
 *
 * @param result - 신뢰도 점수 결과
 * @param includeDetails - 상세 정보 포함 여부 (기본: true)
 * @returns 포맷된 신뢰도 점수
 */
export function formatTrustScore(
  result: TrustScoreResult,
  includeDetails: boolean = true,
): FormattedTrustScore {
  const headerLine = formatTrustScoreHeader(result);
  const detailLines = includeDetails
    ? formatIndicatorDetails(result.indicatorScores)
    : [];

  const text = includeDetails
    ? [headerLine, ...detailLines].join('\n')
    : headerLine;

  return {
    text,
    headerLine,
    detailLines,
  };
}

/**
 * 간단한 신뢰도 점수 포맷팅 (헤더만)
 *
 * @param result - 신뢰도 점수 결과
 * @returns 포맷된 헤더 텍스트
 */
export function formatTrustScoreSimple(result: TrustScoreResult): string {
  return formatTrustScoreHeader(result);
}
