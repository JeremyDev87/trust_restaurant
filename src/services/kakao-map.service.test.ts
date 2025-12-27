import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  KakaoMapApiClient,
  KakaoApiError,
  createKakaoMapService,
} from './kakao-map.service.js';
import type { KakaoSearchResponse } from '../types/kakao-map.types.js';
import type { CacheService } from './cache.service.js';

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
        category_group_code: 'CE7',
        category_group_name: '카페',
        place_url: 'https://place.map.kakao.com/12345',
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
        category_group_code: 'CE7',
        category_group_name: '카페',
        place_url: 'https://place.map.kakao.com/12345',
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
        category_group_code: 'CE7',
        category_group_name: '카페',
        place_url: 'https://place.map.kakao.com/12346',
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

      const results = await client.searchRestaurant(
        '존재하지않는식당',
        '강남구',
      );

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
        placeUrl: 'https://place.map.kakao.com/12345',
        rating: undefined,
        businessHours: undefined,
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
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockKakaoResponse), // FD6 (음식점)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
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
      global.fetch = vi
        .fn()
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
        documents: Array(10)
          .fill(null)
          .map((_, i) => ({
            id: `${i}`,
            place_name: `식당 ${i}`,
            address_name: '서울 강남구',
            road_address_name: '서울 강남구',
            phone: '02-0000-0000',
            category_name: '음식점',
            category_group_code: 'FD6',
            category_group_name: '음식점',
            x: '127.0',
            y: '37.5',
            place_url: `https://place.map.kakao.com/${i}`,
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
        json: () =>
          Promise.resolve({
            documents: [],
            meta: { total_count: 0, pageable_count: 0, is_end: true },
          }),
      });

      await client.searchRestaurant('스타벅스 강남', '역삼동');

      const callUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      // URLSearchParams uses + for spaces
      expect(callUrl).toContain('%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4'); // 스타벅스
      expect(callUrl).toContain('%EA%B0%95%EB%82%A8'); // 강남
      expect(callUrl).toContain('%EC%97%AD%EC%82%BC%EB%8F%99'); // 역삼동
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

    it('should create service with custom API key', () => {
      const service = createKakaoMapService('custom-api-key');

      expect(service).toBeInstanceOf(KakaoMapApiClient);
      expect(service.isAvailable()).toBe(true);
    });

    it('should create service with cache', () => {
      const mockCache: CacheService = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        isEnabled: vi.fn().mockReturnValue(true),
      };

      const service = createKakaoMapService('api-key', mockCache);

      expect(service).toBeInstanceOf(KakaoMapApiClient);
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is set', () => {
      expect(client.isAvailable()).toBe(true);
    });

    it('should return false when API key is not set', () => {
      delete process.env.KAKAO_API_KEY;
      const clientWithoutKey = new KakaoMapApiClient();

      expect(clientWithoutKey.isAvailable()).toBe(false);
    });
  });

  describe('searchByArea', () => {
    const createMockResponse = (
      count: number,
      isEnd: boolean = true,
    ): KakaoSearchResponse => ({
      documents: Array(Math.min(count, 15))
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          place_name: `식당 ${i}`,
          address_name: '서울 강남구 역삼동',
          road_address_name: '서울 강남구 테헤란로',
          phone: '02-0000-0000',
          category_name: '음식점',
          category_group_code: 'FD6',
          category_group_name: '음식점',
          x: '127.0',
          y: '37.5',
          place_url: `https://place.map.kakao.com/${i}`,
        })),
      meta: {
        total_count: count,
        pageable_count: Math.min(count, 45),
        is_end: isEnd,
      },
    });

    describe('API 미설정', () => {
      it('API 키가 없으면 not_found 상태를 반환한다', async () => {
        delete process.env.KAKAO_API_KEY;
        const clientWithoutKey = new KakaoMapApiClient();

        const result = await clientWithoutKey.searchByArea('강남구');

        expect(result.status).toBe('not_found');
        expect(result.message).toContain('Kakao API가 설정되지 않았습니다');
        expect(result.restaurants).toEqual([]);
      });
    });

    describe('status: ready', () => {
      it('적절한 결과 수일 때 ready 상태를 반환한다', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(createMockResponse(10, true)),
        });

        const result = await client.searchByArea('역삼역');

        expect(result.status).toBe('ready');
        expect(result.totalCount).toBeGreaterThan(0);
        expect(result.restaurants.length).toBeGreaterThan(0);
        expect(result.message).toContain('역삼역');
        expect(result.message).toContain('찾았습니다');
      });

      it('restaurants 배열에 RestaurantInfo 형식이 포함된다', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(createMockResponse(5, true)),
        });

        const result = await client.searchByArea('강남역');

        expect(result.restaurants[0]).toHaveProperty('id');
        expect(result.restaurants[0]).toHaveProperty('name');
        expect(result.restaurants[0]).toHaveProperty('address');
        expect(result.restaurants[0]).toHaveProperty('roadAddress');
        expect(result.restaurants[0]).toHaveProperty('phone');
        expect(result.restaurants[0]).toHaveProperty('category');
        expect(result.restaurants[0]).toHaveProperty('longitude');
        expect(result.restaurants[0]).toHaveProperty('latitude');
        // 새로 추가된 필드들
        expect(result.restaurants[0]).toHaveProperty('placeUrl');
        expect(result.restaurants[0]).toHaveProperty('rating');
        expect(result.restaurants[0]).toHaveProperty('businessHours');
      });
    });

    describe('status: not_found', () => {
      it('결과가 없으면 not_found 상태를 반환한다', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(createMockResponse(0, true)),
        });

        const result = await client.searchByArea('존재하지않는지역');

        expect(result.status).toBe('not_found');
        expect(result.totalCount).toBe(0);
        expect(result.restaurants).toEqual([]);
        expect(result.message).toContain('찾을 수 없습니다');
      });
    });

    describe('status: too_many', () => {
      it('50개 초과 시 too_many 상태를 반환한다', async () => {
        // 음식점 40개 + 카페 20개 = 60개 (> 50)
        global.fetch = vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(createMockResponse(40, false)),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(createMockResponse(15, false)),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(createMockResponse(15, true)),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(createMockResponse(20, true)),
          });

        const result = await client.searchByArea('강남구');

        expect(result.status).toBe('too_many');
        expect(result.totalCount).toBeGreaterThan(50);
        expect(result.restaurants).toEqual([]);
        expect(result.suggestions).toBeDefined();
        expect(result.message).toContain('더 구체적인 지역');
      });

      it('suggestions에 세분화된 지역 제안이 포함된다', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(createMockResponse(60, false)),
        });

        const result = await client.searchByArea('강남구');

        expect(result.suggestions).toContain('역삼역');
        expect(result.suggestions).toContain('강남역');
      });
    });

    describe('카테고리 필터', () => {
      it("category='restaurant'일 때 음식점만 검색한다", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(createMockResponse(10, true)),
        });
        global.fetch = fetchMock;

        await client.searchByArea('강남역', 'restaurant');

        // FD6 카테고리만 호출
        const calls = fetchMock.mock.calls;
        expect(calls.some(c => c[0].includes('FD6'))).toBe(true);
        expect(calls.every(c => !c[0].includes('CE7'))).toBe(true);
      });

      it("category='cafe'일 때 카페만 검색한다", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(createMockResponse(10, true)),
        });
        global.fetch = fetchMock;

        await client.searchByArea('강남역', 'cafe');

        // CE7 카테고리만 호출
        const calls = fetchMock.mock.calls;
        expect(calls.some(c => c[0].includes('CE7'))).toBe(true);
        expect(calls.every(c => !c[0].includes('FD6'))).toBe(true);
      });

      it("category='all'일 때 음식점과 카페 모두 검색한다", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(createMockResponse(5, true)),
        });
        global.fetch = fetchMock;

        await client.searchByArea('강남역', 'all');

        const calls = fetchMock.mock.calls;
        expect(calls.some(c => c[0].includes('FD6'))).toBe(true);
        expect(calls.some(c => c[0].includes('CE7'))).toBe(true);
      });

      it('기본 category는 all이다', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(createMockResponse(5, true)),
        });
        global.fetch = fetchMock;

        await client.searchByArea('강남역');

        const calls = fetchMock.mock.calls;
        expect(calls.some(c => c[0].includes('FD6'))).toBe(true);
        expect(calls.some(c => c[0].includes('CE7'))).toBe(true);
      });
    });

    describe('페이지네이션', () => {
      it('50개 이하일 때 추가 페이지를 조회한다', async () => {
        const fetchMock = vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                documents: Array(15)
                  .fill(null)
                  .map((_, i) => ({
                    id: `fd6-${i}`,
                    place_name: `음식점 ${i}`,
                    address_name: '서울 강남구',
                    road_address_name: '서울 강남구',
                    phone: '02-0000-0000',
                    category_name: '음식점',
                    category_group_code: 'FD6',
                    category_group_name: '음식점',
                    x: '127.0',
                    y: '37.5',
                    place_url: `https://place.map.kakao.com/fd6-${i}`,
                  })),
                meta: { total_count: 30, pageable_count: 30, is_end: false },
              }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                documents: Array(15)
                  .fill(null)
                  .map((_, i) => ({
                    id: `fd6-page2-${i}`,
                    place_name: `음식점 페이지2 ${i}`,
                    address_name: '서울 강남구',
                    road_address_name: '서울 강남구',
                    phone: '02-0000-0000',
                    category_name: '음식점',
                    category_group_code: 'FD6',
                    category_group_name: '음식점',
                    x: '127.0',
                    y: '37.5',
                    place_url: `https://place.map.kakao.com/fd6-page2-${i}`,
                  })),
                meta: { total_count: 30, pageable_count: 30, is_end: true },
              }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                documents: [],
                meta: { total_count: 0, pageable_count: 0, is_end: true },
              }),
          })
          .mockResolvedValue({
            ok: true,
            json: () =>
              Promise.resolve({
                documents: [],
                meta: { total_count: 0, pageable_count: 0, is_end: true },
              }),
          });

        global.fetch = fetchMock;

        const result = await client.searchByArea('역삼역', 'restaurant');

        expect(result.status).toBe('ready');
        // 페이지 1, 2, 3 호출 확인 (page=2, page=3)
        expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
      });

      it('첫 페이지가 is_end=true이면 추가 페이지를 조회하지 않는다', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              documents: Array(10)
                .fill(null)
                .map((_, i) => ({
                  id: `${i}`,
                  place_name: `식당 ${i}`,
                  address_name: '서울 강남구',
                  road_address_name: '서울 강남구',
                  phone: '02-0000-0000',
                  category_name: '음식점',
                  category_group_code: 'FD6',
                  category_group_name: '음식점',
                  x: '127.0',
                  y: '37.5',
                  place_url: `https://place.map.kakao.com/${i}`,
                })),
              meta: { total_count: 10, pageable_count: 10, is_end: true },
            }),
        });

        global.fetch = fetchMock;

        await client.searchByArea('역삼역', 'restaurant');

        // restaurant만 검색하므로 1번 호출 (is_end=true라 추가 페이지 없음)
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('에러 핸들링', () => {
      it('API 에러 시 빈 결과를 반환한다', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
        });

        const result = await client.searchByArea('강남역');

        expect(result.status).toBe('not_found');
        expect(result.totalCount).toBe(0);
      });

      it('네트워크 에러 시 빈 결과를 반환한다', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        const result = await client.searchByArea('강남역');

        expect(result.status).toBe('not_found');
        expect(result.totalCount).toBe(0);
      });
    });

    describe('캐시 동작', () => {
      it('캐시에 결과가 있으면 API를 호출하지 않는다', async () => {
        const mockCache: CacheService = {
          get: vi.fn().mockResolvedValue({
            status: 'ready',
            totalCount: 5,
            restaurants: [],
            message: '캐시된 결과',
          }),
          set: vi.fn(),
          delete: vi.fn(),
          isEnabled: vi.fn().mockReturnValue(true),
        };

        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        const cachedClient = new KakaoMapApiClient('test-key', mockCache);
        const result = await cachedClient.searchByArea('강남역');

        expect(mockCache.get).toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(result.message).toBe('캐시된 결과');
      });

      it('캐시 미스 시 결과를 캐시에 저장한다', async () => {
        const mockCache: CacheService = {
          get: vi.fn().mockResolvedValue(null),
          set: vi.fn(),
          delete: vi.fn(),
          isEnabled: vi.fn().mockReturnValue(true),
        };

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(createMockResponse(5, true)),
        });

        const cachedClient = new KakaoMapApiClient('test-key', mockCache);
        await cachedClient.searchByArea('강남역');

        expect(mockCache.set).toHaveBeenCalled();
      });

      it('not_found 결과도 캐시에 저장한다', async () => {
        const mockCache: CacheService = {
          get: vi.fn().mockResolvedValue(null),
          set: vi.fn(),
          delete: vi.fn(),
          isEnabled: vi.fn().mockReturnValue(true),
        };

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(createMockResponse(0, true)),
        });

        const cachedClient = new KakaoMapApiClient('test-key', mockCache);
        const result = await cachedClient.searchByArea('없는지역');

        expect(result.status).toBe('not_found');
        expect(mockCache.set).toHaveBeenCalled();
      });

      it('too_many 결과도 캐시에 저장한다', async () => {
        const mockCache: CacheService = {
          get: vi.fn().mockResolvedValue(null),
          set: vi.fn(),
          delete: vi.fn(),
          isEnabled: vi.fn().mockReturnValue(true),
        };

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(createMockResponse(60, false)),
        });

        const cachedClient = new KakaoMapApiClient('test-key', mockCache);
        const result = await cachedClient.searchByArea('강남구');

        expect(result.status).toBe('too_many');
        expect(mockCache.set).toHaveBeenCalled();
      });
    });
  });

  describe('generateAreaSuggestions (via searchByArea too_many)', () => {
    const createTooManyResponse = (): KakaoSearchResponse => ({
      documents: Array(15)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          place_name: `식당 ${i}`,
          address_name: '서울 강남구',
          road_address_name: '서울 강남구',
          phone: '02-0000-0000',
          category_name: '음식점',
          category_group_code: 'FD6',
          category_group_name: '음식점',
          x: '127.0',
          y: '37.5',
          place_url: `https://place.map.kakao.com/${i}`,
        })),
      meta: { total_count: 100, pageable_count: 45, is_end: false },
    });

    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createTooManyResponse()),
      });
    });

    it('강남구에 대한 suggestions를 반환한다', async () => {
      const result = await client.searchByArea('강남구');

      expect(result.suggestions).toContain('역삼역');
      expect(result.suggestions).toContain('강남역');
      expect(result.suggestions).toContain('삼성역');
    });

    it('서초구에 대한 suggestions를 반환한다', async () => {
      const result = await client.searchByArea('서초구');

      expect(result.suggestions).toContain('서초역');
      expect(result.suggestions).toContain('교대역');
    });

    it('마포구에 대한 suggestions를 반환한다', async () => {
      const result = await client.searchByArea('마포구');

      expect(result.suggestions).toContain('홍대입구역');
      expect(result.suggestions).toContain('합정역');
    });

    it('송파구에 대한 suggestions를 반환한다', async () => {
      const result = await client.searchByArea('송파구');

      expect(result.suggestions).toContain('잠실역');
      expect(result.suggestions).toContain('석촌역');
    });

    it('종로구에 대한 suggestions를 반환한다', async () => {
      const result = await client.searchByArea('종로구');

      expect(result.suggestions).toContain('광화문역');
      expect(result.suggestions).toContain('종각역');
    });

    it('성동구에 대한 suggestions를 반환한다', async () => {
      const result = await client.searchByArea('성동구');

      expect(result.suggestions).toContain('성수역');
      expect(result.suggestions).toContain('왕십리역');
    });

    it('알 수 없는 지역은 기본 suggestions를 반환한다', async () => {
      const result = await client.searchByArea('미지의지역');

      expect(result.suggestions).toContain('미지의지역 역 근처');
      expect(result.suggestions).toContain('미지의지역 중심가');
      expect(result.suggestions).toContain('미지의지역 동쪽');
      expect(result.suggestions).toContain('미지의지역 서쪽');
    });

    it('구 이름이 포함된 지역명에서 구를 인식한다', async () => {
      const result = await client.searchByArea('서울 강남구 역삼동');

      expect(result.suggestions).toContain('역삼역');
      expect(result.suggestions).toContain('강남역');
    });
  });

  describe('중복 제거', () => {
    it('searchByArea에서 같은 ID의 식당은 중복 제거된다', async () => {
      // 음식점과 카페 검색 결과에 같은 ID가 있는 경우
      const sameIdResponse: KakaoSearchResponse = {
        documents: [
          {
            id: 'same-id-1',
            place_name: '스타벅스 강남역점',
            address_name: '서울 강남구',
            road_address_name: '서울 강남구',
            phone: '02-0000-0000',
            category_name: '카페',
            category_group_code: 'CE7',
            category_group_name: '카페',
            x: '127.0',
            y: '37.5',
            place_url: 'https://place.map.kakao.com/same-id-1',
          },
        ],
        meta: { total_count: 1, pageable_count: 1, is_end: true },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sameIdResponse),
      });

      const result = await client.searchByArea('강남역', 'all');

      // 중복 제거되어 1개만 반환
      expect(result.restaurants).toHaveLength(1);
    });
  });
});
