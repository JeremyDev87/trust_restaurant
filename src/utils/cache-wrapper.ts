/**
 * 캐시 래퍼 유틸리티
 *
 * 서비스 메서드에서 반복되는 캐시 체크-저장 패턴을 추상화합니다.
 */

import type { CacheService } from '../services/cache.service.js';

/**
 * 캐시 옵션
 */
export interface CacheOptions {
  /** 캐시 서비스 (없으면 캐싱 비활성화) */
  cache?: CacheService;
  /** 캐시 키 */
  key: string;
  /** TTL (초) */
  ttl: number;
}

/**
 * 캐시 래퍼 함수
 *
 * 캐시에서 먼저 조회하고, 없으면 fetcher를 실행하여 결과를 캐시에 저장합니다.
 *
 * @param options - 캐시 옵션
 * @param fetcher - 데이터를 가져오는 비동기 함수
 * @returns fetcher의 결과 또는 캐시된 값
 *
 * @example
 * ```typescript
 * const result = await withCache(
 *   { cache: this.cache, key: 'user:123', ttl: 3600 },
 *   async () => fetchUserFromApi(123)
 * );
 * ```
 */
export async function withCache<T>(
  options: CacheOptions,
  fetcher: () => Promise<T>,
): Promise<T> {
  const { cache, key, ttl } = options;

  // 캐시가 없으면 바로 fetcher 실행
  if (!cache) {
    return fetcher();
  }

  // 캐시 확인
  const cached = await cache.get<T>(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  // fetcher 실행
  const result = await fetcher();

  // 결과 캐시 저장
  await cache.set(key, result, ttl);

  return result;
}

/**
 * null을 허용하는 캐시 래퍼 함수
 *
 * 캐시에 null 값이 저장될 수 있는 경우 사용합니다.
 * 캐시 미스와 null 결과를 구분하기 위해 래퍼 객체를 사용합니다.
 *
 * @param options - 캐시 옵션
 * @param fetcher - 데이터를 가져오는 비동기 함수 (null 반환 가능)
 * @returns fetcher의 결과 또는 캐시된 값 (null 포함)
 */
export async function withCacheNullable<T>(
  options: CacheOptions,
  fetcher: () => Promise<T | null>,
): Promise<T | null> {
  const { cache, key, ttl } = options;

  // 캐시가 없으면 바로 fetcher 실행
  if (!cache) {
    return fetcher();
  }

  // 캐시 확인 - 래퍼 객체로 저장하여 null과 미스 구분
  const cached = await cache.get<{ value: T | null }>(key);
  if (cached !== null && cached !== undefined) {
    return cached.value;
  }

  // fetcher 실행
  const result = await fetcher();

  // 결과 캐시 저장 (null도 래퍼로 감싸서 저장)
  await cache.set(key, { value: result }, ttl);

  return result;
}
