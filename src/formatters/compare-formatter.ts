/**
 * 식당 비교 결과 포맷터
 *
 * 비교 결과를 사용자 친화적인 테이블 형식으로 변환합니다.
 */

import type {
  CompareRestaurantsResult,
  ComparedRestaurant,
  ComparisonCriteria,
} from '../types/compare.types.js';
import { DEFAULT_CRITERIA } from '../types/compare.types.js';

/**
 * 포맷팅 옵션
 */
export interface CompareFormatOptions {
  /** 비교 항목 (기본값: 전체) */
  criteria?: ComparisonCriteria[];
  /** 테이블 너비 (기본값: 14) */
  columnWidth?: number;
}

/**
 * 포맷팅된 비교 결과
 */
export interface FormattedCompareResult {
  /** 전체 텍스트 */
  text: string;
  /** 헤더 섹션 */
  header: string;
  /** 테이블 섹션 */
  table: string;
  /** 분석 섹션 */
  analysis: string;
  /** 추천 섹션 */
  recommendation: string;
}

/**
 * 아이콘 상수
 */
const ICONS = {
  CHART: '📊',
  BULB: '💡',
  POINT: '👉',
  CHECK: '✅',
  STAR: '⭐',
  WARNING: '⚠️',
} as const;

/**
 * 테이블 문자
 */
const TABLE_CHARS = {
  TOP_LEFT: '┌',
  TOP_RIGHT: '┐',
  BOTTOM_LEFT: '└',
  BOTTOM_RIGHT: '┘',
  HORIZONTAL: '─',
  VERTICAL: '│',
  T_DOWN: '┬',
  T_UP: '┴',
  T_RIGHT: '├',
  T_LEFT: '┤',
  CROSS: '┼',
} as const;

/**
 * 가격대 레이블
 */
const PRICE_LABELS: Record<string, string> = {
  low: '저',
  medium: '중',
  high: '고',
};

/**
 * 문자열 패딩 (한글 고려)
 */
function padString(str: string, width: number): string {
  // 한글 문자는 2칸으로 계산
  const displayWidth = getDisplayWidth(str);
  const padding = Math.max(0, width - displayWidth);
  return str + ' '.repeat(padding);
}

/**
 * 표시 너비 계산 (한글은 2칸)
 */
function getDisplayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    // 한글, 중국어, 일본어 등 CJK 문자는 2칸
    const code = char.charCodeAt(0);
    if (
      (code >= 0xac00 && code <= 0xd7af) || // 한글 음절
      (code >= 0x3000 && code <= 0x9fff) || // CJK
      (code >= 0xff00 && code <= 0xffef) // 전각 문자
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * 위생등급 포맷팅
 */
function formatHygieneGrade(restaurant: ComparedRestaurant): string {
  if (!restaurant.hygiene.grade) {
    return '미등록';
  }

  const stars = ICONS.STAR.repeat(restaurant.hygiene.stars);
  return `${stars} ${restaurant.hygiene.grade}`;
}

/**
 * 평점 포맷팅
 */
function formatRating(score: number | null, reviewCount: number): string {
  if (score === null) {
    return '-';
  }
  return `${score.toFixed(1)} (${reviewCount})`;
}

/**
 * 가격대 포맷팅
 */
function formatPriceRange(
  priceRange: 'low' | 'medium' | 'high' | null,
): string {
  if (!priceRange) {
    return '-';
  }
  return PRICE_LABELS[priceRange] || '-';
}

/**
 * 행정처분 포맷팅
 */
function formatViolations(hasViolations: boolean): string {
  return hasViolations ? `${ICONS.WARNING} 있음` : `${ICONS.CHECK} 없음`;
}

/**
 * 테이블 구분선 생성
 */
function createTableLine(
  columnWidths: number[],
  leftChar: string,
  midChar: string,
  rightChar: string,
): string {
  const cells = columnWidths.map(w => TABLE_CHARS.HORIZONTAL.repeat(w));
  return leftChar + cells.join(midChar) + rightChar;
}

/**
 * 테이블 행 생성
 */
function createTableRow(cells: string[], columnWidths: number[]): string {
  const paddedCells = cells.map((cell, i) => {
    const width = columnWidths[i];
    return ' ' + padString(cell, width - 2) + ' ';
  });
  return (
    TABLE_CHARS.VERTICAL +
    paddedCells.join(TABLE_CHARS.VERTICAL) +
    TABLE_CHARS.VERTICAL
  );
}

/**
 * 비교 테이블 생성
 */
function formatComparisonTable(
  restaurants: ComparedRestaurant[],
  criteria: ComparisonCriteria[],
  columnWidth: number,
): string {
  // 열 너비 계산: 첫 번째 열(항목명)은 고정, 나머지는 식당명
  const labelWidth = 16;
  const restaurantWidths = restaurants.map(() => columnWidth);
  const allWidths = [labelWidth, ...restaurantWidths];

  // 헤더 생성
  const headerCells = ['항목', ...restaurants.map(r => r.name)];
  const topLine = createTableLine(
    allWidths,
    TABLE_CHARS.TOP_LEFT,
    TABLE_CHARS.T_DOWN,
    TABLE_CHARS.TOP_RIGHT,
  );
  const headerRow = createTableRow(headerCells, allWidths);
  const headerSeparator = createTableLine(
    allWidths,
    TABLE_CHARS.T_RIGHT,
    TABLE_CHARS.CROSS,
    TABLE_CHARS.T_LEFT,
  );

  // 데이터 행 생성
  const rows: string[] = [];

  // 위생등급
  if (criteria.includes('hygiene')) {
    const hygieneRow = createTableRow(
      ['위생등급', ...restaurants.map(formatHygieneGrade)],
      allWidths,
    );
    rows.push(hygieneRow);
  }

  // 카카오/네이버 평점
  if (criteria.includes('rating')) {
    // 네이버 평점 (현재 주로 사용)
    const naverRow = createTableRow(
      [
        '네이버 평점',
        ...restaurants.map(r =>
          formatRating(r.rating.naver, r.rating.reviewCount),
        ),
      ],
      allWidths,
    );
    rows.push(naverRow);
  }

  // 가격대
  if (criteria.includes('price')) {
    const priceRow = createTableRow(
      ['가격대', ...restaurants.map(r => formatPriceRange(r.priceRange))],
      allWidths,
    );
    rows.push(priceRow);
  }

  // 행정처분
  if (criteria.includes('hygiene')) {
    const violationRow = createTableRow(
      [
        '행정처분',
        ...restaurants.map(r => formatViolations(r.hygiene.hasViolations)),
      ],
      allWidths,
    );
    rows.push(violationRow);
  }

  // 종합 점수
  const overallRow = createTableRow(
    ['종합 점수', ...restaurants.map(r => `${r.scores.overall}점`)],
    allWidths,
  );
  rows.push(overallRow);

  // 하단 구분선
  const bottomLine = createTableLine(
    allWidths,
    TABLE_CHARS.BOTTOM_LEFT,
    TABLE_CHARS.T_UP,
    TABLE_CHARS.BOTTOM_RIGHT,
  );

  return [topLine, headerRow, headerSeparator, ...rows, bottomLine].join('\n');
}

/**
 * 분석 섹션 포맷팅
 */
function formatAnalysisSection(result: CompareRestaurantsResult): string {
  if (!result.comparison) {
    return '';
  }

  const { analysis } = result.comparison;
  const lines: string[] = [`${ICONS.BULB} 종합 분석:`];

  if (analysis.bestHygiene) {
    const restaurant = result.comparison.restaurants.find(
      r => r.name === analysis.bestHygiene,
    );
    const gradeInfo = restaurant?.hygiene.grade
      ? ` (${restaurant.hygiene.grade} 등급)`
      : '';
    lines.push(`- 위생 최우수: ${analysis.bestHygiene}${gradeInfo}`);
  }

  if (analysis.bestRating) {
    const restaurant = result.comparison.restaurants.find(
      r => r.name === analysis.bestRating,
    );
    const ratingInfo = restaurant?.rating.combined
      ? ` (${restaurant.rating.combined.toFixed(1)}점)`
      : '';
    lines.push(`- 평점 최고: ${analysis.bestRating}${ratingInfo}`);
  }

  if (analysis.bestValue) {
    lines.push(`- 가성비 최고: ${analysis.bestValue}`);
  }

  return lines.join('\n');
}

/**
 * 추천 섹션 포맷팅
 */
function formatRecommendationSection(result: CompareRestaurantsResult): string {
  if (!result.comparison) {
    return '';
  }

  return `${ICONS.POINT} 추천: ${result.comparison.analysis.recommendation}`;
}

/**
 * 비교 결과 포맷팅
 */
export function formatCompareResult(
  result: CompareRestaurantsResult,
  options: CompareFormatOptions = {},
): FormattedCompareResult {
  const criteria = options.criteria ?? DEFAULT_CRITERIA;
  const columnWidth = options.columnWidth ?? 14;

  // 비교 불가능한 경우
  if (!result.comparison) {
    const header = `${ICONS.CHART} 식당 비교 분석\n`;
    const message = result.message;

    return {
      text: header + '\n' + message,
      header,
      table: '',
      analysis: '',
      recommendation: message,
    };
  }

  // 헤더
  const header = `${ICONS.CHART} 식당 비교 분석`;

  // 테이블
  const table = formatComparisonTable(
    result.comparison.restaurants,
    criteria,
    columnWidth,
  );

  // 분석
  const analysis = formatAnalysisSection(result);

  // 추천
  const recommendation = formatRecommendationSection(result);

  // 전체 텍스트
  const text = [header, '', table, '', analysis, '', recommendation].join('\n');

  return {
    text,
    header,
    table,
    analysis,
    recommendation,
  };
}

/**
 * 간단한 비교 결과 포맷팅 (테이블 없이)
 */
export function formatCompareResultSimple(
  result: CompareRestaurantsResult,
): string {
  if (!result.comparison) {
    return result.message;
  }

  const lines: string[] = [];

  lines.push(`${ICONS.CHART} ${result.found.length}개 식당 비교 결과`);
  lines.push('');

  for (const restaurant of result.comparison.restaurants) {
    const grade = restaurant.hygiene.grade ?? '미등록';
    const rating = restaurant.rating.combined?.toFixed(1) ?? '-';
    const price = PRICE_LABELS[restaurant.priceRange ?? ''] ?? '-';

    lines.push(`[${restaurant.name}]`);
    lines.push(
      `  위생: ${grade} | 평점: ${rating} | 가격: ${price} | 종합: ${restaurant.scores.overall}점`,
    );
  }

  lines.push('');
  lines.push(`${ICONS.POINT} ${result.comparison.analysis.recommendation}`);

  return lines.join('\n');
}
