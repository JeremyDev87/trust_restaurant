#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { queryRestaurantHygiene } from './core/index.js';

/**
 * Clean Plate MCP Server
 *
 * 식약처 공인 데이터 기반 식당 위생 정보 조회 서비스
 */
const server = new McpServer({
  name: 'clean-plate-mcp',
  version: '1.0.0',
});

/**
 * get_restaurant_hygiene 도구
 *
 * 식당의 위생등급과 행정처분 이력을 조회합니다.
 */
server.registerTool(
  'get_restaurant_hygiene',
  {
    title: '식당 위생 정보 조회',
    description:
      '식당명과 지역을 기반으로 식약처 공인 위생 등급 및 행정처분 기록을 조회합니다.',
    inputSchema: {
      restaurant_name: z.string().describe('식당 상호명'),
      region: z.string().describe('지역명 (시/구/동)'),
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
      // 에러 응답
      let errorText = result.error.message;

      // 복수 결과인 경우 후보 목록 추가
      if (result.error.code === 'MULTIPLE_RESULTS' && result.error.candidates) {
        const candidateList = result.error.candidates
          .map((c, i) => `${i + 1}. ${c.name} - ${c.address} (${c.grade})`)
          .join('\n');
        errorText = `${result.error.message}\n\n${candidateList}`;
      }

      return {
        content: [{ type: 'text' as const, text: errorText }],
        isError: true,
      };
    }

    // 성공 응답
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

/**
 * 서버 시작
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Clean Plate MCP Server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
