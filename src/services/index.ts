/**
 * 서비스 모듈 익스포트
 */

export {
  HygieneGradeService,
  createHygieneGradeService,
  type HygieneGradeSearchResult,
  type HygieneGradeItem,
} from './hygiene-grade.service.js';

export {
  ViolationService,
  createViolationService,
  type ViolationSearchResult,
  type ViolationItemWithBusiness,
} from './violation.service.js';

export {
  KakaoMapApiClient,
  KakaoApiError,
  createKakaoMapService,
  type KakaoMapService,
} from './kakao-map.service.js';

export {
  BulkHygieneServiceImpl,
  createBulkHygieneService,
  type BulkHygieneService,
} from './bulk-hygiene.service.js';

export {
  createCacheService,
  buildCacheKey,
  CACHE_TTL,
  CACHE_PREFIX,
  type CacheService,
} from './cache.service.js';

export {
  NaverPlaceApiClient,
  NaverApiError,
  createNaverPlaceService,
  type NaverPlaceService,
} from './naver-place.service.js';

export {
  RestaurantIntelligenceServiceImpl,
  createRestaurantIntelligenceService,
  type RestaurantIntelligenceService,
} from './restaurant-intelligence.service.js';

// 유스케이스는 application/ 계층에서 re-export
export {
  EnhancedAreaSearchServiceImpl,
  createEnhancedAreaSearchService,
  type EnhancedAreaSearchService,
} from '../application/enhanced-area-search.usecase.js';

export {
  CompareRestaurantsServiceImpl,
  createCompareRestaurantsService,
  CompareValidationError,
  type CompareRestaurantsService,
} from '../application/compare-restaurants.usecase.js';

export {
  RecommendRestaurantsServiceImpl,
  createRecommendRestaurantsService,
  RecommendValidationError,
  type RecommendRestaurantsService,
} from '../application/recommend-restaurants.usecase.js';
