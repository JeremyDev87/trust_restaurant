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
      '식당, 음식점, 카페, 맛집의 위생정보, 위생등급, 위생상태, 청결도를 조회합니다. 식약처 공인 위생등급(AAA/AA/A)과 행정처분 이력을 확인할 수 있습니다. 예: "스타벅스 강남 위생등급", "맥도날드 종로 위생정보", "근처 식당 청결도"',
    inputSchema: {
      restaurant_name: z
        .string()
        .describe('식당/음식점/카페 상호명 (예: 스타벅스, 맥도날드, 본죽)'),
      region: z
        .string()
        .describe('지역명 - 시/구/동/역 이름 (예: 강남구, 역삼동, 역삼역)'),
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
          }),
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
  },
);

/**
 * 서버 시작
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Clean Plate MCP Server started');
}

main().catch(error => {
  console.error('Server error:', error);
  process.exit(1);
});
