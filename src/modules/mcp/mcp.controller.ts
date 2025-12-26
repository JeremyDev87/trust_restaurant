/**
 * MCP 컨트롤러
 *
 * MCP Streamable HTTP Transport 핸들러
 * Claude Desktop/Code에서 원격 MCP 서버로 연결하기 위한 엔드포인트
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Req,
  Res,
  Headers,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { queryRestaurantHygiene } from '../../core/index.js';

/**
 * 세션 스토리지 (메모리 기반)
 * 프로덕션에서는 Redis 등 외부 스토리지 사용 권장
 */
const sessions: Map<string, StreamableHTTPServerTransport> = new Map();

/**
 * MCP 서버 인스턴스 생성
 */
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'clean-plate-mcp',
    version: '1.0.0',
  });

  // get_restaurant_hygiene 도구 등록
  server.registerTool(
    'get_restaurant_hygiene',
    {
      title: '식당 위생 정보 조회',
      description:
        '식당, 음식점, 카페, 맛집의 위생정보, 위생등급, 위생상태, 청결도를 조회합니다. 식약처 공인 위생등급(AAA/AA/A)과 행정처분 이력을 확인할 수 있습니다. 예: "스타벅스 강남 위생등급", "맥도날드 종로 위생정보", "근처 식당 청결도"',
      inputSchema: {
        restaurant_name: z.string().describe('식당/음식점/카페 상호명 (예: 스타벅스, 맥도날드, 본죽)'),
        region: z.string().describe('지역명 - 시/구/동/역 이름 (예: 강남구, 역삼동, 역삼역)'),
        include_history: z
          .boolean()
          .optional()
          .default(true)
          .describe('행정처분 이력 포함 여부'),
      },
      outputSchema: {
        restaurant: z.object({
          name: z.string(),
          address: z.string(),
          business_type: z.string(),
        }),
        hygiene_grade: z.object({
          has_grade: z.boolean(),
          grade: z.string().nullable(),
          grade_label: z.string().nullable(),
          grade_date: z.string().nullable(),
          valid_until: z.string().nullable(),
          stars: z.number(),
        }),
        violations: z.object({
          total_count: z.number(),
          recent_items: z.array(
            z.object({
              date: z.string(),
              type: z.string(),
              content: z.string(),
              reason: z.string(),
            })
          ),
          has_more: z.boolean(),
        }),
      },
    },
    async ({ restaurant_name, region, include_history }) => {
      const result = await queryRestaurantHygiene({
        restaurant_name,
        region,
        include_history,
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
          content: [{ type: 'text' as const, text: errorText }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `[${result.data.restaurant.name}]\n${result.summary}\n\n${JSON.stringify(result.data, null, 2)}`,
          },
        ],
        structuredContent: result.data as unknown as Record<string, unknown>,
      };
    }
  );

  return server;
}

@Controller('api/mcp')
export class McpController {
  /**
   * POST /api/mcp - MCP 메시지 처리
   */
  @Post()
  async handlePost(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('mcp-session-id') sessionId?: string
  ) {
    try {
      let transport = sessionId ? sessions.get(sessionId) : undefined;

      if (!transport) {
        // 새 세션 생성
        const server = createMcpServer();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
          onsessioninitialized: (id) => {
            sessions.set(id, transport!);
          },
        });

        transport.onclose = () => {
          if (transport?.sessionId) {
            sessions.delete(transport.sessionId);
          }
        };

        await server.connect(transport);
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP POST Error:', error);
      res.status(500).json({
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
   * GET /api/mcp - SSE 스트림 연결
   */
  @Get()
  async handleGet(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('mcp-session-id') sessionId?: string
  ) {
    if (sessionId && sessions.has(sessionId)) {
      const transport = sessions.get(sessionId)!;
      await transport.handleRequest(req, res);
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Invalid or missing session ID' },
        id: null,
      });
    }
  }

  /**
   * DELETE /api/mcp - 세션 종료
   */
  @Delete()
  async handleDelete(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('mcp-session-id') sessionId?: string
  ) {
    if (sessionId && sessions.has(sessionId)) {
      const transport = sessions.get(sessionId)!;
      await transport.handleRequest(req, res);
      sessions.delete(sessionId);
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Invalid or missing session ID' },
        id: null,
      });
    }
  }
}
