/**
 * MCP 모듈
 *
 * MCP Streamable HTTP Transport를 제공하는 NestJS 모듈
 */

import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller.js';
import {
  ApiClientProvider,
  CacheServiceProvider,
  KakaoMapServiceProvider,
  NaverPlaceServiceProvider,
  HygieneGradeServiceProvider,
  ViolationServiceProvider,
  BulkHygieneServiceProvider,
  IntelligenceServiceProvider,
  EnhancedAreaSearchServiceProvider,
  CompareServiceProvider,
  RecommendServiceProvider,
  ToolRegistryProvider,
  ToolContextProvider,
} from '../../providers/index.js';

@Module({
  controllers: [McpController],
  providers: [
    // 인프라 계층
    ApiClientProvider,
    CacheServiceProvider,
    // 도메인 서비스
    KakaoMapServiceProvider,
    NaverPlaceServiceProvider,
    HygieneGradeServiceProvider,
    ViolationServiceProvider,
    BulkHygieneServiceProvider,
    IntelligenceServiceProvider,
    // 유스케이스
    EnhancedAreaSearchServiceProvider,
    CompareServiceProvider,
    RecommendServiceProvider,
    // 도구
    ToolRegistryProvider,
    ToolContextProvider,
  ],
})
export class McpModule {}
