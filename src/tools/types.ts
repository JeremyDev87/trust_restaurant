/**
 * 도구 모듈 타입 정의
 *
 * MCP 도구의 중앙화된 정의를 위한 인터페이스
 * Stdio 서버와 HTTP API 모두에서 사용되는 공통 타입
 */

import { z, type ZodRawShape, type ZodObject } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
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
 * 도구 컨텍스트
 *
 * 도구 핸들러에서 사용할 수 있는 모든 서비스 의존성을 포함
 */
export interface ToolContext {
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
 * 도구 응답 컨텐츠 항목
 */
export interface ToolResultContent {
  /** 컨텐츠 타입 (현재는 text만 지원) */
  type: 'text';
  /** 텍스트 내용 */
  text: string;
}

/**
 * 도구 실행 결과
 *
 * MCP 프로토콜의 도구 응답 형식과 호환
 */
export interface ToolResult {
  /** 응답 컨텐츠 배열 */
  content: ToolResultContent[];
  /** 에러 여부 */
  isError?: boolean;
  /** 구조화된 응답 데이터 (선택적) */
  structuredContent?: Record<string, unknown>;
}

/**
 * 도구 핸들러 함수 타입
 */
export type ToolHandler<TInput = unknown> = (
  args: TInput,
  ctx: ToolContext,
) => Promise<ToolResult>;

/**
 * 도구 정의
 *
 * Zod 스키마 기반으로 도구를 정의하고,
 * MCP SDK용 Zod 스키마와 HTTP API용 JSON Schema 모두 제공
 *
 * @template TInput - 도구 입력 타입
 */
export interface ToolDefinition<TInput = unknown> {
  /** 도구 이름 (예: get_restaurant_hygiene) */
  name: string;
  /** 도구 제목 (사용자에게 표시되는 짧은 이름) */
  title: string;
  /** 도구 설명 (사용 방법 및 예시 포함) */
  description: string;
  /** 입력 스키마 (Zod RawShape 형태) */
  inputSchema: ZodRawShape;
  /** 도구 핸들러 함수 */
  handler: ToolHandler<TInput>;
  /**
   * JSON Schema 변환
   *
   * HTTP API에서 사용할 수 있는 JSON Schema 형식으로 변환
   * @returns JSON Schema 객체
   */
  toJsonSchema(): JsonSchemaOutput;
}

/**
 * JSON Schema 출력 형식
 */
export interface JsonSchemaOutput {
  /** 스키마 타입 (항상 'object') */
  type: 'object';
  /** 프로퍼티 정의 */
  properties: Record<string, unknown>;
  /** 필수 프로퍼티 목록 */
  required: string[];
}

/**
 * 도구 정의 생성 헬퍼
 *
 * Zod 스키마로부터 ToolDefinition을 생성하는 팩토리 함수
 *
 * @template T - Zod 스키마 타입
 * @param config - 도구 설정
 * @returns 도구 정의 객체
 */
export function createToolDefinition<T extends ZodRawShape>(config: {
  name: string;
  title: string;
  description: string;
  inputSchema: T;
  handler: ToolHandler<z.infer<ZodObject<T>>>;
}): ToolDefinition<z.infer<ZodObject<T>>> {
  return {
    name: config.name,
    title: config.title,
    description: config.description,
    inputSchema: config.inputSchema,
    handler: config.handler,
    toJsonSchema(): JsonSchemaOutput {
      const zodSchema = z.object(config.inputSchema);
      const jsonSchema = zodToJsonSchema(zodSchema, {
        $refStrategy: 'none',
        target: 'openApi3',
      });

      // JSON Schema의 definitions 등을 제거하고 핵심만 반환
      const { properties = {}, required = [] } = jsonSchema as {
        properties?: Record<string, unknown>;
        required?: string[];
      };

      return {
        type: 'object',
        properties,
        required,
      };
    },
  };
}

// z 객체를 재수출하여 도구 정의 시 사용 가능하도록 함
export { z };
