/**
 * 식당 위생 정보 요약 포맷터
 *
 * F001 조회 결과를 사용자 친화적인 한국어 요약으로 변환합니다.
 */

import type {
  RestaurantHygieneResult,
  HygieneGrade,
  ViolationHistory,
  ViolationItem,
} from '../types/domain/restaurant.types.js';
import {
  convertViolationType,
  convertViolationReason,
} from './term-converter.js';

/**
 * 아이콘 상수
 */
const ICONS = {
  GRADE_EXISTS: '🏆',
  GRADE_NONE: 'ℹ️',
  VIOLATION_NONE: '✅',
  VIOLATION_EXISTS: '⚠️',
  VIOLATION_ERROR: '❓',
} as const;

/**
 * 요약 결과 타입
 */
export interface FormattedSummary {
  /** 전체 요약 텍스트 */
  text: string;
  /** 위생등급 섹션 */
  hygieneSection: string;
  /** 행정처분 섹션 */
  violationSection: string;
}

/**
 * 별점 포맷팅
 *
 * @param stars - 별점 (0-3)
 * @returns 별점 문자열 (예: "★★☆")
 */
export function formatStars(stars: 0 | 1 | 2 | 3): string {
  if (stars === 0) {
    return '';
  }

  const filled = '★'.repeat(stars);
  const empty = '☆'.repeat(3 - stars);

  return `${filled}${empty}`;
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD → YYYY.MM.DD)
 *
 * @param date - 날짜 문자열
 * @returns 포맷된 날짜
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) {
    return '';
  }

  return date.replace(/-/g, '.');
}

/**
 * 위생등급 섹션 포맷팅
 *
 * @param grade - 위생등급 정보
 * @returns 포맷된 위생등급 섹션
 */
export function formatHygieneGrade(grade: HygieneGrade): string {
  if (!grade.has_grade) {
    return `${ICONS.GRADE_NONE} 위생등급: 등급 미보유 (미신청 업소)`;
  }

  const stars = formatStars(grade.stars);

  return `${ICONS.GRADE_EXISTS} 위생등급: ${stars} ${grade.grade_label} (${grade.grade})`;
}

/**
 * 개별 위반 항목 포맷팅
 *
 * @param item - 위반 항목
 * @returns 포맷된 위반 항목 문자열
 */
function formatViolationItem(item: ViolationItem): string {
  const date = formatDate(item.date);
  const type = convertViolationType(item.type);
  const reason = convertViolationReason(item.reason);

  return `   - ${date} | ${type} | ${reason}`;
}

/**
 * 행정처분 섹션 포맷팅
 *
 * @param violations - 행정처분 정보 (null인 경우 조회 오류)
 * @returns 포맷된 행정처분 섹션
 */
export function formatViolations(violations: ViolationHistory | null): string {
  // API 오류 케이스
  if (violations === null) {
    return `${ICONS.VIOLATION_ERROR} 행정처분: 현재 조회할 수 없습니다.`;
  }

  // 처분 이력 없음
  if (violations.total_count === 0) {
    return `${ICONS.VIOLATION_NONE} 행정처분: 최근 3년간 처분 이력이 없습니다.`;
  }

  // 처분 이력 있음
  const maxDisplay = 3;
  const displayItems = violations.recent_items.slice(0, maxDisplay);
  const remainingCount = violations.total_count - maxDisplay;

  let result = `${ICONS.VIOLATION_EXISTS} 행정처분: ${violations.total_count}건`;

  // 각 항목 추가
  for (const item of displayItems) {
    result += `\n${formatViolationItem(item)}`;
  }

  // "외 N건" 표시
  if (remainingCount > 0) {
    result += `\n   (외 ${remainingCount}건)`;
  }

  return result;
}

/**
 * 전체 요약 포맷팅
 *
 * @param data - F001 조회 결과
 * @returns 포맷된 요약
 */
export function formatSummary(data: RestaurantHygieneResult): FormattedSummary {
  const hygieneSection = formatHygieneGrade(data.hygiene_grade);
  const violationSection = formatViolations(data.violations);

  return {
    hygieneSection,
    violationSection,
    text: `${hygieneSection}\n${violationSection}`,
  };
}
