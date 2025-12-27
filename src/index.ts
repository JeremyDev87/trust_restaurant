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
  getRestaurantHygieneDef,
  searchAreaRestaurantsDef,
  getBulkHygieneInfoDef,
  handleGetRestaurantHygiene,
  handleSearchAreaRestaurants,
  handleGetBulkHygieneInfo,
  type GetRestaurantHygieneInput,
  type SearchAreaRestaurantsInput,
  type GetBulkHygieneInfoInput,
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
 * Clean Plate MCP Server
 *
 * 식약처 공인 데이터 기반 식당 위생 정보 조회 서비스
 */
const server = new McpServer({
  name: 'trust-restaurant',
  version: '1.0.0',
});

/**
 * get_restaurant_hygiene 도구 등록
 *
 * 식당의 위생등급과 행정처분 이력을 조회합니다.
 */
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

/**
 * search_area_restaurants 도구 등록
 *
 * 지역 내 식당/카페를 탐색합니다.
 */
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

/**
 * get_bulk_hygiene_info 도구 등록
 *
 * 여러 식당의 위생정보를 일괄 조회하고 필터링합니다.
 */
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

/**
 * 서버 시작
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Clean Plate MCP Server started');
}

main().catch(error => {
  console.error('Server error:', error);
  process.exit(1);
});
