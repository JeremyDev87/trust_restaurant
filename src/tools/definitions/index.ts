/**
 * 도구 정의 배럴 익스포트
 *
 * 모든 도구 정의를 중앙에서 관리하고 익스포트
 */

import { getRestaurantHygieneDef } from './get-restaurant-hygiene.def.js';
import { searchAreaRestaurantsDef } from './search-area-restaurants.def.js';
import { getBulkHygieneInfoDef } from './get-bulk-hygiene-info.def.js';

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

/**
 * 모든 도구 정의 배열
 *
 * ToolRegistry에 일괄 등록 시 사용
 */
export const allToolDefinitions = [
  getRestaurantHygieneDef,
  searchAreaRestaurantsDef,
  getBulkHygieneInfoDef,
] as const;
