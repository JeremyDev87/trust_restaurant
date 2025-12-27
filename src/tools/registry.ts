/**
 * 도구 레지스트리 모듈
 *
 * MCP 도구의 등록, 조회, 관리를 담당하는 중앙 레지스트리
 * Stdio 서버와 HTTP API 모두에서 사용
 */

import type { ToolDefinition, ToolContext, JsonSchemaOutput } from './types.js';
import type { CacheService } from '../services/cache.service.js';
import type { KakaoMapService } from '../services/kakao-map.service.js';
import type { NaverPlaceService } from '../services/naver-place.service.js';
import type { HygieneGradeService } from '../services/hygiene-grade.service.js';
import type { ViolationService } from '../services/violation.service.js';
import type { BulkHygieneService } from '../services/bulk-hygiene.service.js';
import type { RestaurantIntelligenceService } from '../services/restaurant-intelligence.service.js';
import type { CompareRestaurantsService } from '../services/compare-restaurants.service.js';
import type { RecommendRestaurantsService } from '../services/recommend-restaurants.service.js';

/**
 * JSON Schema 형식의 도구 정의
 *
 * HTTP API에서 사용되는 도구 목록 형식
 */
export interface ToolJsonSchema {
  /** 도구 이름 */
  name: string;
  /** 도구 제목 */
  title: string;
  /** 도구 설명 */
  description: string;
  /** 입력 스키마 (JSON Schema 형식) */
  inputSchema: JsonSchemaOutput;
}

/**
 * 서비스 인스턴스 집합
 *
 * ToolContext 생성에 필요한 모든 서비스 의존성
 */
export interface Services {
  /** 캐시 서비스 */
  cache: CacheService;
  /** 카카오맵 API 서비스 */
  kakaoMap: KakaoMapService;
  /** 네이버 플레이스 API 서비스 */
  naverPlace: NaverPlaceService;
  /** 위생등급 조회 서비스 */
  hygieneGrade: HygieneGradeService;
  /** 행정처분 조회 서비스 */
  violation: ViolationService;
  /** 일괄 위생정보 조회 서비스 */
  bulkHygiene: BulkHygieneService;
  /** 식당 종합 정보 서비스 */
  intelligence: RestaurantIntelligenceService;
  /** 식당 비교 서비스 */
  compare: CompareRestaurantsService;
  /** 식당 추천 서비스 */
  recommend: RecommendRestaurantsService;
}

/**
 * 도구 조회 실패 에러
 *
 * 등록되지 않은 도구를 조회할 때 발생
 */
export class ToolNotFoundError extends Error {
  /** 조회하려던 도구 이름 */
  readonly toolName: string;

  constructor(toolName: string) {
    super(`도구를 찾을 수 없습니다: '${toolName}'`);
    this.name = 'ToolNotFoundError';
    this.toolName = toolName;
  }
}

/**
 * 도구 레지스트리
 *
 * MCP 도구의 등록 및 조회를 관리하는 클래스
 *
 * @example
 * ```typescript
 * const registry = new ToolRegistry();
 * registry.register(getRestaurantHygieneTool);
 *
 * const tool = registry.get('get_restaurant_hygiene');
 * const result = await tool.handler(args, context);
 * ```
 */
export class ToolRegistry {
  /** 등록된 도구 저장소 (이름 -> 도구 정의) */
  private tools: Map<string, ToolDefinition> = new Map();

  /**
   * 도구 등록
   *
   * 새로운 도구를 레지스트리에 추가
   * 동일한 이름의 도구가 이미 있으면 덮어씀
   *
   * @param tool - 등록할 도구 정의
   */
  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * 도구 조회
   *
   * 이름으로 등록된 도구를 조회
   *
   * @param name - 도구 이름
   * @returns 도구 정의
   * @throws {ToolNotFoundError} 도구가 등록되지 않은 경우
   */
  get(name: string): ToolDefinition {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ToolNotFoundError(name);
    }
    return tool;
  }

  /**
   * 도구 존재 여부 확인
   *
   * @param name - 도구 이름
   * @returns 도구가 등록되어 있으면 true
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 모든 도구 조회
   *
   * 등록된 모든 도구를 배열로 반환
   *
   * @returns 모든 도구 정의 배열
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * 모든 도구의 JSON Schema 조회
   *
   * HTTP API에서 사용할 수 있는 형식으로 모든 도구 정보 반환
   *
   * @returns JSON Schema 형식의 도구 목록
   */
  getAllJsonSchemas(): ToolJsonSchema[] {
    return this.getAll().map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.toJsonSchema(),
    }));
  }

  /**
   * 등록된 도구 개수
   *
   * @returns 도구 개수
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * 모든 도구 이름 조회
   *
   * @returns 도구 이름 배열
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

/**
 * 도구 컨텍스트 생성 팩토리
 *
 * 서비스 인스턴스들로부터 ToolContext를 생성
 *
 * @param services - 서비스 인스턴스 집합
 * @returns 도구 컨텍스트
 *
 * @example
 * ```typescript
 * const context = createToolContext({
 *   cache: cacheService,
 *   kakaoMap: kakaoMapService,
 *   naverPlace: naverPlaceService,
 *   hygieneGrade: hygieneGradeService,
 *   violation: violationService,
 *   bulkHygiene: bulkHygieneService,
 *   intelligence: intelligenceService,
 *   compare: compareService,
 *   recommend: recommendService,
 * });
 * ```
 */
export function createToolContext(services: Services): ToolContext {
  return {
    cache: services.cache,
    kakaoMap: services.kakaoMap,
    naverPlace: services.naverPlace,
    hygieneGrade: services.hygieneGrade,
    violation: services.violation,
    bulkHygiene: services.bulkHygiene,
    intelligence: services.intelligence,
    compare: services.compare,
    recommend: services.recommend,
  };
}
