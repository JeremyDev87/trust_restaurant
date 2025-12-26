import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  KakaoMapApiClient,
  KakaoApiError,
  createKakaoMapService,
} from './kakao-map.service.js';
import type { KakaoSearchResponse } from '../types/kakao-map.types.js';

describe('KakaoMapApiClient', () => {
  const originalEnv = process.env;
  let client: KakaoMapApiClient;

  beforeEach(() => {
    process.env = { ...originalEnv, KAKAO_API_KEY: 'test-api-key' };
    client = new KakaoMapApiClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  const mockKakaoResponse: KakaoSearchResponse = {
    documents: [
      {
        id: '12345',
        place_name: '스타벅스 강남역점',
        address_name: '서울 강남구 역삼동 123-45',
        road_address_name: '서울 강남구 테헤란로 123',
        phone: '02-1234-5678',
        category_name: '음식점 > 카페 > 커피전문점',
        x: '127.028046',
        y: '37.498095',
      },
    ],
    meta: {
      total_count: 1,
      pageable_count: 1,
      is_end: true,
    },
  };

  const multipleResultsResponse: KakaoSearchResponse = {
    documents: [
      {
        id: '12345',
        place_name: '스타벅스 강남역점',
        address_name: '서울 강남구 역삼동 123-45',
        road_address_name: '서울 강남구 테헤란로 123',
        phone: '02-1234-5678',
        category_name: '음식점 > 카페',
        x: '127.028046',
        y: '37.498095',
      },
      {
        id: '12346',
        place_name: '스타벅스 강남점',
        address_name: '서울 강남구 역삼동 200',
        road_address_name: '서울 강남구 강남대로 200',
        phone: '02-2345-6789',
        category_name: '음식점 > 카페',
        x: '127.027000',
        y: '37.497000',
      },
    ],
    meta: {
      total_count: 2,
      pageable_count: 2,
      is_end: true,
    },
  };

  describe('searchRestaurant', () => {
    it('should return empty array when no results found', async () => {
      const emptyResponse: KakaoSearchResponse = {
        documents: [],
        meta: { total_count: 0, pageable_count: 0, is_end: true },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(emptyResponse),
      });

      const results = await client.searchRestaurant('존재하지않는식당', '강남구');

      expect(results).toEqual([]);
    });

    it('should return single restaurant when exact match found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockKakaoResponse),
      });

      const results = await client.searchRestaurant('스타벅스', '강남역');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: '12345',
        name: '스타벅스 강남역점',
        address: '서울 강남구 역삼동 123-45',
        roadAddress: '서울 강남구 테헤란로 123',
        phone: '02-1234-5678',
        category: '음식점 > 카페 > 커피전문점',
        longitude: '127.028046',
        latitude: '37.498095',
      });
    });

    it('should return multiple restaurants when multiple matches found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(multipleResultsResponse),
      });

      const results = await client.searchRestaurant('스타벅스', '강남구');

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('스타벅스 강남역점');
      expect(results[1].name).toBe('스타벅스 강남점');
    });

    it('should search both restaurant and cafe categories', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockKakaoResponse), // FD6 (음식점)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            documents: [],
            meta: { total_count: 0, pageable_count: 0, is_end: true },
          }), // CE7 (카페)
        });

      global.fetch = fetchMock;

      await client.searchRestaurant('스타벅스', '강남');

      expect(fetchMock).toHaveBeenCalledTimes(2);

      const firstCallUrl = fetchMock.mock.calls[0][0];
      const secondCallUrl = fetchMock.mock.calls[1][0];

      expect(firstCallUrl).toContain('category_group_code=FD6');
      expect(secondCallUrl).toContain('category_group_code=CE7');
    });

    it('should deduplicate results from different categories', async () => {
      // 같은 가게가 FD6와 CE7 모두에서 나오는 경우
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockKakaoResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockKakaoResponse), // 같은 결과
        });

      const results = await client.searchRestaurant('스타벅스', '강남');

      // 중복 제거되어 1개만 반환
      expect(results).toHaveLength(1);
    });

    it('should limit results to MAX_RESULTS', async () => {
      const manyResults: KakaoSearchResponse = {
        documents: Array(10).fill(null).map((_, i) => ({
          id: `${i}`,
          place_name: `식당 ${i}`,
          address_name: '서울 강남구',
          road_address_name: '서울 강남구',
          phone: '02-0000-0000',
          category_name: '음식점',
          x: '127.0',
          y: '37.5',
        })),
        meta: { total_count: 10, pageable_count: 10, is_end: true },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(manyResults),
      });

      const results = await client.searchRestaurant('식당', '강남');

      // MAX_RESULTS (5)로 제한
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array on API failure (graceful degradation)', async () => {
      // searchByCategory catches errors and returns empty array
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const results = await client.searchRestaurant('스타벅스', '강남');

      // Graceful degradation - returns empty array instead of throwing
      expect(results).toEqual([]);
    });

    it('should return empty array on network error (graceful degradation)', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const results = await client.searchRestaurant('스타벅스', '강남');

      // Graceful degradation - returns empty array instead of throwing
      expect(results).toEqual([]);
    });

    it('should encode query parameters correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ documents: [], meta: { total_count: 0, pageable_count: 0, is_end: true } }),
      });

      await client.searchRestaurant('스타벅스 강남', '역삼동');

      const callUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      // URLSearchParams uses + for spaces
      expect(callUrl).toContain('%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4');  // 스타벅스
      expect(callUrl).toContain('%EA%B0%95%EB%82%A8');  // 강남
      expect(callUrl).toContain('%EC%97%AD%EC%82%BC%EB%8F%99');  // 역삼동
    });
  });

  describe('KakaoApiError', () => {
    it('should have correct error properties', () => {
      const error = new KakaoApiError('Test error', 'API_ERROR', 401);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('API_ERROR');
      expect(error.status).toBe(401);
      expect(error.name).toBe('KakaoApiError');
    });
  });

  describe('createKakaoMapService', () => {
    it('should create a new KakaoMapApiClient instance', () => {
      const service = createKakaoMapService();

      expect(service).toBeInstanceOf(KakaoMapApiClient);
    });
  });
});
