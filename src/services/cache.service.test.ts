/**
 * 캐시 서비스 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildCacheKey,
  CACHE_TTL,
  CACHE_PREFIX,
  createCacheService,
  resetCacheService,
  type CacheService,
} from './cache.service.js';

// @vercel/kv mock
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

import { kv } from '@vercel/kv';

describe('CacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCacheService();
    // 기본 환경 설정
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.CACHE_ENABLED;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CACHE_TTL 상수', () => {
    it('위생등급 TTL은 7일이다', () => {
      expect(CACHE_TTL.HYGIENE_GRADE).toBe(7 * 24 * 60 * 60);
    });

    it('행정처분 TTL은 7일이다', () => {
      expect(CACHE_TTL.VIOLATION).toBe(7 * 24 * 60 * 60);
    });

    it('카카오맵 TTL은 1일이다', () => {
      expect(CACHE_TTL.KAKAO_MAP).toBe(1 * 24 * 60 * 60);
    });
  });

  describe('CACHE_PREFIX 상수', () => {
    it('올바른 프리픽스 값을 가진다', () => {
      expect(CACHE_PREFIX.HYGIENE_GRADE).toBe('hygiene');
      expect(CACHE_PREFIX.VIOLATION).toBe('violation');
      expect(CACHE_PREFIX.KAKAO_MAP).toBe('kakao');
    });
  });

  describe('buildCacheKey', () => {
    it('프리픽스와 파츠를 결합한다', () => {
      const key = buildCacheKey('hygiene', 'search', '스타벅스', '강남구');
      expect(key).toBe('hygiene:search:스타벅스:강남구');
    });

    it('공백을 언더스코어로 변환한다', () => {
      const key = buildCacheKey('hygiene', 'search', '스타벅스 강남역점');
      expect(key).toBe('hygiene:search:스타벅스_강남역점');
    });

    it('대문자를 소문자로 변환한다', () => {
      const key = buildCacheKey('hygiene', 'SEARCH', 'STARBUCKS');
      expect(key).toBe('hygiene:search:starbucks');
    });

    it('undefined 파츠를 무시한다', () => {
      const key = buildCacheKey('hygiene', 'search', '스타벅스', undefined);
      expect(key).toBe('hygiene:search:스타벅스');
    });

    it('빈 문자열 파츠를 무시한다', () => {
      const key = buildCacheKey('hygiene', 'search', '', '스타벅스');
      expect(key).toBe('hygiene:search:스타벅스');
    });

    it('연속 공백을 단일 언더스코어로 변환한다', () => {
      const key = buildCacheKey('hygiene', 'search', '스타벅스   강남');
      expect(key).toBe('hygiene:search:스타벅스_강남');
    });
  });

  describe('createCacheService', () => {
    it('싱글톤 인스턴스를 반환한다', () => {
      const service1 = createCacheService();
      const service2 = createCacheService();
      expect(service1).toBe(service2);
    });

    it('resetCacheService 후 새 인스턴스를 생성한다', () => {
      const service1 = createCacheService();
      resetCacheService();
      const service2 = createCacheService();
      expect(service1).not.toBe(service2);
    });
  });

  describe('VercelKVCacheService - 로컬 환경 (인메모리)', () => {
    let cacheService: CacheService;

    beforeEach(() => {
      // KV 자격 증명 없음 -> 인메모리 모드
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
      resetCacheService();
      cacheService = createCacheService();
    });

    it('isEnabled가 true를 반환한다', () => {
      expect(cacheService.isEnabled()).toBe(true);
    });

    it('값을 저장하고 조회할 수 있다', async () => {
      await cacheService.set('test-key', { data: 'test' }, 3600);
      const result = await cacheService.get<{ data: string }>('test-key');
      expect(result).toEqual({ data: 'test' });
    });

    it('존재하지 않는 키는 null을 반환한다', async () => {
      const result = await cacheService.get('nonexistent');
      expect(result).toBeNull();
    });

    it('삭제한 키는 null을 반환한다', async () => {
      await cacheService.set('delete-test', 'value', 3600);
      await cacheService.delete('delete-test');
      const result = await cacheService.get('delete-test');
      expect(result).toBeNull();
    });

    it('TTL 만료 후 null을 반환한다', async () => {
      vi.useFakeTimers();
      await cacheService.set('ttl-test', 'value', 1); // 1초 TTL

      // 2초 경과
      vi.advanceTimersByTime(2000);

      const result = await cacheService.get('ttl-test');
      expect(result).toBeNull();
      vi.useRealTimers();
    });

    it('TTL 내에는 값을 반환한다', async () => {
      vi.useFakeTimers();
      await cacheService.set('ttl-test2', 'value', 10); // 10초 TTL

      // 5초 경과
      vi.advanceTimersByTime(5000);

      const result = await cacheService.get('ttl-test2');
      expect(result).toBe('value');
      vi.useRealTimers();
    });
  });

  describe('VercelKVCacheService - 캐시 비활성화', () => {
    let cacheService: CacheService;

    beforeEach(() => {
      process.env.CACHE_ENABLED = 'false';
      resetCacheService();
      cacheService = createCacheService();
    });

    afterEach(() => {
      delete process.env.CACHE_ENABLED;
    });

    it('isEnabled가 false를 반환한다', () => {
      expect(cacheService.isEnabled()).toBe(false);
    });

    it('get이 항상 null을 반환한다', async () => {
      await cacheService.set('disabled-test', 'value', 3600);
      const result = await cacheService.get('disabled-test');
      expect(result).toBeNull();
    });

    it('set이 아무 작업도 하지 않는다', async () => {
      // 에러 없이 완료되어야 함
      await expect(
        cacheService.set('key', 'value', 3600),
      ).resolves.toBeUndefined();
    });

    it('delete가 아무 작업도 하지 않는다', async () => {
      await expect(cacheService.delete('key')).resolves.toBeUndefined();
    });
  });

  describe('VercelKVCacheService - Vercel KV 환경', () => {
    let cacheService: CacheService;

    beforeEach(() => {
      process.env.KV_REST_API_URL = 'https://test.kv.vercel.com';
      process.env.KV_REST_API_TOKEN = 'test-token';
      resetCacheService();
      cacheService = createCacheService();
    });

    afterEach(() => {
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
    });

    it('Vercel KV를 사용하여 값을 조회한다', async () => {
      vi.mocked(kv.get).mockResolvedValue({ data: 'cached' });

      const result = await cacheService.get<{ data: string }>('kv-test');

      expect(kv.get).toHaveBeenCalledWith('kv-test');
      expect(result).toEqual({ data: 'cached' });
    });

    it('Vercel KV를 사용하여 값을 저장한다', async () => {
      vi.mocked(kv.set).mockResolvedValue('OK');

      await cacheService.set('kv-test', { data: 'value' }, 3600);

      expect(kv.set).toHaveBeenCalledWith(
        'kv-test',
        { data: 'value' },
        { ex: 3600 },
      );
    });

    it('Vercel KV를 사용하여 값을 삭제한다', async () => {
      vi.mocked(kv.del).mockResolvedValue(1);

      await cacheService.delete('kv-test');

      expect(kv.del).toHaveBeenCalledWith('kv-test');
    });

    it('KV 에러 시 null을 반환한다 (get)', async () => {
      vi.mocked(kv.get).mockRejectedValue(new Error('KV Error'));

      const result = await cacheService.get('error-test');

      expect(result).toBeNull();
    });

    it('KV 에러 시 조용히 실패한다 (set)', async () => {
      vi.mocked(kv.set).mockRejectedValue(new Error('KV Error'));

      // 에러 없이 완료되어야 함
      await expect(
        cacheService.set('error-test', 'value', 3600),
      ).resolves.toBeUndefined();
    });

    it('KV 에러 시 조용히 실패한다 (delete)', async () => {
      vi.mocked(kv.del).mockRejectedValue(new Error('KV Error'));

      await expect(cacheService.delete('error-test')).resolves.toBeUndefined();
    });
  });

  describe('기본 TTL', () => {
    let cacheService: CacheService;

    beforeEach(() => {
      process.env.KV_REST_API_URL = 'https://test.kv.vercel.com';
      process.env.KV_REST_API_TOKEN = 'test-token';
      resetCacheService();
      cacheService = createCacheService();
    });

    afterEach(() => {
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
    });

    it('TTL을 지정하지 않으면 기본값 3600초를 사용한다', async () => {
      vi.mocked(kv.set).mockResolvedValue('OK');

      await cacheService.set('default-ttl', 'value');

      expect(kv.set).toHaveBeenCalledWith('default-ttl', 'value', { ex: 3600 });
    });
  });
});

describe('MemoryCache 내부 동작', () => {
  beforeEach(() => {
    resetCacheService();
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.CACHE_ENABLED;
  });

  it('다양한 타입의 값을 저장할 수 있다', async () => {
    const cacheService = createCacheService();

    await cacheService.set('string', 'hello', 3600);
    await cacheService.set('number', 42, 3600);
    await cacheService.set('boolean', true, 3600);
    await cacheService.set('object', { key: 'value' }, 3600);
    await cacheService.set('array', [1, 2, 3], 3600);

    expect(await cacheService.get('string')).toBe('hello');
    expect(await cacheService.get('number')).toBe(42);
    expect(await cacheService.get('boolean')).toBe(true);
    expect(await cacheService.get('object')).toEqual({ key: 'value' });
    expect(await cacheService.get('array')).toEqual([1, 2, 3]);
  });

  it('같은 키로 덮어쓰기가 가능하다', async () => {
    const cacheService = createCacheService();

    await cacheService.set('overwrite', 'first', 3600);
    await cacheService.set('overwrite', 'second', 3600);

    expect(await cacheService.get('overwrite')).toBe('second');
  });

  it('null 값도 저장할 수 있다', async () => {
    const cacheService = createCacheService();

    await cacheService.set('null-value', null, 3600);

    const result = await cacheService.get('null-value');
    expect(result).toBeNull();
  });
});
