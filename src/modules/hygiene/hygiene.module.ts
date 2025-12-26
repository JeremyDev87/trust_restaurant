/**
 * Hygiene 모듈
 *
 * 식당 위생 정보 조회 기능을 제공하는 NestJS 모듈
 */

import { Module } from '@nestjs/common';
import { HygieneController } from './hygiene.controller.js';
import { HygieneService } from './hygiene.service.js';
import {
  ApiClientProvider,
  HygieneGradeServiceProvider,
  ViolationServiceProvider,
  CacheServiceProvider,
  KakaoMapServiceProvider,
} from '../../providers/index.js';

@Module({
  controllers: [HygieneController],
  providers: [
    HygieneService,
    ApiClientProvider,
    HygieneGradeServiceProvider,
    ViolationServiceProvider,
    CacheServiceProvider,
    KakaoMapServiceProvider,
  ],
  exports: [HygieneService],
})
export class HygieneModule {}
