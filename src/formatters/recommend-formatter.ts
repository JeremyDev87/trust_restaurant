/**
 * 식당 추천 결과 포맷터
 *
 * 추천 결과를 사용자 친화적인 형식으로 변환합니다.
 */

import type {
  RecommendRestaurantsResult,
  RecommendedRestaurant,
  RecommendPriority,
} from '../types/recommend.types.js';

/**
 * 포맷팅 옵션
 */
export interface RecommendFormatOptions {
  /** 상세 정보 표시 여부 (기본값: true) */
  showDetails?: boolean;
  /** 점수 표시 여부 (기본값: false) */
  showScores?: boolean;
}

/**
 * 포맷팅된 추천 결과
 */
export interface FormattedRecommendResult {
  /** 전체 텍스트 */
  text: string;
  /** 헤더 섹션 */
  header: string;
  /** 추천 목록 섹션 */
  list: string;
  /** 요약 섹션 */
  summary: string;
}

/**
 * 아이콘 상수
 */
const ICONS = {
  TROPHY: '\uD83C\uDFC6',
  STAR: '\u2B50',
  MONEY: '\uD83D\uDCB0',
  FOOD: '\uD83C\uDF7D\uFE0F',
  CHECK: '\u2705',
  WARNING: '\u26A0\uFE0F',
  MEDAL_1: '\uD83E\uDD47',
  MEDAL_2: '\uD83E\uDD48',
  MEDAL_3: '\uD83E\uDD49',
  POINT: '\uD83D\uDC49',
} as const;

/**
 * 가격대 레이블
 */
const PRICE_LABELS: Record<string, string> = {
  low: '1인 1만원대',
  medium: '1인 2-3만원대',
  high: '1인 4만원 이상',
};

/**
 * 우선순위 레이블
 */
const PRIORITY_LABELS: Record<RecommendPriority, string> = {
  hygiene: '위생 우선',
  rating: '평점 우선',
  balanced: '균형 모드',
};

/**
 * 순위별 메달/숫자 아이콘
 */
function getRankIcon(rank: number): string {
  switch (rank) {
    case 1:
      return ICONS.MEDAL_1;
    case 2:
      return ICONS.MEDAL_2;
    case 3:
      return ICONS.MEDAL_3;
    default:
      return `${rank}.`;
  }
}

/**
 * 위생등급 별 포맷팅
 */
function formatHygieneStars(stars: number): string {
  return ICONS.STAR.repeat(stars);
}

/**
 * 평점 포맷팅
 */
function formatRating(combined: number | null, reviewCount: number): string {
  if (combined === null) {
    return '평점 정보 없음';
  }

  const reviewText = reviewCount > 0 ? ` (리뷰 ${reviewCount})` : '';
  return `${combined.toFixed(1)}${reviewText}`;
}

/**
 * 가격대 포맷팅
 */
function formatPriceRange(priceRange: 'low' | 'medium' | 'high' | null): string {
  if (!priceRange) {
    return '가격 정보 없음';
  }
  return PRICE_LABELS[priceRange] || '가격 정보 없음';
}

/**
 * 행정처분 상태 포맷팅
 */
function formatViolationStatus(hasViolations: boolean): string {
  return hasViolations
    ? `${ICONS.WARNING} 행정처분 이력 있음`
    : `${ICONS.CHECK} 최근 3년 행정처분 없음`;
}

/**
 * 단일 추천 식당 포맷팅
 */
function formatRecommendedRestaurant(
  restaurant: RecommendedRestaurant,
  options: RecommendFormatOptions,
): string {
  const lines: string[] = [];

  // 순위 및 식당명
  const rankIcon = getRankIcon(restaurant.rank);
  lines.push(`${rankIcon} ${restaurant.name}`);

  // 위생등급 및 평점
  const hygieneStars = formatHygieneStars(restaurant.hygiene.stars);
  const gradeText = restaurant.hygiene.grade
    ? `위생등급 ${restaurant.hygiene.grade}`
    : '위생등급 미등록';
  const ratingText = formatRating(
    restaurant.rating.combined,
    restaurant.rating.reviewCount,
  );
  lines.push(`   ${hygieneStars} ${gradeText} | ${ratingText}`);

  if (options.showDetails !== false) {
    // 가격대 및 카테고리
    const priceText = formatPriceRange(restaurant.priceRange);
    lines.push(`   ${ICONS.MONEY} ${priceText} | ${ICONS.FOOD} ${restaurant.category}`);

    // 행정처분 상태
    lines.push(`   ${formatViolationStatus(restaurant.hygiene.hasViolations)}`);
  }

  // 점수 표시 (옵션)
  if (options.showScores) {
    lines.push(
      `   [점수] 총 ${restaurant.scores.total}점 (위생: ${restaurant.scores.hygiene}, 평점: ${restaurant.scores.rating}, 리뷰: ${restaurant.scores.reviews}, 목적: ${restaurant.scores.purpose})`,
    );
  }

  return lines.join('\n');
}

/**
 * 추천 결과 헤더 생성
 */
function formatHeader(result: RecommendRestaurantsResult): string {
  const { area, filters, recommendations } = result;
  const priorityLabel = PRIORITY_LABELS[filters.priority as RecommendPriority] || filters.priority;

  let headerText = `${ICONS.TROPHY} ${area}`;

  if (filters.purpose) {
    headerText += ` ${filters.purpose}`;
  }

  headerText += ` 추천 Top ${recommendations.length}`;
  headerText += ` (${priorityLabel})`;

  return headerText;
}

/**
 * 추천 목록 포맷팅
 */
function formatRecommendationList(
  recommendations: RecommendedRestaurant[],
  options: RecommendFormatOptions,
): string {
  if (recommendations.length === 0) {
    return '추천 결과가 없습니다.';
  }

  return recommendations
    .map((r) => formatRecommendedRestaurant(r, options))
    .join('\n\n');
}

/**
 * 요약 정보 생성
 */
function formatSummary(result: RecommendRestaurantsResult): string {
  const { totalCandidates, recommendations, filters } = result;

  if (recommendations.length === 0) {
    return '';
  }

  const lines: string[] = [];

  // 후보 수 정보
  lines.push(`총 ${totalCandidates}개 후보 중 상위 ${recommendations.length}개 추천`);

  // 필터 정보
  const filterParts: string[] = [];
  if (filters.category && filters.category !== '전체') {
    filterParts.push(`카테고리: ${filters.category}`);
  }
  if (filters.budget && filters.budget !== 'any') {
    const budgetLabels: Record<string, string> = {
      low: '저예산',
      medium: '중간',
      high: '고예산',
    };
    filterParts.push(`예산: ${budgetLabels[filters.budget] || filters.budget}`);
  }

  if (filterParts.length > 0) {
    lines.push(`[필터] ${filterParts.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * 추천 결과 포맷팅
 */
export function formatRecommendResult(
  result: RecommendRestaurantsResult,
  options: RecommendFormatOptions = {},
): FormattedRecommendResult {
  // 결과 없음 처리
  if (result.status === 'no_results') {
    return {
      text: result.message,
      header: '',
      list: '',
      summary: result.message,
    };
  }

  // 지역 범위 너무 넓음 처리
  if (result.status === 'area_too_broad') {
    return {
      text: result.message,
      header: '',
      list: '',
      summary: result.message,
    };
  }

  // 정상 결과 포맷팅
  const header = formatHeader(result);
  const list = formatRecommendationList(result.recommendations, options);
  const summary = formatSummary(result);

  const textParts = [header, '', list];
  if (summary) {
    textParts.push('', '---', summary);
  }

  return {
    text: textParts.join('\n'),
    header,
    list,
    summary,
  };
}

/**
 * 간단한 추천 결과 포맷팅 (한 줄 요약)
 */
export function formatRecommendResultSimple(
  result: RecommendRestaurantsResult,
): string {
  if (result.status !== 'success' || result.recommendations.length === 0) {
    return result.message;
  }

  const topRecommendations = result.recommendations.slice(0, 3);
  const names = topRecommendations.map((r) => r.name).join(', ');

  return `${result.area} 추천: ${names}`;
}

/**
 * 마크다운 형식으로 추천 결과 포맷팅
 */
export function formatRecommendResultMarkdown(
  result: RecommendRestaurantsResult,
  options: RecommendFormatOptions = {},
): string {
  if (result.status !== 'success') {
    return result.message;
  }

  const lines: string[] = [];
  const priorityLabel =
    PRIORITY_LABELS[result.filters.priority as RecommendPriority] ||
    result.filters.priority;

  // 헤더
  let title = `## ${result.area}`;
  if (result.filters.purpose) {
    title += ` ${result.filters.purpose}`;
  }
  title += ` 추천 Top ${result.recommendations.length}`;
  lines.push(title);
  lines.push(`*${priorityLabel}*`);
  lines.push('');

  // 추천 목록
  for (const restaurant of result.recommendations) {
    const gradeText = restaurant.hygiene.grade || '미등록';
    const ratingText =
      restaurant.rating.combined?.toFixed(1) || '-';
    const reviewText =
      restaurant.rating.reviewCount > 0
        ? `(${restaurant.rating.reviewCount}개 리뷰)`
        : '';

    lines.push(`### ${restaurant.rank}. ${restaurant.name}`);
    lines.push('');
    lines.push(`- **위생등급**: ${gradeText}`);
    lines.push(`- **평점**: ${ratingText} ${reviewText}`);
    lines.push(`- **카테고리**: ${restaurant.category}`);

    if (options.showDetails !== false) {
      lines.push(
        `- **가격대**: ${formatPriceRange(restaurant.priceRange)}`,
      );
      lines.push(
        `- **행정처분**: ${restaurant.hygiene.hasViolations ? '이력 있음' : '없음'}`,
      );
    }

    if (restaurant.highlights.length > 0) {
      lines.push(`- **특징**: ${restaurant.highlights.join(', ')}`);
    }

    if (options.showScores) {
      lines.push(`- **추천 점수**: ${restaurant.scores.total}점`);
    }

    lines.push('');
  }

  // 요약
  lines.push('---');
  lines.push(
    `*총 ${result.totalCandidates}개 후보 중 상위 ${result.recommendations.length}개 추천*`,
  );

  return lines.join('\n');
}
