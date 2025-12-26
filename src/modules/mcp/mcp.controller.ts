/**
 * MCP 컨트롤러
 *
 * Stateless MCP JSON-RPC 핸들러
 * Vercel 서버리스 환경에서 세션 없이 동작
 */

import { Controller, Post, Get, Delete, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { queryRestaurantHygiene } from '../../core/index.js';

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
  if (name !== 'get_restaurant_hygiene') {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  const result = await queryRestaurantHygiene({
    restaurant_name: args.restaurant_name as string,
    region: args.region as string,
    include_history: (args.include_history as boolean) ?? true,
  });

  if (!result.success) {
    let errorText = result.error.message;

    if (result.error.code === 'MULTIPLE_RESULTS' && result.error.candidates) {
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
