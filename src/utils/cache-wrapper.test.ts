/**
 * 캐시 래퍼 유틸리티 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withCache, withCacheNullable } from './cache-wrapper.js';
import type { CacheService } from '../services/cache.service.js';

/**
 * Mock CacheService 생성
 */
function createMockCacheService(): CacheService & {
  storage: Map<string, unknown>;
} {
  const storage = new Map<string, unknown>();
  return {
    storage,
    isEnabled: () => true,
    get: vi.fn(async <T>(key: string): Promise<T | null> => {
      return (storage.get(key) as T) ?? null;
    }),
    set: vi.fn(async <T>(key: string, value: T): Promise<void> => {
      storage.set(key, value);
    }),
    delete: vi.fn(async (): Promise<void> => {}),
  };
}

describe('withCache', () => {
  let mockCache: ReturnType<typeof createMockCacheService>;

  beforeEach(() => {
    mockCache = createMockCacheService();
    vi.clearAllMocks();
  });

  describe('캐시 동작', () => {
    it('캐시 히트 시 캐시된 값을 반환한다', async () => {
      const cachedData = { data: 'cached' };
      mockCache.storage.set('test-key', cachedData);

      const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' });

      const result = await withCache(
        { cache: mockCache, key: 'test-key', ttl: 3600 },
        fetcher,
      );

      expect(result).toEqual(cachedData);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('캐시 미스 시 fetcher를 실행한다', async () => {
      const freshData = { data: 'fresh' };
      const fetcher = vi.fn().mockResolvedValue(freshData);

      const result = await withCache(
        { cache: mockCache, key: 'test-key', ttl: 3600 },
        fetcher,
      );

      expect(result).toEqual(freshData);
      expect(fetcher).toHaveBeenCalledOnce();
    });

    it('fetcher 결과를 캐시에 저장한다', async () => {
      const freshData = { data: 'fresh' };
      const fetcher = vi.fn().mockResolvedValue(freshData);

      await withCache({ cache: mockCache, key: 'test-key', ttl: 3600 }, fetcher);

      expect(mockCache.set).toHaveBeenCalledWith('test-key', freshData, 3600);
    });

    it('빈 배열도 캐시에 저장한다', async () => {
      const fetcher = vi.fn().mockResolvedValue([]);

      const result = await withCache(
        { cache: mockCache, key: 'test-key', ttl: 3600 },
        fetcher,
      );

      expect(result).toEqual([]);
      expect(mockCache.set).toHaveBeenCalledWith('test-key', [], 3600);
    });

    it('빈 객체도 캐시에 저장한다', async () => {
      const fetcher = vi.fn().mockResolvedValue({});

      const result = await withCache(
        { cache: mockCache, key: 'test-key', ttl: 3600 },
        fetcher,
      );

      expect(result).toEqual({});
      expect(mockCache.set).toHaveBeenCalledWith('test-key', {}, 3600);
    });
  });

  describe('캐시 없이 동작', () => {
    it('cache가 undefined면 fetcher를 직접 실행한다', async () => {
      const freshData = { data: 'fresh' };
      const fetcher = vi.fn().mockResolvedValue(freshData);

      const result = await withCache(
        { cache: undefined, key: 'test-key', ttl: 3600 },
        fetcher,
      );

      expect(result).toEqual(freshData);
      expect(fetcher).toHaveBeenCalledOnce();
    });
  });

  describe('에러 처리', () => {
    it('fetcher 에러는 그대로 전파된다', async () => {
      const error = new Error('Fetcher error');
      const fetcher = vi.fn().mockRejectedValue(error);

      await expect(
        withCache({ cache: mockCache, key: 'test-key', ttl: 3600 }, fetcher),
      ).rejects.toThrow('Fetcher error');
    });
  });
});

describe('withCacheNullable', () => {
  let mockCache: ReturnType<typeof createMockCacheService>;

  beforeEach(() => {
    mockCache = createMockCacheService();
    vi.clearAllMocks();
  });

  describe('null 값 구분', () => {
    it('캐시된 null 값을 올바르게 반환한다', async () => {
      // 래퍼 객체로 null 저장
      mockCache.storage.set('test-key', { value: null });

      const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' });

      const result = await withCacheNullable(
        { cache: mockCache, key: 'test-key', ttl: 3600 },
        fetcher,
      );

      expect(result).toBeNull();
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('캐시 미스와 캐시된 null을 구분한다', async () => {
      // 캐시 미스 - fetcher 호출됨
      const fetcher = vi.fn().mockResolvedValue(null);

      const result = await withCacheNullable(
        { cache: mockCache, key: 'test-key', ttl: 3600 },
        fetcher,
      );

      expect(result).toBeNull();
      expect(fetcher).toHaveBeenCalledOnce();
      // 래퍼 객체로 저장됨
      expect(mockCache.set).toHaveBeenCalledWith(
        'test-key',
        { value: null },
        3600,
      );
    });
  });

  describe('non-null 값 동작', () => {
    it('캐시된 non-null 값을 올바르게 반환한다', async () => {
      const cachedData = { name: 'test' };
      mockCache.storage.set('test-key', { value: cachedData });

      const fetcher = vi.fn().mockResolvedValue({ name: 'fresh' });

      const result = await withCacheNullable(
        { cache: mockCache, key: 'test-key', ttl: 3600 },
        fetcher,
      );

      expect(result).toEqual(cachedData);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('fetcher의 non-null 결과를 래퍼 객체로 캐시한다', async () => {
      const freshData = { name: 'fresh' };
      const fetcher = vi.fn().mockResolvedValue(freshData);

      const result = await withCacheNullable(
        { cache: mockCache, key: 'test-key', ttl: 3600 },
        fetcher,
      );

      expect(result).toEqual(freshData);
      expect(mockCache.set).toHaveBeenCalledWith(
        'test-key',
        { value: freshData },
        3600,
      );
    });
  });

  describe('캐시 없이 동작', () => {
    it('cache가 undefined면 fetcher를 직접 실행한다', async () => {
      const freshData = { name: 'fresh' };
      const fetcher = vi.fn().mockResolvedValue(freshData);

      const result = await withCacheNullable(
        { cache: undefined, key: 'test-key', ttl: 3600 },
        fetcher,
      );

      expect(result).toEqual(freshData);
      expect(fetcher).toHaveBeenCalledOnce();
    });

    it('cache가 undefined면 null도 직접 반환한다', async () => {
      const fetcher = vi.fn().mockResolvedValue(null);

      const result = await withCacheNullable(
        { cache: undefined, key: 'test-key', ttl: 3600 },
        fetcher,
      );

      expect(result).toBeNull();
      expect(fetcher).toHaveBeenCalledOnce();
    });
  });

  describe('에러 처리', () => {
    it('fetcher 에러는 그대로 전파된다', async () => {
      const error = new Error('Fetcher error');
      const fetcher = vi.fn().mockRejectedValue(error);

      await expect(
        withCacheNullable(
          { cache: mockCache, key: 'test-key', ttl: 3600 },
          fetcher,
        ),
      ).rejects.toThrow('Fetcher error');
    });
  });
});
