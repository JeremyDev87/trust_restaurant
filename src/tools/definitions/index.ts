/**
 * 도구 정의 배럴 익스포트
 *
 * 모든 도구 정의를 중앙에서 관리하고 익스포트
 */

import { getRestaurantHygieneDef } from './get-restaurant-hygiene.def.js';
import { searchAreaRestaurantsDef } from './search-area-restaurants.def.js';
import { getBulkHygieneInfoDef } from './get-bulk-hygiene-info.def.js';
import { compareRestaurantsDef } from './compare-restaurants.def.js';
import { recommendRestaurantsDef } from './recommend-restaurants.def.js';
import { getRestaurantIntelligenceDef } from './get-restaurant-intelligence.def.js';
import { searchAreaEnhancedDef } from './search-area-enhanced.def.js';

// 개별 도구 정의 익스포트
export {
  getRestaurantHygieneDef,
  type GetRestaurantHygieneInput,
} from './get-restaurant-hygiene.def.js';

export {
  searchAreaRestaurantsDef,
  type SearchAreaRestaurantsInput,
} from './search-area-restaurants.def.js';

export {
  getBulkHygieneInfoDef,
  type GetBulkHygieneInfoInput,
  type RestaurantInfo,
} from './get-bulk-hygiene-info.def.js';

export {
  compareRestaurantsDef,
  type CompareRestaurantsToolInput,
} from './compare-restaurants.def.js';

export {
  recommendRestaurantsDef,
  type RecommendRestaurantsToolInput,
} from './recommend-restaurants.def.js';

export {
  getRestaurantIntelligenceDef,
  type GetRestaurantIntelligenceInput,
} from './get-restaurant-intelligence.def.js';

export {
  searchAreaEnhancedDef,
  type SearchAreaEnhancedInput,
} from './search-area-enhanced.def.js';

/**
 * 모든 도구 정의 배열
 *
 * ToolRegistry에 일괄 등록 시 사용
 */
export const allToolDefinitions = [
  getRestaurantHygieneDef,
  searchAreaRestaurantsDef,
  getBulkHygieneInfoDef,
  compareRestaurantsDef,
  recommendRestaurantsDef,
  getRestaurantIntelligenceDef,
  searchAreaEnhancedDef,
] as const;
