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
