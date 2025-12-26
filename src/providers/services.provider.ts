/**
 * 서비스 프로바이더
 *
 * 기존 서비스들을 NestJS DI 컨테이너에 등록
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
import { FoodSafetyApiClient } from '../utils/api-client.js';
import { API_CLIENT_TOKEN } from './api-client.provider.js';

export const HYGIENE_GRADE_SERVICE_TOKEN = 'HYGIENE_GRADE_SERVICE';
export const VIOLATION_SERVICE_TOKEN = 'VIOLATION_SERVICE';
export const CACHE_SERVICE_TOKEN = 'CACHE_SERVICE';
export const KAKAO_MAP_SERVICE_TOKEN = 'KAKAO_MAP_SERVICE';

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
