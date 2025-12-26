/**
 * MCP 컨트롤러
 *
 * Stateless MCP JSON-RPC 핸들러
 * Vercel 서버리스 환경에서 세션 없이 동작
 */

import { Controller, Post, Get, Delete, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { queryRestaurantHygiene } from '../../core/index.js';
import {
  createKakaoMapService,
  createHygieneGradeService,
  createViolationService,
  createBulkHygieneService,
} from '../../services/index.js';
import { createApiClient } from '../../utils/api-client.js';
import type { HygieneFilter } from '../../types/area-search.types.js';

// 서비스 인스턴스 (모듈 레벨에서 재사용)
const apiClient = createApiClient();
const kakaoMapService = createKakaoMapService();
const hygieneGradeService = createHygieneGradeService(apiClient);
const violationService = createViolationService(apiClient);
const bulkHygieneService = createBulkHygieneService(
  hygieneGradeService,
  violationService,
);

/**
 * MCP 도구 정의
 */
const TOOLS = [
  {
    name: 'get_restaurant_hygiene',
    description:
      '식당, 음식점, 카페, 맛집의 위생정보, 위생등급, 위생상태, 청결도를 조회합니다. 식약처 공인 위생등급(AAA/AA/A)과 행정처분 이력을 확인할 수 있습니다. 예: "스타벅스 강남 위생등급", "맥도날드 종로 위생정보", "근처 식당 청결도"',
    inputSchema: {
      type: 'object',
      properties: {
        restaurant_name: {
          type: 'string',
          description: '식당/음식점/카페 상호명 (예: 스타벅스, 맥도날드, 본죽)',
        },
        region: {
          type: 'string',
          description: '지역명 - 시/구/동/역 이름 (예: 강남구, 역삼동, 역삼역)',
        },
        include_history: {
          type: 'boolean',
          description: '행정처분 이력 포함 여부',
          default: true,
        },
      },
      required: ['restaurant_name', 'region'],
    },
  },
  {
    name: 'search_area_restaurants',
    description:
      '특정 지역 내 식당과 카페를 탐색합니다. 결과가 50개를 초과하면 더 구체적인 지역을 입력하도록 안내합니다. 예: "강남구 식당", "역삼역 근처 카페", "홍대 맛집"',
    inputSchema: {
      type: 'object',
      properties: {
        area: {
          type: 'string',
          description:
            '지역명 - 구/동/역/장소 이름 (예: 강남구, 역삼동, 역삼역, 홍대입구)',
        },
        category: {
          type: 'string',
          enum: ['restaurant', 'cafe', 'all'],
          description:
            '카테고리 필터 (restaurant: 음식점, cafe: 카페, all: 전체)',
          default: 'all',
        },
      },
      required: ['area'],
    },
  },
  {
    name: 'get_bulk_hygiene_info',
    description:
      '여러 식당의 위생등급과 행정처분 이력을 일괄 조회합니다. 필터 옵션으로 깨끗한 식당(clean), 행정처분 이력이 있는 식당(with_violations), 등급 미등록 식당(no_grade)을 조회할 수 있습니다. search_area_restaurants로 검색한 결과와 함께 사용하세요.',
    inputSchema: {
      type: 'object',
      properties: {
        restaurants: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: '식당명' },
              address: { type: 'string', description: '주소' },
            },
            required: ['name', 'address'],
          },
          description: '조회할 식당 목록',
        },
        filter: {
          type: 'string',
          enum: ['all', 'clean', 'with_violations', 'no_grade'],
          description:
            '필터 옵션 (all: 전체, clean: 깨끗한 식당, with_violations: 행정처분 이력 있음, no_grade: 등급 미등록)',
          default: 'all',
        },
        limit: {
          type: 'number',
          description: '반환할 최대 식당 수',
          default: 10,
        },
      },
      required: ['restaurants'],
    },
  },
];

/**
 * 도구 실행
 */
async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  switch (name) {
    case 'get_restaurant_hygiene': {
      const result = await queryRestaurantHygiene({
        restaurant_name: args.restaurant_name as string,
        region: args.region as string,
        include_history: (args.include_history as boolean) ?? true,
      });

      if (!result.success) {
        let errorText = result.error.message;

        if (
          result.error.code === 'MULTIPLE_RESULTS' &&
          result.error.candidates
        ) {
          const candidateList = result.error.candidates
            .map((c, i) => {
              const info = c.grade ? `등급: ${c.grade}` : c.category || '';
              return `${i + 1}. ${c.name} - ${c.address}${info ? ` (${info})` : ''}`;
            })
            .join('\n');
          errorText = `${result.error.message}\n\n${candidateList}`;
        }

        return {
          content: [{ type: 'text', text: errorText }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `[${result.data.restaurant.name}]\n${result.summary}\n\n${JSON.stringify(result.data, null, 2)}`,
          },
        ],
      };
    }

    case 'search_area_restaurants': {
      const area = args.area as string;
      const category =
        (args.category as 'restaurant' | 'cafe' | 'all') || 'all';

      const result = await kakaoMapService.searchByArea(area, category);

      if (result.status === 'not_found') {
        return {
          content: [{ type: 'text', text: result.message }],
          isError: true,
        };
      }

      if (result.status === 'too_many') {
        const suggestionText = result.suggestions
          ? `\n\n추천 지역:\n${result.suggestions.map(s => `- ${s}`).join('\n')}`
          : '';

        return {
          content: [
            { type: 'text', text: `${result.message}${suggestionText}` },
          ],
        };
      }

      // ready 상태
      const restaurantList = result.restaurants
        .slice(0, 10)
        .map(
          (r, i) =>
            `${i + 1}. ${r.name}\n   주소: ${r.roadAddress || r.address}\n   카테고리: ${r.category}`,
        )
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `${result.message}\n\n${restaurantList}${result.totalCount > 10 ? `\n\n... 외 ${result.totalCount - 10}개` : ''}`,
          },
        ],
      };
    }

    case 'get_bulk_hygiene_info': {
      const restaurants = args.restaurants as Array<{
        name: string;
        address: string;
      }>;
      const filter = (args.filter as HygieneFilter) || 'all';
      const limit = (args.limit as number) || 10;

      // RestaurantInfo 형태로 변환
      const restaurantInfos = restaurants.map((r, i) => ({
        id: String(i),
        name: r.name,
        address: r.address,
        roadAddress: r.address,
        phone: '',
        category: '',
        longitude: '',
        latitude: '',
      }));

      const result = await bulkHygieneService.getBulkHygieneInfo(
        restaurantInfos,
        filter,
        limit,
      );

      if (result.matchedCount === 0) {
        const filterDescriptions: Record<string, string> = {
          all: '식당',
          clean: '깨끗한 식당 (AAA/AA 등급 + 행정처분 없음)',
          with_violations: '행정처분 이력이 있는 식당',
          no_grade: '위생등급 미등록 식당',
        };

        return {
          content: [
            {
              type: 'text',
              text: `조회한 ${result.totalChecked}개 식당 중 조건에 맞는 ${filterDescriptions[filter]}을 찾지 못했습니다.`,
            },
          ],
        };
      }

      // 결과 포맷팅
      const resultList = result.results
        .map((r, i) => {
          const gradeInfo = r.hygieneGrade?.hygieneGrade?.has_grade
            ? `등급: ${r.hygieneGrade.hygieneGrade.grade} (${r.hygieneGrade.hygieneGrade.grade_label})`
            : '등급: 미등록';

          const violationInfo =
            r.violations && r.violations.total_count > 0
              ? `행정처분: ${r.violations.total_count}건`
              : '행정처분: 없음';

          return `${i + 1}. ${r.restaurant.name}\n   주소: ${r.restaurant.roadAddress || r.restaurant.address}\n   ${gradeInfo}\n   ${violationInfo}\n   매칭: ${r.matchReason}`;
        })
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `총 ${result.totalChecked}개 중 ${result.matchedCount}개 매칭\n\n${resultList}`,
          },
        ],
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}

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
            serverInfo: { name: 'clean-plate-mcp', version: '1.0.0' },
          };
          break;

        case 'notifications/initialized':
          // 알림은 응답 없음
          return res.status(204).send();

        case 'tools/list':
          result = { tools: TOOLS };
          break;

        case 'tools/call':
          const toolName = (params as { name: string })?.name;
          const toolArgs =
            (params as { arguments: Record<string, unknown> })?.arguments || {};
          result = await executeTool(toolName, toolArgs);
          break;

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
      server: 'clean-plate-mcp',
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
