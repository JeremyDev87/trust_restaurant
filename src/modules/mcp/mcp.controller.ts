/**
 * MCP 컨트롤러
 *
 * Stateless MCP JSON-RPC 핸들러
 * Vercel 서버리스 환경에서 세션 없이 동작
 */

import { Controller, Post, Get, Delete, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
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
} from '../../services/index.js';
import { createApiClient } from '../../utils/api-client.js';
import {
  ToolRegistry,
  ToolNotFoundError,
  createToolContext,
  getRestaurantHygieneDef,
  searchAreaRestaurantsDef,
  getBulkHygieneInfoDef,
  handleGetRestaurantHygiene,
  handleSearchAreaRestaurants,
  handleGetBulkHygieneInfo,
  type ToolHandler,
} from '../../tools/index.js';

// 서비스 인스턴스 (모듈 레벨에서 재사용, 캐시 포함)
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

// 도구 레지스트리 생성 및 등록
const registry = new ToolRegistry();
registry.register({
  ...getRestaurantHygieneDef,
  handler: handleGetRestaurantHygiene as ToolHandler,
});
registry.register({
  ...searchAreaRestaurantsDef,
  handler: handleSearchAreaRestaurants as ToolHandler,
});
registry.register({
  ...getBulkHygieneInfoDef,
  handler: handleGetBulkHygieneInfo as ToolHandler,
});

@Controller('api/mcp')
export class McpController {
  /**
   * POST /api/mcp - Stateless MCP JSON-RPC 핸들러
   */
  @Post()
  async handlePost(@Req() req: Request, @Res() res: Response) {
    try {
      const body = req.body as {
        jsonrpc: string;
        id: number | string | null;
        method: string;
        params?: Record<string, unknown>;
      };

      const { jsonrpc, id, method, params } = body;

      // JSON-RPC 2.0 검증
      if (jsonrpc !== '2.0') {
        return res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request: jsonrpc must be 2.0',
          },
          id: null,
        });
      }

      let result: unknown;

      switch (method) {
        case 'initialize':
          result = {
            protocolVersion: params?.protocolVersion || '2024-11-05',
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: 'trust-restaurant', version: '1.0.0' },
          };
          break;

        case 'notifications/initialized':
          // 알림은 응답 없음
          return res.status(204).send();

        case 'tools/list':
          result = { tools: registry.getAllJsonSchemas() };
          break;

        case 'tools/call': {
          const toolName = (params as { name: string })?.name;
          const toolArgs =
            (params as { arguments: Record<string, unknown> })?.arguments || {};

          try {
            const tool = registry.get(toolName);
            result = await tool.handler(toolArgs, toolContext);
          } catch (error) {
            if (error instanceof ToolNotFoundError) {
              result = {
                content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
                isError: true,
              };
            } else {
              throw error;
            }
          }
          break;
        }

        case 'ping':
          result = {};
          break;

        default:
          return res.json({
            jsonrpc: '2.0',
            error: { code: -32601, message: `Method not found: ${method}` },
            id,
          });
      }

      return res.json({ jsonrpc: '2.0', id, result });
    } catch (error) {
      console.error('MCP Error:', error);
      return res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
        id: null,
      });
    }
  }

  /**
   * GET /api/mcp - 상태 확인
   */
  @Get()
  handleGet(@Res() res: Response) {
    return res.json({
      status: 'ok',
      server: 'trust-restaurant',
      version: '1.0.0',
    });
  }

  /**
   * DELETE /api/mcp - 세션 종료 (Stateless이므로 항상 성공)
   */
  @Delete()
  handleDelete(@Res() res: Response) {
    return res.status(204).send();
  }
}
