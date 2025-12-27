#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  createKakaoMapService,
  createHygieneGradeService,
  createViolationService,
  createBulkHygieneService,
  createCacheService,
  createNaverPlaceService,
  createRestaurantIntelligenceService,
  createCompareRestaurantsService,
  createRecommendRestaurantsService,
  createEnhancedAreaSearchService,
} from './services/index.js';
import { createApiClient } from './utils/api-client.js';
import {
  createToolContext,
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
  // 타입
  type GetRestaurantHygieneInput,
  type SearchAreaRestaurantsInput,
  type GetBulkHygieneInfoInput,
  type CompareRestaurantsToolInput,
  type RecommendRestaurantsToolInput,
  type GetRestaurantIntelligenceInput,
  type SearchAreaEnhancedInput,
} from './tools/index.js';

// 서비스 인스턴스 생성 (캐시 포함)
const cacheService = createCacheService();
const apiClient = createApiClient();
const kakaoMapService = createKakaoMapService(undefined, cacheService);
const hygieneGradeService = createHygieneGradeService(apiClient, cacheService);
const violationService = createViolationService(apiClient, cacheService);
const bulkHygieneService = createBulkHygieneService(
  hygieneGradeService,
  violationService,
);

// 추가 서비스 인스턴스 생성
const naverPlaceService = createNaverPlaceService(
  undefined,
  undefined,
  cacheService,
);
const intelligenceService = createRestaurantIntelligenceService(
  kakaoMapService,
  hygieneGradeService,
  violationService,
  naverPlaceService,
  cacheService,
);
const enhancedAreaSearchService = createEnhancedAreaSearchService(
  kakaoMapService,
  intelligenceService,
);
const compareService = createCompareRestaurantsService(intelligenceService);
const recommendService = createRecommendRestaurantsService(
  enhancedAreaSearchService,
  intelligenceService,
);

// 도구 컨텍스트 생성
const toolContext = createToolContext({
  cache: cacheService,
  kakaoMap: kakaoMapService,
  naverPlace: naverPlaceService,
  hygieneGrade: hygieneGradeService,
  violation: violationService,
  bulkHygiene: bulkHygieneService,
  intelligence: intelligenceService,
  compare: compareService,
  recommend: recommendService,
});

/**
 * Trust Restaurant MCP Server
 *
 * 식약처 공인 데이터 기반 식당 위생 정보 조회 서비스
 */
const server = new McpServer({
  name: 'trust-restaurant',
  version: '1.0.0',
});

// ===== 기존 도구 등록 =====

server.registerTool(
  getRestaurantHygieneDef.name,
  {
    title: getRestaurantHygieneDef.title,
    description: getRestaurantHygieneDef.description,
    inputSchema: getRestaurantHygieneDef.inputSchema,
  },
  async args => {
    const result = await handleGetRestaurantHygiene(
      args as GetRestaurantHygieneInput,
      toolContext,
    );
    return { ...result };
  },
);

server.registerTool(
  searchAreaRestaurantsDef.name,
  {
    title: searchAreaRestaurantsDef.title,
    description: searchAreaRestaurantsDef.description,
    inputSchema: searchAreaRestaurantsDef.inputSchema,
  },
  async args => {
    const result = await handleSearchAreaRestaurants(
      args as SearchAreaRestaurantsInput,
      toolContext,
    );
    return { ...result };
  },
);

server.registerTool(
  getBulkHygieneInfoDef.name,
  {
    title: getBulkHygieneInfoDef.title,
    description: getBulkHygieneInfoDef.description,
    inputSchema: getBulkHygieneInfoDef.inputSchema,
  },
  async args => {
    const result = await handleGetBulkHygieneInfo(
      args as GetBulkHygieneInfoInput,
      toolContext,
    );
    return { ...result };
  },
);

// ===== 새 도구 등록 (Phase 5) =====

server.registerTool(
  compareRestaurantsDef.name,
  {
    title: compareRestaurantsDef.title,
    description: compareRestaurantsDef.description,
    inputSchema: compareRestaurantsDef.inputSchema,
  },
  async args => {
    const result = await handleCompareRestaurants(
      args as CompareRestaurantsToolInput,
      toolContext,
    );
    return { ...result };
  },
);

server.registerTool(
  recommendRestaurantsDef.name,
  {
    title: recommendRestaurantsDef.title,
    description: recommendRestaurantsDef.description,
    inputSchema: recommendRestaurantsDef.inputSchema,
  },
  async args => {
    const result = await handleRecommendRestaurants(
      args as RecommendRestaurantsToolInput,
      toolContext,
    );
    return { ...result };
  },
);

server.registerTool(
  getRestaurantIntelligenceDef.name,
  {
    title: getRestaurantIntelligenceDef.title,
    description: getRestaurantIntelligenceDef.description,
    inputSchema: getRestaurantIntelligenceDef.inputSchema,
  },
  async args => {
    const result = await handleGetRestaurantIntelligence(
      args as GetRestaurantIntelligenceInput,
      toolContext,
    );
    return { ...result };
  },
);

server.registerTool(
  searchAreaEnhancedDef.name,
  {
    title: searchAreaEnhancedDef.title,
    description: searchAreaEnhancedDef.description,
    inputSchema: searchAreaEnhancedDef.inputSchema,
  },
  async args => {
    const result = await handleSearchAreaEnhanced(
      args as SearchAreaEnhancedInput,
      toolContext,
    );
    return { ...result };
  },
);

/**
 * 서버 시작
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Trust Restaurant MCP Server started');
}

main().catch(error => {
  console.error('Server error:', error);
  process.exit(1);
});
