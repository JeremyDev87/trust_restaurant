/**
 * 캐시 서비스
 *
 * Vercel KV (Redis) 기반 캐싱 레이어
 * 로컬 개발 환경에서는 인메모리 캐시로 폴백
 */

import { kv } from '@vercel/kv';

/**
 * 캐시 TTL 설정 (초 단위)
 */
export const CACHE_TTL = {
  /** 위생등급: 7일 */
  HYGIENE_GRADE: 7 * 24 * 60 * 60,
  /** 행정처분: 7일 */
  VIOLATION: 7 * 24 * 60 * 60,
  /** 카카오맵 검색: 1일 */
  KAKAO_MAP: 1 * 24 * 60 * 60,
} as const;

/**
 * 캐시 키 프리픽스
 */
export const CACHE_PREFIX = {
  HYGIENE_GRADE: 'hygiene',
  VIOLATION: 'violation',
  KAKAO_MAP: 'kakao',
} as const;

/**
 * 캐시 서비스 인터페이스
 */
export interface CacheService {
  /**
   * 캐시에서 값 조회
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * 캐시에 값 저장
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * 캐시에서 값 삭제
   */
  delete(key: string): Promise<void>;

  /**
   * 캐시 활성화 여부
   */
  isEnabled(): boolean;
}

/**
 * 인메모리 캐시 엔트리
 */
interface MemoryCacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * 인메모리 캐시 (로컬 개발용)
 */
class MemoryCache {
  private cache = new Map<string, MemoryCacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

/**
 * Vercel KV 캐시 서비스 구현
 */
class VercelKVCacheService implements CacheService {
  private readonly enabled: boolean;
  private readonly memoryCache: MemoryCache;

  constructor() {
    // 환경 변수로 캐시 비활성화 가능
    this.enabled = process.env.CACHE_ENABLED !== 'false';
    this.memoryCache = new MemoryCache();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private hasKVCredentials(): boolean {
    return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;

    try {
      // Vercel KV 사용 가능 시
      if (this.hasKVCredentials()) {
        return await kv.get<T>(key);
      }

      // 로컬 개발: 인메모리 캐시
      return this.memoryCache.get<T>(key);
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    ttlSeconds: number = 3600,
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      // Vercel KV 사용 가능 시
      if (this.hasKVCredentials()) {
        await kv.set(key, value, { ex: ttlSeconds });
        return;
      }

      // 로컬 개발: 인메모리 캐시
      this.memoryCache.set(key, value, ttlSeconds);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.enabled) return;

    try {
      if (this.hasKVCredentials()) {
        await kv.del(key);
        return;
      }

      this.memoryCache.delete(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }
}

/**
 * 캐시 키 생성 헬퍼
 */
export function buildCacheKey(
  prefix: string,
  ...parts: (string | undefined)[]
): string {
  const sanitizedParts = parts
    .filter((p): p is string => !!p)
    .map(p => p.toLowerCase().replace(/\s+/g, '_'));
  return `${prefix}:${sanitizedParts.join(':')}`;
}

// 싱글톤 인스턴스
let cacheServiceInstance: CacheService | null = null;

/**
 * CacheService 팩토리
 */
export function createCacheService(): CacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new VercelKVCacheService();
  }
  return cacheServiceInstance;
}

/**
 * 테스트용 캐시 서비스 리셋
 */
export function resetCacheService(): void {
  cacheServiceInstance = null;
}
