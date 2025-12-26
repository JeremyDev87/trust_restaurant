/**
 * 에러 핸들러 유틸리티 테스트
 */

import { describe, it, expect } from 'vitest';
import { ApiError } from './api-client.js';
import { KakaoApiError } from '../services/kakao-map.service.js';
import {
  API_ERROR_CODES,
  KAKAO_ERROR_CODES,
  QUERY_ERROR_CODES,
  isApiError,
  isKakaoApiError,
  getErrorMessage,
  getErrorCode,
  formatApiErrorMessage,
  formatKakaoErrorMessage,
  formatUnknownErrorMessage,
  toUserFriendlyMessage,
  isNoDataError,
  isNetworkError,
} from './error-handler.js';

describe('error-handler', () => {
  describe('에러 코드 상수', () => {
    it('API_ERROR_CODES가 올바른 값을 가진다', () => {
      expect(API_ERROR_CODES.HTTP_ERROR).toBe('HTTP_ERROR');
      expect(API_ERROR_CODES.TIMEOUT).toBe('TIMEOUT');
      expect(API_ERROR_CODES.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(API_ERROR_CODES.INFO_200).toBe('INFO-200');
    });

    it('KAKAO_ERROR_CODES가 올바른 값을 가진다', () => {
      expect(KAKAO_ERROR_CODES.NO_API_KEY).toBe('NO_API_KEY');
      expect(KAKAO_ERROR_CODES.API_ERROR).toBe('API_ERROR');
      expect(KAKAO_ERROR_CODES.NETWORK_ERROR).toBe('NETWORK_ERROR');
    });

    it('QUERY_ERROR_CODES가 올바른 값을 가진다', () => {
      expect(QUERY_ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
      expect(QUERY_ERROR_CODES.MULTIPLE_RESULTS).toBe('MULTIPLE_RESULTS');
      expect(QUERY_ERROR_CODES.API_ERROR).toBe('API_ERROR');
    });
  });

  describe('isApiError', () => {
    it('ApiError 인스턴스에 대해 true를 반환한다', () => {
      const error = new ApiError('test', 'TEST_CODE');
      expect(isApiError(error)).toBe(true);
    });

    it('KakaoApiError 인스턴스에 대해 false를 반환한다', () => {
      const error = new KakaoApiError('test', 'TEST_CODE');
      expect(isApiError(error)).toBe(false);
    });

    it('일반 Error에 대해 false를 반환한다', () => {
      const error = new Error('test');
      expect(isApiError(error)).toBe(false);
    });

    it('null에 대해 false를 반환한다', () => {
      expect(isApiError(null)).toBe(false);
    });
  });

  describe('isKakaoApiError', () => {
    it('KakaoApiError 인스턴스에 대해 true를 반환한다', () => {
      const error = new KakaoApiError('test', 'TEST_CODE');
      expect(isKakaoApiError(error)).toBe(true);
    });

    it('ApiError 인스턴스에 대해 false를 반환한다', () => {
      const error = new ApiError('test', 'TEST_CODE');
      expect(isKakaoApiError(error)).toBe(false);
    });

    it('일반 Error에 대해 false를 반환한다', () => {
      const error = new Error('test');
      expect(isKakaoApiError(error)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('Error 인스턴스에서 메시지를 추출한다', () => {
      const error = new Error('에러 메시지');
      expect(getErrorMessage(error)).toBe('에러 메시지');
    });

    it('문자열을 그대로 반환한다', () => {
      expect(getErrorMessage('문자열 에러')).toBe('문자열 에러');
    });

    it('숫자를 문자열로 변환한다', () => {
      expect(getErrorMessage(404)).toBe('404');
    });
  });

  describe('getErrorCode', () => {
    it('ApiError에서 코드를 추출한다', () => {
      const error = new ApiError('test', 'HTTP_ERROR');
      expect(getErrorCode(error)).toBe('HTTP_ERROR');
    });

    it('KakaoApiError에서 코드를 추출한다', () => {
      const error = new KakaoApiError('test', 'API_ERROR');
      expect(getErrorCode(error)).toBe('API_ERROR');
    });

    it('일반 에러는 UNKNOWN을 반환한다', () => {
      const error = new Error('test');
      expect(getErrorCode(error)).toBe('UNKNOWN');
    });
  });

  describe('formatApiErrorMessage', () => {
    it('ApiError를 포맷팅한다', () => {
      const error = new ApiError('Connection failed', 'NETWORK_ERROR');
      expect(formatApiErrorMessage(error)).toBe(
        'API 오류가 발생했습니다: Connection failed (코드: NETWORK_ERROR)',
      );
    });
  });

  describe('formatKakaoErrorMessage', () => {
    it('KakaoApiError를 포맷팅한다', () => {
      const error = new KakaoApiError('Invalid key', 'NO_API_KEY');
      expect(formatKakaoErrorMessage(error)).toBe(
        '카카오 API 오류: Invalid key (코드: NO_API_KEY)',
      );
    });
  });

  describe('formatUnknownErrorMessage', () => {
    it('일반 Error를 포맷팅한다', () => {
      const error = new Error('Something went wrong');
      expect(formatUnknownErrorMessage(error)).toBe(
        '알 수 없는 오류가 발생했습니다: Something went wrong',
      );
    });

    it('문자열 에러를 포맷팅한다', () => {
      expect(formatUnknownErrorMessage('문자열 에러')).toBe(
        '알 수 없는 오류가 발생했습니다: 문자열 에러',
      );
    });
  });

  describe('toUserFriendlyMessage', () => {
    it('INFO-200 에러에 친화적 메시지를 반환한다', () => {
      const error = new ApiError('No data', 'INFO-200');
      expect(toUserFriendlyMessage(error)).toBe('검색 결과가 없습니다.');
    });

    it('TIMEOUT 에러에 친화적 메시지를 반환한다', () => {
      const error = new ApiError('Timeout', 'TIMEOUT');
      expect(toUserFriendlyMessage(error)).toBe(
        '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
      );
    });

    it('NETWORK_ERROR에 친화적 메시지를 반환한다', () => {
      const error = new ApiError('Network', 'NETWORK_ERROR');
      expect(toUserFriendlyMessage(error)).toBe(
        '네트워크 연결을 확인해주세요.',
      );
    });

    it('NO_API_KEY 에러에 친화적 메시지를 반환한다', () => {
      const error = new KakaoApiError('No key', 'NO_API_KEY');
      expect(toUserFriendlyMessage(error)).toBe(
        '카카오 API 설정이 필요합니다.',
      );
    });

    it('기타 ApiError는 기본 포맷을 사용한다', () => {
      const error = new ApiError('Other error', 'OTHER_CODE');
      expect(toUserFriendlyMessage(error)).toBe(
        'API 오류가 발생했습니다: Other error (코드: OTHER_CODE)',
      );
    });

    it('일반 Error는 알 수 없는 오류 메시지를 반환한다', () => {
      const error = new Error('Unknown');
      expect(toUserFriendlyMessage(error)).toBe(
        '알 수 없는 오류가 발생했습니다: Unknown',
      );
    });
  });

  describe('isNoDataError', () => {
    it('INFO-200 에러에 true를 반환한다', () => {
      const error = new ApiError('No data', 'INFO-200');
      expect(isNoDataError(error)).toBe(true);
    });

    it('다른 ApiError에 false를 반환한다', () => {
      const error = new ApiError('Other', 'HTTP_ERROR');
      expect(isNoDataError(error)).toBe(false);
    });

    it('KakaoApiError에 false를 반환한다', () => {
      const error = new KakaoApiError('No data', 'API_ERROR');
      expect(isNoDataError(error)).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('ApiError NETWORK_ERROR에 true를 반환한다', () => {
      const error = new ApiError('Network', 'NETWORK_ERROR');
      expect(isNetworkError(error)).toBe(true);
    });

    it('ApiError TIMEOUT에 true를 반환한다', () => {
      const error = new ApiError('Timeout', 'TIMEOUT');
      expect(isNetworkError(error)).toBe(true);
    });

    it('KakaoApiError NETWORK_ERROR에 true를 반환한다', () => {
      const error = new KakaoApiError('Network', 'NETWORK_ERROR');
      expect(isNetworkError(error)).toBe(true);
    });

    it('다른 에러에 false를 반환한다', () => {
      const error = new ApiError('Other', 'HTTP_ERROR');
      expect(isNetworkError(error)).toBe(false);
    });

    it('일반 Error에 false를 반환한다', () => {
      const error = new Error('Network error');
      expect(isNetworkError(error)).toBe(false);
    });
  });
});
