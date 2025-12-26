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
