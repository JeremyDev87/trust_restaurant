#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { queryRestaurantHygiene } from './core/index.js';
import {
  createKakaoMapService,
  createHygieneGradeService,
  createViolationService,
  createBulkHygieneService,
} from './services/index.js';
import { createApiClient } from './utils/api-client.js';

// 서비스 인스턴스 생성
const apiClient = createApiClient();
const kakaoMapService = createKakaoMapService();
const hygieneGradeService = createHygieneGradeService(apiClient);
const violationService = createViolationService(apiClient);
const bulkHygieneService = createBulkHygieneService(
  hygieneGradeService,
  violationService,
);

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
 * search_area_restaurants 도구
 *
 * 지역 내 식당/카페를 탐색합니다.
 */
server.registerTool(
  'search_area_restaurants',
  {
    title: '지역 내 식당 탐색',
    description:
      '특정 지역 내 식당과 카페를 탐색합니다. 결과가 50개를 초과하면 더 구체적인 지역을 입력하도록 안내합니다. 예: "강남구 식당", "역삼역 근처 카페", "홍대 맛집"',
    inputSchema: {
      area: z
        .string()
        .describe(
          '지역명 - 구/동/역/장소 이름 (예: 강남구, 역삼동, 역삼역, 홍대입구)',
        ),
      category: z
        .enum(['restaurant', 'cafe', 'all'])
        .optional()
        .default('all')
        .describe('카테고리 필터 (restaurant: 음식점, cafe: 카페, all: 전체)'),
    },
  },
  async ({ area, category }) => {
    const result = await kakaoMapService.searchByArea(area, category);

    if (result.status === 'not_found') {
      return {
        content: [{ type: 'text' as const, text: result.message }],
        isError: true,
      };
    }

    if (result.status === 'too_many') {
      const suggestionText = result.suggestions
        ? `\n\n추천 지역:\n${result.suggestions.map(s => `- ${s}`).join('\n')}`
        : '';

      return {
        content: [
          {
            type: 'text' as const,
            text: `${result.message}${suggestionText}`,
          },
        ],
        structuredContent: {
          status: result.status,
          total_count: result.totalCount,
          suggestions: result.suggestions,
        } as unknown as Record<string, unknown>,
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
          type: 'text' as const,
          text: `${result.message}\n\n${restaurantList}${result.totalCount > 10 ? `\n\n... 외 ${result.totalCount - 10}개` : ''}`,
        },
      ],
      structuredContent: {
        status: result.status,
        total_count: result.totalCount,
        restaurants: result.restaurants,
      } as unknown as Record<string, unknown>,
    };
  },
);

/**
 * get_bulk_hygiene_info 도구
 *
 * 여러 식당의 위생정보를 일괄 조회하고 필터링합니다.
 */
server.registerTool(
  'get_bulk_hygiene_info',
  {
    title: '식당 일괄 위생정보 조회',
    description:
      '여러 식당의 위생등급과 행정처분 이력을 일괄 조회합니다. 필터 옵션으로 깨끗한 식당(clean), 행정처분 이력이 있는 식당(with_violations), 등급 미등록 식당(no_grade)을 조회할 수 있습니다. search_area_restaurants로 검색한 결과와 함께 사용하세요.',
    inputSchema: {
      restaurants: z
        .array(
          z.object({
            name: z.string().describe('식당명'),
            address: z.string().describe('주소'),
          }),
        )
        .describe('조회할 식당 목록'),
      filter: z
        .enum(['all', 'clean', 'with_violations', 'no_grade'])
        .optional()
        .default('all')
        .describe(
          '필터 옵션 (all: 전체, clean: 깨끗한 식당, with_violations: 행정처분 이력 있음, no_grade: 등급 미등록)',
        ),
      limit: z.number().optional().default(10).describe('반환할 최대 식당 수'),
    },
  },
  async ({ restaurants, filter, limit }) => {
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
            type: 'text' as const,
            text: `조회한 ${result.totalChecked}개 식당 중 조건에 맞는 ${filterDescriptions[filter || 'all']}을 찾지 못했습니다.`,
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
          type: 'text' as const,
          text: `총 ${result.totalChecked}개 중 ${result.matchedCount}개 매칭\n\n${resultList}`,
        },
      ],
      structuredContent: {
        total_checked: result.totalChecked,
        matched_count: result.matchedCount,
        results: result.results,
      } as unknown as Record<string, unknown>,
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
