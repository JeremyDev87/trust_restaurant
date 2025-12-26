/**
 * 통합 에러 처리 유틸리티
 *
 * 에러 타입 가드, 에러 코드 상수, 에러 메시지 생성 함수를 제공합니다.
 */

import { ApiError } from './api-client.js';
import { KakaoApiError } from '../services/kakao-map.service.js';

/**
 * API 에러 코드
 */
export const API_ERROR_CODES = {
  HTTP_ERROR: 'HTTP_ERROR',
  TIMEOUT: 'TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN',
  // 식약처 API 코드
  INFO_000: 'INFO-000', // 정상
  INFO_200: 'INFO-200', // 데이터 없음
} as const;

/**
 * 카카오 API 에러 코드
 */
export const KAKAO_ERROR_CODES = {
  NO_API_KEY: 'NO_API_KEY',
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

/**
 * 쿼리 에러 코드
 */
export const QUERY_ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  MULTIPLE_RESULTS: 'MULTIPLE_RESULTS',
  API_ERROR: 'API_ERROR',
  KAKAO_API_ERROR: 'KAKAO_API_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type QueryErrorCode =
  (typeof QUERY_ERROR_CODES)[keyof typeof QUERY_ERROR_CODES];

/**
 * ApiError 타입 가드
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * KakaoApiError 타입 가드
 */
export function isKakaoApiError(error: unknown): error is KakaoApiError {
  return error instanceof KakaoApiError;
}

/**
 * 에러에서 메시지 추출
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * 에러에서 코드 추출
 */
export function getErrorCode(error: unknown): string {
  if (isApiError(error) || isKakaoApiError(error)) {
    return error.code;
  }
  return 'UNKNOWN';
}

/**
 * API 에러 메시지 생성
 */
export function formatApiErrorMessage(error: ApiError): string {
  return `API 오류가 발생했습니다: ${error.message} (코드: ${error.code})`;
}

/**
 * 카카오 API 에러 메시지 생성
 */
export function formatKakaoErrorMessage(error: KakaoApiError): string {
  return `카카오 API 오류: ${error.message} (코드: ${error.code})`;
}

/**
 * 알 수 없는 에러 메시지 생성
 */
export function formatUnknownErrorMessage(error: unknown): string {
  return `알 수 없는 오류가 발생했습니다: ${getErrorMessage(error)}`;
}

/**
 * 에러를 사용자 친화적 메시지로 변환
 */
export function toUserFriendlyMessage(error: unknown): string {
  if (isApiError(error)) {
    // 특정 에러 코드에 대한 친화적 메시지
    if (error.code === API_ERROR_CODES.INFO_200) {
      return '검색 결과가 없습니다.';
    }
    if (error.code === API_ERROR_CODES.TIMEOUT) {
      return '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
    }
    if (error.code === API_ERROR_CODES.NETWORK_ERROR) {
      return '네트워크 연결을 확인해주세요.';
    }
    return formatApiErrorMessage(error);
  }

  if (isKakaoApiError(error)) {
    if (error.code === KAKAO_ERROR_CODES.NO_API_KEY) {
      return '카카오 API 설정이 필요합니다.';
    }
    return formatKakaoErrorMessage(error);
  }

  return formatUnknownErrorMessage(error);
}

/**
 * INFO-200 (데이터 없음) 에러 여부 확인
 */
export function isNoDataError(error: unknown): boolean {
  return isApiError(error) && error.code === API_ERROR_CODES.INFO_200;
}

/**
 * 네트워크 관련 에러 여부 확인
 */
export function isNetworkError(error: unknown): boolean {
  if (isApiError(error)) {
    return (
      error.code === API_ERROR_CODES.NETWORK_ERROR ||
      error.code === API_ERROR_CODES.TIMEOUT
    );
  }
  if (isKakaoApiError(error)) {
    return error.code === KAKAO_ERROR_CODES.NETWORK_ERROR;
  }
  return false;
}
