/**
 * 유틸리티 모듈 익스포트
 */

export {
  FoodSafetyApiClient,
  ApiError,
  createApiClient,
  type ApiCallOptions,
} from './api-client.js';

export {
  parseAddress,
  normalizeRegion,
  matchAddress,
  matchName,
  matchRestaurant,
  type ParsedAddress,
} from './address-matcher.js';

export {
  normalizeString,
  containsDangerousChars,
  containsKorean,
  restaurantNameSchema,
  regionSchema,
  areaSchema,
  addressSchema,
  HygieneRequestSchema,
  AreaSearchRequestSchema,
  BulkHygieneRequestSchema,
  validateRequest,
  INPUT_LIMITS,
  type HygieneRequest,
  type AreaSearchRequest,
  type BulkHygieneRequest,
  type ValidationResult,
  type ValidationError,
  type ValidationOutcome,
} from './validation.js';

export {
  withCache,
  withCacheNullable,
  type CacheOptions,
} from './cache-wrapper.js';

export { formatDate } from './date-formatter.js';

export {
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
  type QueryErrorCode,
} from './error-handler.js';
