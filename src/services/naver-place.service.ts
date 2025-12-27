/**
 * 네이버 플레이스 API 서비스
 *
 * 네이버 로컬 검색 API를 사용하여 식당의 평점, 리뷰 수, 가격 정보를 조회합니다.
 */

import type {
  NaverPlaceInfo,
  NaverLocalSearchResponse,
  NaverLocalSearchItem,
  PriceRange,
} from '../types/naver-place.types.js';
import { withCacheNullable } from '../utils/cache-wrapper.js';
import {
  type CacheService,
  buildCacheKey,
  CACHE_TTL,
  CACHE_PREFIX,
} from './cache.service.js';
import { NAVER_API_CONFIG } from '../config/constants.js';

/**
 * 네이버 API 에러
 */
export class NaverApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'NaverApiError';
  }
}

/**
 * 네이버 플레이스 서비스 인터페이스
 */
export interface NaverPlaceService {
  /**
   * 식당명과 주소로 네이버 플레이스 정보 조회
   * @param name - 식당명
   * @param address - 주소
   * @returns 네이버 플레이스 정보 또는 null
   */
  searchPlace(name: string, address: string): Promise<NaverPlaceInfo | null>;

  /**
   * 서비스 사용 가능 여부 확인
   * @returns API 키가 설정되어 있으면 true
   */
  isAvailable(): boolean;
}

/**
 * 네이버 플레이스 API 클라이언트
 */
export class NaverPlaceApiClient implements NaverPlaceService {
  private readonly baseUrl = NAVER_API_CONFIG.BASE_URL;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly cache?: CacheService;

  constructor(clientId?: string, clientSecret?: string, cache?: CacheService) {
    this.clientId = clientId || process.env.NAVER_CLIENT_ID || '';
    this.clientSecret = clientSecret || process.env.NAVER_CLIENT_SECRET || '';
    this.cache = cache;

    if (!this.clientId || !this.clientSecret) {
      console.warn(
        'NAVER_CLIENT_ID or NAVER_CLIENT_SECRET is not set. Naver Place search will be disabled.',
      );
    }
  }

  /**
   * API 사용 가능 여부 확인
   */
  isAvailable(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * 네이버 로컬 검색 API 호출
   */
  private async search(query: string): Promise<NaverLocalSearchResponse> {
    if (!this.isAvailable()) {
      throw new NaverApiError(
        'NAVER_CLIENT_ID or NAVER_CLIENT_SECRET is not configured',
        'NO_API_KEY',
      );
    }

    const searchParams = new URLSearchParams();
    searchParams.set('query', query);
    searchParams.set('display', String(NAVER_API_CONFIG.MAX_RESULTS));
    searchParams.set('sort', 'sim'); // 정확도순

    const url = `${this.baseUrl}?${searchParams.toString()}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        NAVER_API_CONFIG.TIMEOUT,
      );

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Naver-Client-Id': this.clientId,
          'X-Naver-Client-Secret': this.clientSecret,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new NaverApiError(
          `Naver API error: ${errorText}`,
          'API_ERROR',
          response.status,
        );
      }

      return (await response.json()) as NaverLocalSearchResponse;
    } catch (error) {
      if (error instanceof NaverApiError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NaverApiError('Request timeout', 'TIMEOUT');
      }
      throw new NaverApiError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        'NETWORK_ERROR',
      );
    }
  }

  /**
   * HTML 태그 제거
   */
  private stripHtml(text: string): string {
    return text.replace(/<[^>]*>/g, '');
  }

  /**
   * 검색 결과에서 가장 일치하는 장소 찾기
   */
  private findBestMatch(
    items: NaverLocalSearchItem[],
    name: string,
    address: string,
  ): NaverLocalSearchItem | null {
    if (items.length === 0) {
      return null;
    }

    const normalizedName = name.toLowerCase().replace(/\s+/g, '');
    const normalizedAddress = address.toLowerCase().replace(/\s+/g, '');

    // 점수 기반 매칭
    let bestMatch: NaverLocalSearchItem | null = null;
    let bestScore = 0;

    for (const item of items) {
      const itemName = this.stripHtml(item.title)
        .toLowerCase()
        .replace(/\s+/g, '');
      const itemAddress = (item.address || item.roadAddress)
        .toLowerCase()
        .replace(/\s+/g, '');

      let score = 0;

      // 이름 일치도 계산
      if (itemName === normalizedName) {
        score += 100; // 정확히 일치
      } else if (
        itemName.includes(normalizedName) ||
        normalizedName.includes(itemName)
      ) {
        score += 50; // 부분 일치
      }

      // 주소 일치도 계산
      if (
        itemAddress.includes(normalizedAddress) ||
        normalizedAddress.includes(itemAddress)
      ) {
        score += 30; // 주소 포함
      }

      // 카테고리가 음식점인 경우 가산점
      if (item.category.includes('음식점') || item.category.includes('카페')) {
        score += 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }

    // 최소 점수 기준 (이름이나 주소 중 하나는 일치해야 함)
    return bestScore >= 30 ? bestMatch : null;
  }

  /**
   * 네이버 플레이스 ID 추출 (링크에서)
   */
  private extractPlaceId(item: NaverLocalSearchItem): string {
    // 네이버 플레이스 링크에서 ID 추출
    // 예: https://map.naver.com/v5/search/.../place/123456789
    const match = item.link.match(/place\/(\d+)/);
    if (match) {
      return match[1];
    }

    // 링크에서 추출 실패 시 좌표 기반 ID 생성 (deterministic for caching)
    return `naver-${item.mapx}-${item.mapy}`;
  }

  /**
   * 가격대 추정 (카테고리와 설명 기반)
   *
   * 참고: 네이버 로컬 검색 API는 가격 정보를 직접 제공하지 않으므로
   * 카테고리 기반으로 추정합니다.
   */
  private estimatePriceRange(
    category: string,
    description: string,
  ): PriceRange {
    const lowerCategory = category.toLowerCase();
    const lowerDescription = description.toLowerCase();

    // 고가 카테고리
    const highPriceKeywords = [
      '파인다이닝',
      '오마카세',
      '코스요리',
      '스테이크',
      '한우',
      '와인바',
      '프렌치',
      '이탈리안',
    ];

    // 저가 카테고리
    const lowPriceKeywords = [
      '분식',
      '김밥',
      '떡볶이',
      '컵밥',
      '도시락',
      '패스트푸드',
      '편의점',
    ];

    for (const keyword of highPriceKeywords) {
      if (
        lowerCategory.includes(keyword) ||
        lowerDescription.includes(keyword)
      ) {
        return 'high';
      }
    }

    for (const keyword of lowPriceKeywords) {
      if (
        lowerCategory.includes(keyword) ||
        lowerDescription.includes(keyword)
      ) {
        return 'low';
      }
    }

    return 'medium';
  }

  /**
   * NaverLocalSearchItem을 NaverPlaceInfo로 변환
   */
  private toNaverPlaceInfo(item: NaverLocalSearchItem): NaverPlaceInfo {
    const name = this.stripHtml(item.title);

    return {
      id: this.extractPlaceId(item),
      name,
      address: item.roadAddress || item.address,
      category: item.category,
      // 네이버 로컬 검색 API는 평점/리뷰 수를 직접 제공하지 않음
      // 플레이스 API 또는 별도 스크래핑 필요
      score: null,
      reviewCount: 0,
      priceRange: this.estimatePriceRange(item.category, item.description),
      businessHours: null, // API에서 제공하지 않음
      imageUrl: null, // API에서 제공하지 않음
    };
  }

  /**
   * 식당명과 주소로 네이버 플레이스 정보 조회
   *
   * @param name - 식당명
   * @param address - 주소
   * @returns 네이버 플레이스 정보 또는 null
   */
  async searchPlace(
    name: string,
    address: string,
  ): Promise<NaverPlaceInfo | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const cacheKey = buildCacheKey(
      CACHE_PREFIX.NAVER_PLACE,
      'search',
      name,
      address,
    );

    return withCacheNullable(
      { cache: this.cache, key: cacheKey, ttl: CACHE_TTL.NAVER_PLACE },
      async () => {
        try {
          // 식당명 + 주소로 검색
          const searchQuery = `${name} ${address}`;
          const response = await this.search(searchQuery);

          // 가장 일치하는 결과 찾기
          const bestMatch = this.findBestMatch(response.items, name, address);

          if (!bestMatch) {
            return null;
          }

          return this.toNaverPlaceInfo(bestMatch);
        } catch (error) {
          // Graceful degradation: 에러 시 null 반환
          console.error('Naver Place search failed:', error);
          return null;
        }
      },
    );
  }
}

/**
 * 네이버 플레이스 서비스 생성 팩토리
 */
export function createNaverPlaceService(
  clientId?: string,
  clientSecret?: string,
  cache?: CacheService,
): NaverPlaceService {
  return new NaverPlaceApiClient(clientId, clientSecret, cache);
}
