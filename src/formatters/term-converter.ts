/**
 * 법적 용어를 쉬운 표현으로 변환하는 유틸리티
 */

/**
 * 처분 유형 변환 맵
 */
const VIOLATION_TYPE_MAP: Record<string, string> = {
  영업정지: '영업정지',
  영업허가취소: '영업허가 취소',
  영업소폐쇄: '영업소 폐쇄',
  과태료: '과태료',
  시설개수명령: '시설 개선 명령',
  품목제조정지: '해당 품목 제조 금지',
  시정명령: '시정 명령',
};

/**
 * 위반 사유 변환 맵
 */
const VIOLATION_REASON_MAP: Record<string, string> = {
  위생적취급기준위반: '위생 기준 위반',
  식품위생법위반: '식품위생법 위반',
  원산지표시위반: '원산지 표시 위반',
  유통기한경과: '유통기한 경과',
  무허가영업: '무허가 영업',
  허위표시: '허위 표시',
};

/**
 * 모든 변환 맵 통합
 */
const ALL_TERM_MAP: Record<string, string> = {
  ...VIOLATION_TYPE_MAP,
  ...VIOLATION_REASON_MAP,
};

/**
 * 일반 용어 변환
 *
 * @param term - 변환할 용어
 * @returns 변환된 용어 (변환 불가 시 원본 반환)
 */
export function convertTerm(term: string): string {
  if (!term) {
    return term;
  }

  return ALL_TERM_MAP[term] ?? term;
}

/**
 * 처분 유형 변환
 *
 * @param type - 처분 유형
 * @returns 변환된 처분 유형
 */
export function convertViolationType(type: string): string {
  if (!type) {
    return type;
  }

  return VIOLATION_TYPE_MAP[type] ?? type;
}

/**
 * 위반 사유 변환
 *
 * 날짜 접두사 (예: "(20241115)") 가 있는 경우 보존하고 나머지만 변환
 *
 * @param reason - 위반 사유
 * @returns 변환된 위반 사유
 */
export function convertViolationReason(reason: string): string {
  if (!reason) {
    return reason;
  }

  // 날짜 접두사 패턴 확인 (예: "(20241115)")
  const datePrefix = reason.match(/^(\(\d{8}\))/);

  if (datePrefix) {
    const prefix = datePrefix[1];
    const rest = reason.slice(prefix.length);
    const converted = VIOLATION_REASON_MAP[rest] ?? rest;
    return `${prefix}${converted}`;
  }

  // 변환 맵에서 직접 찾기
  if (VIOLATION_REASON_MAP[reason]) {
    return VIOLATION_REASON_MAP[reason];
  }

  // 부분 매칭 시도 (맵의 키가 문자열에 포함되어 있는 경우)
  for (const [key, value] of Object.entries(VIOLATION_REASON_MAP)) {
    if (reason.includes(key)) {
      return reason.replace(key, value);
    }
  }

  return reason;
}
