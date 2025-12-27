/**
 * 도구 모듈 익스포트
 *
 * MCP 도구 정의 및 관련 타입을 중앙에서 관리
 */

export {
  type ToolContext,
  type ToolResult,
  type ToolResultContent,
  type ToolHandler,
  type ToolDefinition,
  type JsonSchemaOutput,
  createToolDefinition,
  z,
} from './types.js';

export {
  ToolRegistry,
  ToolNotFoundError,
  createToolContext,
  type ToolJsonSchema,
  type Services,
} from './registry.js';

// 도구 정의 익스포트
export {
  // 기존 도구
  getRestaurantHygieneDef,
  searchAreaRestaurantsDef,
  getBulkHygieneInfoDef,
  // 새 도구 (Phase 5)
  compareRestaurantsDef,
  recommendRestaurantsDef,
  getRestaurantIntelligenceDef,
  searchAreaEnhancedDef,
  // 전체 도구 배열
  allToolDefinitions,
  // 타입
  type GetRestaurantHygieneInput,
  type SearchAreaRestaurantsInput,
  type GetBulkHygieneInfoInput,
  type RestaurantInfo,
  type CompareRestaurantsToolInput,
  type RecommendRestaurantsToolInput,
  type GetRestaurantIntelligenceInput,
  type SearchAreaEnhancedInput,
} from './definitions/index.js';

// 도구 핸들러 익스포트
export {
  // 기존 핸들러
  handleGetRestaurantHygiene,
  handleSearchAreaRestaurants,
  handleGetBulkHygieneInfo,
  // 새 핸들러 (Phase 5)
  handleCompareRestaurants,
  handleRecommendRestaurants,
  handleGetRestaurantIntelligence,
  handleSearchAreaEnhanced,
} from './handlers/index.js';
