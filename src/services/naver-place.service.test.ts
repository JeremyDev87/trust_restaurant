import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NaverPlaceApiClient,
  NaverApiError,
  createNaverPlaceService,
} from './naver-place.service.js';
import type { NaverLocalSearchResponse } from '../types/naver-place.types.js';
import type { CacheService } from './cache.service.js';

describe('NaverPlaceApiClient', () => {
  const originalEnv = process.env;
  let client: NaverPlaceApiClient;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NAVER_CLIENT_ID: 'test-client-id',
      NAVER_CLIENT_SECRET: 'test-client-secret',
    };
    client = new NaverPlaceApiClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  const mockNaverResponse: NaverLocalSearchResponse = {
    lastBuildDate: '2024-01-15T12:00:00+09:00',
    total: 1,
    start: 1,
    display: 5,
    items: [
      {
        title: '<b>스타벅스</b> 강남역점',
        link: 'https://map.naver.com/v5/search/place/123456789',
        category: '카페,커피전문점',
        description: '스타벅스 커피',
        telephone: '02-1234-5678',
        address: '서울 강남구 역삼동 123-45',
        roadAddress: '서울 강남구 테헤란로 123',
        mapx: '127028046',
        mapy: '37498095',
      },
    ],
  };

  const multipleResultsResponse: NaverLocalSearchResponse = {
    lastBuildDate: '2024-01-15T12:00:00+09:00',
    total: 2,
    start: 1,
    display: 5,
    items: [
      {
        title: '<b>스타벅스</b> 강남역점',
        link: 'https://map.naver.com/v5/search/place/123456789',
        category: '카페,커피전문점',
        description: '스타벅스 커피',
        telephone: '02-1234-5678',
        address: '서울 강남구 역삼동 123-45',
        roadAddress: '서울 강남구 테헤란로 123',
        mapx: '127028046',
        mapy: '37498095',
      },
      {
        title: '<b>스타벅스</b> 강남점',
        link: 'https://map.naver.com/v5/search/place/987654321',
        category: '카페,커피전문점',
        description: '스타벅스 리저브',
        telephone: '02-2345-6789',
        address: '서울 강남구 역삼동 200',
        roadAddress: '서울 강남구 강남대로 200',
        mapx: '127027000',
        mapy: '37497000',
      },
    ],
  };

  describe('searchPlace', () => {
    it('should return null when no results found', async () => {
      const emptyResponse: NaverLocalSearchResponse = {
        lastBuildDate: '2024-01-15T12:00:00+09:00',
        total: 0,
        start: 1,
        display: 5,
        items: [],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(emptyResponse),
      });

      const result = await client.searchPlace('존재하지않는식당', '강남구');

      expect(result).toBeNull();
    });

    it('should return place info when exact match found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockNaverResponse),
      });

      const result = await client.searchPlace('스타벅스 강남역점', '강남구');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('스타벅스 강남역점');
      expect(result!.address).toBe('서울 강남구 테헤란로 123');
      expect(result!.category).toBe('카페,커피전문점');
      expect(result!.id).toBe('123456789');
    });

    it('should strip HTML tags from title', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockNaverResponse),
      });

      const result = await client.searchPlace('스타벅스', '강남구');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('스타벅스 강남역점');
      expect(result!.name).not.toContain('<b>');
      expect(result!.name).not.toContain('</b>');
    });

    it('should select best match from multiple results', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(multipleResultsResponse),
      });

      const result = await client.searchPlace('스타벅스 강남역점', '테헤란로');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('스타벅스 강남역점');
    });

    it('should use correct API headers', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockNaverResponse),
      });

      global.fetch = fetchMock;

      await client.searchPlace('스타벅스', '강남');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1].headers['X-Naver-Client-Id']).toBe('test-client-id');
      expect(callArgs[1].headers['X-Naver-Client-Secret']).toBe(
        'test-client-secret',
      );
    });

    it('should encode query parameters correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockNaverResponse),
      });

      await client.searchPlace('스타벅스 강남', '역삼동');

      const callUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(callUrl).toContain('%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4'); // 스타벅스
    });

    it('should return null on API failure (graceful degradation)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const result = await client.searchPlace('스타벅스', '강남');

      expect(result).toBeNull();
    });

    it('should return null on network error (graceful degradation)', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await client.searchPlace('스타벅스', '강남');

      expect(result).toBeNull();
    });

    it('should return null when API is not available', async () => {
      delete process.env.NAVER_CLIENT_ID;
      const clientWithoutKey = new NaverPlaceApiClient();

      const result = await clientWithoutKey.searchPlace('스타벅스', '강남');

      expect(result).toBeNull();
    });
  });

  describe('NaverApiError', () => {
    it('should have correct error properties', () => {
      const error = new NaverApiError('Test error', 'API_ERROR', 401);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('API_ERROR');
      expect(error.status).toBe(401);
      expect(error.name).toBe('NaverApiError');
    });
  });

  describe('createNaverPlaceService', () => {
    it('should create a new NaverPlaceApiClient instance', () => {
      const service = createNaverPlaceService();

      expect(service).toBeInstanceOf(NaverPlaceApiClient);
    });

    it('should create service with custom credentials', () => {
      const service = createNaverPlaceService('custom-id', 'custom-secret');

      expect(service).toBeInstanceOf(NaverPlaceApiClient);
      expect(service.isAvailable()).toBe(true);
    });

    it('should create service with cache', () => {
      const mockCache: CacheService = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        isEnabled: vi.fn().mockReturnValue(true),
      };

      const service = createNaverPlaceService('id', 'secret', mockCache);

      expect(service).toBeInstanceOf(NaverPlaceApiClient);
    });
  });

  describe('isAvailable', () => {
    it('should return true when both credentials are set', () => {
      expect(client.isAvailable()).toBe(true);
    });

    it('should return false when client ID is not set', () => {
      delete process.env.NAVER_CLIENT_ID;
      const clientWithoutId = new NaverPlaceApiClient();

      expect(clientWithoutId.isAvailable()).toBe(false);
    });

    it('should return false when client secret is not set', () => {
      delete process.env.NAVER_CLIENT_SECRET;
      const clientWithoutSecret = new NaverPlaceApiClient();

      expect(clientWithoutSecret.isAvailable()).toBe(false);
    });
  });

  describe('priceRange estimation', () => {
    it('should estimate high price for fine dining', async () => {
      const response: NaverLocalSearchResponse = {
        lastBuildDate: '2024-01-15T12:00:00+09:00',
        total: 1,
        start: 1,
        display: 5,
        items: [
          {
            title: '레스토랑 오마카세',
            link: 'https://map.naver.com/v5/search/place/111111111',
            category: '음식점,오마카세',
            description: '고급 오마카세 코스',
            telephone: '02-1234-5678',
            address: '서울 강남구 청담동',
            roadAddress: '서울 강남구 도산대로 123',
            mapx: '127000000',
            mapy: '37000000',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(response),
      });

      const result = await client.searchPlace('오마카세', '청담동');

      expect(result).not.toBeNull();
      expect(result!.priceRange).toBe('high');
    });

    it('should estimate low price for fast food', async () => {
      const response: NaverLocalSearchResponse = {
        lastBuildDate: '2024-01-15T12:00:00+09:00',
        total: 1,
        start: 1,
        display: 5,
        items: [
          {
            title: '엄마손김밥',
            link: 'https://map.naver.com/v5/search/place/222222222',
            category: '음식점,분식,김밥',
            description: '맛있는 김밥',
            telephone: '02-1234-5678',
            address: '서울 강남구 역삼동',
            roadAddress: '서울 강남구 역삼로 123',
            mapx: '127000000',
            mapy: '37000000',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(response),
      });

      const result = await client.searchPlace('김밥', '역삼동');

      expect(result).not.toBeNull();
      expect(result!.priceRange).toBe('low');
    });

    it('should estimate medium price for regular restaurants', async () => {
      const response: NaverLocalSearchResponse = {
        lastBuildDate: '2024-01-15T12:00:00+09:00',
        total: 1,
        start: 1,
        display: 5,
        items: [
          {
            title: '일반 한식당',
            link: 'https://map.naver.com/v5/search/place/333333333',
            category: '음식점,한식',
            description: '백반 정식',
            telephone: '02-1234-5678',
            address: '서울 강남구 역삼동',
            roadAddress: '서울 강남구 역삼로 456',
            mapx: '127000000',
            mapy: '37000000',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(response),
      });

      const result = await client.searchPlace('한식당', '역삼동');

      expect(result).not.toBeNull();
      expect(result!.priceRange).toBe('medium');
    });
  });

  describe('place ID extraction', () => {
    it('should extract place ID from naver map link', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockNaverResponse),
      });

      const result = await client.searchPlace('스타벅스', '강남');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('123456789');
    });

    it('should generate fallback ID when extraction fails', async () => {
      const response: NaverLocalSearchResponse = {
        lastBuildDate: '2024-01-15T12:00:00+09:00',
        total: 1,
        start: 1,
        display: 5,
        items: [
          {
            title: '테스트 식당',
            link: 'https://example.com/some-link',
            category: '음식점',
            description: '테스트',
            telephone: '02-1234-5678',
            address: '서울 강남구',
            roadAddress: '서울 강남구 테헤란로',
            mapx: '127000000',
            mapy: '37000000',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(response),
      });

      const result = await client.searchPlace('테스트 식당', '강남구');

      expect(result).not.toBeNull();
      // Fallback ID uses coordinates for deterministic caching
      expect(result!.id).toBe('naver-127000000-37000000');
    });
  });

  describe('caching', () => {
    it('should return cached result without API call', async () => {
      const cachedResult = {
        id: 'cached-123',
        name: '캐시된 식당',
        address: '서울 강남구',
        category: '음식점',
        score: 4.5,
        reviewCount: 100,
        priceRange: 'medium' as const,
        businessHours: null,
        imageUrl: null,
      };

      const mockCache: CacheService = {
        get: vi.fn().mockResolvedValue({ value: cachedResult }),
        set: vi.fn(),
        delete: vi.fn(),
        isEnabled: vi.fn().mockReturnValue(true),
      };

      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      const cachedClient = new NaverPlaceApiClient('id', 'secret', mockCache);
      const result = await cachedClient.searchPlace('식당', '강남');

      expect(mockCache.get).toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toEqual(cachedResult);
    });

    it('should cache API result on cache miss', async () => {
      const mockCache: CacheService = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn(),
        delete: vi.fn(),
        isEnabled: vi.fn().mockReturnValue(true),
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockNaverResponse),
      });

      const cachedClient = new NaverPlaceApiClient('id', 'secret', mockCache);
      await cachedClient.searchPlace('스타벅스', '강남');

      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should cache null result', async () => {
      const mockCache: CacheService = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn(),
        delete: vi.fn(),
        isEnabled: vi.fn().mockReturnValue(true),
      };

      const emptyResponse: NaverLocalSearchResponse = {
        lastBuildDate: '2024-01-15T12:00:00+09:00',
        total: 0,
        start: 1,
        display: 5,
        items: [],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(emptyResponse),
      });

      const cachedClient = new NaverPlaceApiClient('id', 'secret', mockCache);
      const result = await cachedClient.searchPlace('없는식당', '강남');

      expect(result).toBeNull();
      expect(mockCache.set).toHaveBeenCalled();
    });
  });

  describe('best match selection', () => {
    it('should prefer exact name match', async () => {
      const response: NaverLocalSearchResponse = {
        lastBuildDate: '2024-01-15T12:00:00+09:00',
        total: 2,
        start: 1,
        display: 5,
        items: [
          {
            title: '스타벅스 다른점',
            link: 'https://map.naver.com/v5/search/place/111',
            category: '카페',
            description: '',
            telephone: '',
            address: '서울 강남구',
            roadAddress: '서울 강남구 테헤란로',
            mapx: '127000000',
            mapy: '37000000',
          },
          {
            title: '스타벅스 강남역점',
            link: 'https://map.naver.com/v5/search/place/222',
            category: '카페',
            description: '',
            telephone: '',
            address: '서울 강남구 역삼동',
            roadAddress: '서울 강남구 테헤란로 123',
            mapx: '127000000',
            mapy: '37000000',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(response),
      });

      const result = await client.searchPlace('스타벅스 강남역점', '테헤란로');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('스타벅스 강남역점');
    });

    it('should return null when no match meets minimum score', async () => {
      const response: NaverLocalSearchResponse = {
        lastBuildDate: '2024-01-15T12:00:00+09:00',
        total: 1,
        start: 1,
        display: 5,
        items: [
          {
            title: '완전 다른 가게',
            link: 'https://map.naver.com/v5/search/place/999',
            category: '음식점',
            description: '',
            telephone: '',
            address: '부산 해운대구',
            roadAddress: '부산 해운대구 해운대로',
            mapx: '127000000',
            mapy: '35000000',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(response),
      });

      const result = await client.searchPlace('스타벅스', '강남');

      expect(result).toBeNull();
    });
  });

  describe('NaverPlaceInfo properties', () => {
    it('should return correct default values for unavailable data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockNaverResponse),
      });

      const result = await client.searchPlace('스타벅스', '강남');

      expect(result).not.toBeNull();
      // 네이버 로컬 검색 API는 평점/리뷰/영업시간/이미지 정보를 제공하지 않음
      expect(result!.score).toBeNull();
      expect(result!.reviewCount).toBe(0);
      expect(result!.businessHours).toBeNull();
      expect(result!.imageUrl).toBeNull();
    });
  });
});
