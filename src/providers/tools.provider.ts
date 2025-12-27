/**
 * 도구 프로바이더
 *
 * ToolRegistry와 ToolContext를 NestJS DI 컨테이너에 등록
 */

import { Provider } from '@nestjs/common';
import {
  ToolRegistry,
  createToolContext,
  type ToolContext,
  type ToolHandler,
  // 도구 정의
  getRestaurantHygieneDef,
  searchAreaRestaurantsDef,
  getBulkHygieneInfoDef,
  compareRestaurantsDef,
  recommendRestaurantsDef,
  getRestaurantIntelligenceDef,
  searchAreaEnhancedDef,
  // 핸들러
  handleGetRestaurantHygiene,
  handleSearchAreaRestaurants,
  handleGetBulkHygieneInfo,
  handleCompareRestaurants,
  handleRecommendRestaurants,
  handleGetRestaurantIntelligence,
  handleSearchAreaEnhanced,
} from '../tools/index.js';
import type { CacheService } from '../services/cache.service.js';
import type { KakaoMapService } from '../services/kakao-map.service.js';
import type { NaverPlaceService } from '../services/naver-place.service.js';
import type { HygieneGradeService } from '../services/hygiene-grade.service.js';
import type { ViolationService } from '../services/violation.service.js';
import type { BulkHygieneService } from '../services/bulk-hygiene.service.js';
import type { RestaurantIntelligenceService } from '../services/restaurant-intelligence.service.js';
import type { CompareRestaurantsService } from '../application/compare-restaurants.usecase.js';
import type { RecommendRestaurantsService } from '../application/recommend-restaurants.usecase.js';
import {
  CACHE_SERVICE_TOKEN,
  KAKAO_MAP_SERVICE_TOKEN,
  NAVER_PLACE_SERVICE_TOKEN,
  HYGIENE_GRADE_SERVICE_TOKEN,
  VIOLATION_SERVICE_TOKEN,
  BULK_HYGIENE_SERVICE_TOKEN,
  INTELLIGENCE_SERVICE_TOKEN,
  COMPARE_SERVICE_TOKEN,
  RECOMMEND_SERVICE_TOKEN,
} from './services.provider.js';

export const TOOL_REGISTRY_TOKEN = 'TOOL_REGISTRY';
export const TOOL_CONTEXT_TOKEN = 'TOOL_CONTEXT';

/**
 * ToolContext 프로바이더
 *
 * 모든 서비스 의존성을 주입받아 ToolContext 생성
 */
export const ToolContextProvider: Provider = {
  provide: TOOL_CONTEXT_TOKEN,
  useFactory: (
    cache: CacheService,
    kakaoMap: KakaoMapService,
    naverPlace: NaverPlaceService,
    hygieneGrade: HygieneGradeService,
    violation: ViolationService,
    bulkHygiene: BulkHygieneService,
    intelligence: RestaurantIntelligenceService,
    compare: CompareRestaurantsService,
    recommend: RecommendRestaurantsService,
  ): ToolContext => {
    return createToolContext({
      cache,
      kakaoMap,
      naverPlace,
      hygieneGrade,
      violation,
      bulkHygiene,
      intelligence,
      compare,
      recommend,
    });
  },
  inject: [
    CACHE_SERVICE_TOKEN,
    KAKAO_MAP_SERVICE_TOKEN,
    NAVER_PLACE_SERVICE_TOKEN,
    HYGIENE_GRADE_SERVICE_TOKEN,
    VIOLATION_SERVICE_TOKEN,
    BULK_HYGIENE_SERVICE_TOKEN,
    INTELLIGENCE_SERVICE_TOKEN,
    COMPARE_SERVICE_TOKEN,
    RECOMMEND_SERVICE_TOKEN,
  ],
};

/**
 * ToolRegistry 프로바이더
 *
 * 모든 도구를 등록한 레지스트리 생성
 */
export const ToolRegistryProvider: Provider = {
  provide: TOOL_REGISTRY_TOKEN,
  useFactory: (): ToolRegistry => {
    const registry = new ToolRegistry();

    // 기존 도구
    registry.register({
      ...getRestaurantHygieneDef,
      handler: handleGetRestaurantHygiene as ToolHandler,
    });
    registry.register({
      ...searchAreaRestaurantsDef,
      handler: handleSearchAreaRestaurants as ToolHandler,
    });
    registry.register({
      ...getBulkHygieneInfoDef,
      handler: handleGetBulkHygieneInfo as ToolHandler,
    });

    // 새 도구 (Phase 5)
    registry.register({
      ...compareRestaurantsDef,
      handler: handleCompareRestaurants as ToolHandler,
    });
    registry.register({
      ...recommendRestaurantsDef,
      handler: handleRecommendRestaurants as ToolHandler,
    });
    registry.register({
      ...getRestaurantIntelligenceDef,
      handler: handleGetRestaurantIntelligence as ToolHandler,
    });
    registry.register({
      ...searchAreaEnhancedDef,
      handler: handleSearchAreaEnhanced as ToolHandler,
    });

    return registry;
  },
};
