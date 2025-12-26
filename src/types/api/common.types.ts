/**
 * 공통 API 타입 정의
 *
 * 식품안전나라 API들이 공유하는 기본 타입
 */

/**
 * API 결과 코드 (모든 API 공통)
 */
export interface ApiResultBase {
  /** 결과 메시지 */
  MSG: string;
  /** 결과 코드 (INFO-000: 정상) */
  CODE: string;
}

/**
 * 공통 API 에러 코드
 */
export const API_RESULT_CODES = {
  /** 정상 응답 */
  SUCCESS: 'INFO-000',
  /** 데이터 없음 */
  NO_DATA: 'INFO-200',
  /** 인증 에러 */
  AUTH_ERROR: 'ERROR-300',
  /** 파라미터 에러 */
  PARAM_ERROR: 'ERROR-310',
  /** 서비스 에러 */
  SERVICE_ERROR: 'ERROR-500',
} as const;

export type ApiResultCode =
  (typeof API_RESULT_CODES)[keyof typeof API_RESULT_CODES];
