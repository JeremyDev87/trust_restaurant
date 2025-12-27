/**
 * 애플리케이션 계층 모듈 익스포트
 *
 * 유스케이스(Use Cases) - 비즈니스 로직 조합
 */

// 식당 비교 유스케이스
export {
  CompareRestaurantsServiceImpl,
  createCompareRestaurantsService,
  CompareValidationError,
  type CompareRestaurantsService,
} from './compare-restaurants.usecase.js';

// 식당 추천 유스케이스
export {
  RecommendRestaurantsServiceImpl,
  createRecommendRestaurantsService,
  RecommendValidationError,
  type RecommendRestaurantsService,
} from './recommend-restaurants.usecase.js';

// 지역 검색 확장 유스케이스
export {
  EnhancedAreaSearchServiceImpl,
  createEnhancedAreaSearchService,
  type EnhancedAreaSearchService,
} from './enhanced-area-search.usecase.js';

// 위생 정보 조회 유스케이스
export {
  queryRestaurantHygiene,
  type HygieneQueryParams,
  type HygieneQueryResult,
  type HygieneSuccessResult,
  type HygieneErrorResult,
  type HygieneQueryServices,
  type RestaurantCandidate,
} from './restaurant-hygiene.usecase.js';
