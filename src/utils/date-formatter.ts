/**
 * 날짜 포맷 유틸리티
 *
 * 식약처 API 응답의 날짜 형식을 변환합니다.
 */

/**
 * 날짜 포맷 변환 (YYYYMMDD → YYYY-MM-DD)
 *
 * 식약처 API에서 반환하는 8자리 날짜 문자열을 ISO 형식으로 변환합니다.
 *
 * @param dateStr - 8자리 날짜 문자열 (예: "20240115")
 * @returns ISO 형식 날짜 문자열 (예: "2024-01-15") 또는 null
 *
 * @example
 * ```typescript
 * formatDate("20240115") // "2024-01-15"
 * formatDate("2024")     // null (8자리가 아님)
 * formatDate(undefined)  // null
 * formatDate("")         // null
 * ```
 */
export function formatDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.length !== 8) {
    return null;
  }
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}
