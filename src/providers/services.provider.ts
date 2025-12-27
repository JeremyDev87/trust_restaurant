/**
 * 서비스 프로바이더
 *
 * 서비스들을 NestJS DI 컨테이너에 등록
 */

import { Provider } from '@nestjs/common';
import {
  HygieneGradeService,
  createHygieneGradeService,
} from '../services/hygiene-grade.service.js';
import {
  ViolationService,
  createViolationService,
} from '../services/violation.service.js';
import { CacheService, createCacheService } from '../services/cache.service.js';
import {
  KakaoMapService,
  createKakaoMapService,
} from '../services/kakao-map.service.js';
import {
  NaverPlaceService,
  createNaverPlaceService,
} from '../services/naver-place.service.js';
import {
  BulkHygieneService,
  createBulkHygieneService,
} from '../services/bulk-hygiene.service.js';
import {
  RestaurantIntelligenceService,
  createRestaurantIntelligenceService,
} from '../services/restaurant-intelligence.service.js';
import {
  EnhancedAreaSearchService,
  createEnhancedAreaSearchService,
} from '../application/enhanced-area-search.usecase.js';
import {
  CompareRestaurantsService,
  createCompareRestaurantsService,
} from '../application/compare-restaurants.usecase.js';
import {
  RecommendRestaurantsService,
  createRecommendRestaurantsService,
} from '../application/recommend-restaurants.usecase.js';
import { FoodSafetyApiClient } from '../utils/api-client.js';
import { API_CLIENT_TOKEN } from './api-client.provider.js';

export const HYGIENE_GRADE_SERVICE_TOKEN = 'HYGIENE_GRADE_SERVICE';
export const VIOLATION_SERVICE_TOKEN = 'VIOLATION_SERVICE';
export const CACHE_SERVICE_TOKEN = 'CACHE_SERVICE';
export const KAKAO_MAP_SERVICE_TOKEN = 'KAKAO_MAP_SERVICE';
export const NAVER_PLACE_SERVICE_TOKEN = 'NAVER_PLACE_SERVICE';
export const BULK_HYGIENE_SERVICE_TOKEN = 'BULK_HYGIENE_SERVICE';
export const INTELLIGENCE_SERVICE_TOKEN = 'INTELLIGENCE_SERVICE';
export const ENHANCED_AREA_SEARCH_SERVICE_TOKEN =
  'ENHANCED_AREA_SEARCH_SERVICE';
export const COMPARE_SERVICE_TOKEN = 'COMPARE_SERVICE';
export const RECOMMEND_SERVICE_TOKEN = 'RECOMMEND_SERVICE';

export const HygieneGradeServiceProvider: Provider = {
  provide: HYGIENE_GRADE_SERVICE_TOKEN,
  useFactory: (client: FoodSafetyApiClient): HygieneGradeService => {
    return createHygieneGradeService(client);
  },
  inject: [API_CLIENT_TOKEN],
};

export const ViolationServiceProvider: Provider = {
  provide: VIOLATION_SERVICE_TOKEN,
  useFactory: (client: FoodSafetyApiClient): ViolationService => {
    return createViolationService(client);
  },
  inject: [API_CLIENT_TOKEN],
};

export const CacheServiceProvider: Provider = {
  provide: CACHE_SERVICE_TOKEN,
  useFactory: (): CacheService => {
    return createCacheService();
  },
};

export const KakaoMapServiceProvider: Provider = {
  provide: KAKAO_MAP_SERVICE_TOKEN,
  useFactory: (cacheService: CacheService): KakaoMapService => {
    return createKakaoMapService(undefined, cacheService);
  },
  inject: [CACHE_SERVICE_TOKEN],
};

export const NaverPlaceServiceProvider: Provider = {
  provide: NAVER_PLACE_SERVICE_TOKEN,
  useFactory: (cacheService: CacheService): NaverPlaceService => {
    return createNaverPlaceService(undefined, undefined, cacheService);
  },
  inject: [CACHE_SERVICE_TOKEN],
};

export const BulkHygieneServiceProvider: Provider = {
  provide: BULK_HYGIENE_SERVICE_TOKEN,
  useFactory: (
    hygieneGrade: HygieneGradeService,
    violation: ViolationService,
  ): BulkHygieneService => {
    return createBulkHygieneService(hygieneGrade, violation);
  },
  inject: [HYGIENE_GRADE_SERVICE_TOKEN, VIOLATION_SERVICE_TOKEN],
};

export const IntelligenceServiceProvider: Provider = {
  provide: INTELLIGENCE_SERVICE_TOKEN,
  useFactory: (
    kakaoMap: KakaoMapService,
    hygieneGrade: HygieneGradeService,
    violation: ViolationService,
    naverPlace: NaverPlaceService,
    cache: CacheService,
  ): RestaurantIntelligenceService => {
    return createRestaurantIntelligenceService(
      kakaoMap,
      hygieneGrade,
      violation,
      naverPlace,
      cache,
    );
  },
  inject: [
    KAKAO_MAP_SERVICE_TOKEN,
    HYGIENE_GRADE_SERVICE_TOKEN,
    VIOLATION_SERVICE_TOKEN,
    NAVER_PLACE_SERVICE_TOKEN,
    CACHE_SERVICE_TOKEN,
  ],
};

export const EnhancedAreaSearchServiceProvider: Provider = {
  provide: ENHANCED_AREA_SEARCH_SERVICE_TOKEN,
  useFactory: (
    kakaoMap: KakaoMapService,
    intelligence: RestaurantIntelligenceService,
  ): EnhancedAreaSearchService => {
    return createEnhancedAreaSearchService(kakaoMap, intelligence);
  },
  inject: [KAKAO_MAP_SERVICE_TOKEN, INTELLIGENCE_SERVICE_TOKEN],
};

export const CompareServiceProvider: Provider = {
  provide: COMPARE_SERVICE_TOKEN,
  useFactory: (
    intelligence: RestaurantIntelligenceService,
  ): CompareRestaurantsService => {
    return createCompareRestaurantsService(intelligence);
  },
  inject: [INTELLIGENCE_SERVICE_TOKEN],
};

export const RecommendServiceProvider: Provider = {
  provide: RECOMMEND_SERVICE_TOKEN,
  useFactory: (
    enhancedAreaSearch: EnhancedAreaSearchService,
    intelligence: RestaurantIntelligenceService,
  ): RecommendRestaurantsService => {
    return createRecommendRestaurantsService(enhancedAreaSearch, intelligence);
  },
  inject: [ENHANCED_AREA_SEARCH_SERVICE_TOKEN, INTELLIGENCE_SERVICE_TOKEN],
};
