/**
 * Kakao Map API 서비스
 *
 * 카카오 로컬 키워드 검색 API를 사용하여 식당 정보를 조회합니다.
 */

import type {
  KakaoSearchResponse,
  KakaoSearchParams,
  KakaoPlace,
  RestaurantInfo,
} from '../types/kakao-map.types.js';
import type { AreaSearchResult } from '../types/area-search.types.js';
import { withCache } from '../utils/cache-wrapper.js';
import {
  type CacheService,
  buildCacheKey,
  CACHE_TTL,
  CACHE_PREFIX,
} from './cache.service.js';

/**
 * Kakao Map API 에러
 */
export class KakaoApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'KakaoApiError';
  }
}

/**
 * Kakao Map 서비스 인터페이스
 */
export interface KakaoMapService {
  /**
   * 식당/카페 검색
   * @param query - 검색어 (식당명)
   * @param region - 지역명
   * @returns 검색 결과 목록
   */
  searchRestaurant(query: string, region: string): Promise<RestaurantInfo[]>;

  /**
   * 지역 내 식당/카페 탐색
   * @param area - 지역명 (예: "강남구", "역삼역")
   * @param category - 카테고리 필터 ('restaurant' | 'cafe' | 'all')
   * @returns 지역 검색 결과
   */
  searchByArea(
    area: string,
    category?: 'restaurant' | 'cafe' | 'all',
  ): Promise<AreaSearchResult>;
}

/**
 * Kakao Map API 클라이언트
 */
export class KakaoMapApiClient implements KakaoMapService {
  private readonly baseUrl =
    'https://dapi.kakao.com/v2/local/search/keyword.json';
  private readonly apiKey: string;
  private readonly cache?: CacheService;

  constructor(apiKey?: string, cache?: CacheService) {
    this.apiKey = apiKey || process.env.KAKAO_API_KEY || '';
    this.cache = cache;
    if (!this.apiKey) {
      console.warn(
        'KAKAO_API_KEY is not set. Kakao Map search will be disabled.',
      );
    }
  }

  /**
   * API 키 유효성 확인
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * 키워드 검색 API 호출
   */
  private async search(
    params: KakaoSearchParams,
  ): Promise<KakaoSearchResponse> {
    if (!this.apiKey) {
      throw new KakaoApiError('KAKAO_API_KEY is not configured', 'NO_API_KEY');
    }

    const searchParams = new URLSearchParams();
    searchParams.set('query', params.query);

    if (params.category_group_code) {
      searchParams.set('category_group_code', params.category_group_code);
    }
    if (params.x) searchParams.set('x', params.x);
    if (params.y) searchParams.set('y', params.y);
    if (params.radius) searchParams.set('radius', String(params.radius));
    if (params.page) searchParams.set('page', String(params.page));
    if (params.size) searchParams.set('size', String(params.size));
    if (params.sort) searchParams.set('sort', params.sort);

    const url = `${this.baseUrl}?${searchParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `KakaoAK ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new KakaoApiError(
          `Kakao API error: ${errorText}`,
          'API_ERROR',
          response.status,
        );
      }

      return (await response.json()) as KakaoSearchResponse;
    } catch (error) {
      if (error instanceof KakaoApiError) {
        throw error;
      }
      throw new KakaoApiError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        'NETWORK_ERROR',
      );
    }
  }

  /**
   * 카테고리별 검색 (음식점 또는 카페)
   */
  private async searchByCategory(
    query: string,
    category: 'FD6' | 'CE7',
  ): Promise<KakaoPlace[]> {
    try {
      const response = await this.search({
        query,
        category_group_code: category,
        size: 5,
        sort: 'accuracy',
      });
      return response.documents;
    } catch (error) {
      // 개별 카테고리 검색 실패 시 빈 배열 반환
      console.error(`Category ${category} search failed:`, error);
      return [];
    }
  }

  /**
   * KakaoPlace를 RestaurantInfo로 변환
   */
  private toRestaurantInfo(place: KakaoPlace): RestaurantInfo {
    return {
      id: place.id,
      name: place.place_name,
      address: place.address_name,
      roadAddress: place.road_address_name,
      phone: place.phone,
      category: place.category_name,
      longitude: place.x,
      latitude: place.y,
    };
  }

  /**
   * 중복 제거 (place ID 기준)
   */
  private deduplicateByPlaceId(places: KakaoPlace[]): KakaoPlace[] {
    const seen = new Set<string>();
    return places.filter(place => {
      if (seen.has(place.id)) {
        return false;
      }
      seen.add(place.id);
      return true;
    });
  }

  /**
   * 식당/카페 검색
   *
   * 음식점(FD6)과 카페(CE7) 카테고리를 모두 검색하여 결과를 병합합니다.
   *
   * @param query - 검색어 (식당명)
   * @param region - 지역명
   * @returns 검색 결과 목록 (최대 5개)
   */
  async searchRestaurant(
    query: string,
    region: string,
  ): Promise<RestaurantInfo[]> {
    if (!this.isAvailable()) {
      return [];
    }

    const cacheKey = buildCacheKey(
      CACHE_PREFIX.KAKAO_MAP,
      'search',
      query,
      region,
    );

    return withCache(
      { cache: this.cache, key: cacheKey, ttl: CACHE_TTL.KAKAO_MAP },
      async () => {
        const searchQuery = `${query} ${region}`;

        // 음식점과 카페 동시 검색
        const [restaurants, cafes] = await Promise.all([
          this.searchByCategory(searchQuery, 'FD6'),
          this.searchByCategory(searchQuery, 'CE7'),
        ]);

        // 결과 병합 및 중복 제거
        const allPlaces = this.deduplicateByPlaceId([...restaurants, ...cafes]);

        // RestaurantInfo로 변환 (최대 5개)
        return allPlaces.slice(0, 5).map(place => this.toRestaurantInfo(place));
      },
    );
  }

  /**
   * 지역 내 식당/카페 탐색 (페이지네이션 포함)
   */
  private async searchAreaWithPagination(
    query: string,
    category: 'FD6' | 'CE7',
  ): Promise<{ places: KakaoPlace[]; totalCount: number }> {
    try {
      // 첫 페이지로 총 개수 확인
      const firstPage = await this.search({
        query,
        category_group_code: category,
        size: 15,
        page: 1,
        sort: 'accuracy',
      });

      const totalCount = firstPage.meta.total_count;
      let places = [...firstPage.documents];

      // 추가 페이지 조회 (최대 3페이지 = 45개)
      if (!firstPage.meta.is_end && totalCount <= 50) {
        const additionalPages = await Promise.all([
          this.search({
            query,
            category_group_code: category,
            size: 15,
            page: 2,
            sort: 'accuracy',
          }).catch(() => null),
          this.search({
            query,
            category_group_code: category,
            size: 15,
            page: 3,
            sort: 'accuracy',
          }).catch(() => null),
        ]);

        for (const page of additionalPages) {
          if (page?.documents) {
            places = [...places, ...page.documents];
          }
        }
      }

      return { places, totalCount };
    } catch {
      return { places: [], totalCount: 0 };
    }
  }

  /**
   * 지역명에서 세분화 제안 생성
   */
  private generateAreaSuggestions(area: string): string[] {
    // 주요 지역별 세분화 제안
    const areaSuggestions: Record<string, string[]> = {
      강남구: [
        '역삼역',
        '강남역',
        '삼성역',
        '선릉역',
        '청담동',
        '논현동',
        '신사동',
      ],
      서초구: ['강남역', '서초역', '교대역', '양재역', '방배동', '반포동'],
      마포구: ['홍대입구역', '합정역', '망원동', '연남동', '상수역'],
      송파구: ['잠실역', '석촌역', '송파역', '문정동', '방이동'],
      영등포구: ['여의도역', '영등포역', '당산역', '문래동'],
      종로구: ['광화문역', '종각역', '안국역', '삼청동', '북촌'],
      중구: ['명동역', '을지로역', '충무로역', '동대문역'],
      용산구: ['이태원역', '녹사평역', '한남동', '용산역'],
      성동구: ['성수역', '왕십리역', '서울숲역', '뚝섬역'],
      광진구: ['건대입구역', '구의역', '아차산역'],
      구로구: ['신도림역', '구로디지털단지역', '대림역'],
    };

    // 입력된 지역에서 구 이름 추출
    for (const [gu, suggestions] of Object.entries(areaSuggestions)) {
      if (area.includes(gu)) {
        return suggestions;
      }
    }

    // 기본 제안
    return [
      `${area} 역 근처`,
      `${area} 중심가`,
      `${area} 동쪽`,
      `${area} 서쪽`,
    ];
  }

  /**
   * 지역 내 식당/카페 탐색
   *
   * @param area - 지역명 (예: "강남구", "역삼역")
   * @param category - 카테고리 필터
   * @returns 지역 검색 결과
   */
  async searchByArea(
    area: string,
    category: 'restaurant' | 'cafe' | 'all' = 'all',
  ): Promise<AreaSearchResult> {
    if (!this.isAvailable()) {
      return {
        status: 'not_found',
        totalCount: 0,
        restaurants: [],
        message: 'Kakao API가 설정되지 않았습니다.',
      };
    }

    const cacheKey = buildCacheKey(
      CACHE_PREFIX.KAKAO_MAP,
      'area',
      area,
      category,
    );

    return withCache(
      { cache: this.cache, key: cacheKey, ttl: CACHE_TTL.KAKAO_MAP },
      async () => {
        const searchQuery = `${area} 음식점`;

        // 카테고리에 따른 검색
        let restaurantResult = { places: [] as KakaoPlace[], totalCount: 0 };
        let cafeResult = { places: [] as KakaoPlace[], totalCount: 0 };

        if (category === 'restaurant' || category === 'all') {
          restaurantResult = await this.searchAreaWithPagination(
            searchQuery,
            'FD6',
          );
        }
        if (category === 'cafe' || category === 'all') {
          const cafeQuery = `${area} 카페`;
          cafeResult = await this.searchAreaWithPagination(cafeQuery, 'CE7');
        }

        // 결과 병합
        const allPlaces = this.deduplicateByPlaceId([
          ...restaurantResult.places,
          ...cafeResult.places,
        ]);
        const totalCount =
          restaurantResult.totalCount + cafeResult.totalCount;

        // 결과 없음
        if (totalCount === 0) {
          return {
            status: 'not_found' as const,
            totalCount: 0,
            restaurants: [],
            message: `"${area}" 지역에서 식당을 찾을 수 없습니다.`,
          };
        }

        // 결과가 너무 많음 (50개 초과)
        if (totalCount > 50) {
          return {
            status: 'too_many' as const,
            totalCount,
            restaurants: [],
            suggestions: this.generateAreaSuggestions(area),
            message: `"${area}" 지역에 ${totalCount}개의 식당이 있습니다. 더 구체적인 지역을 입력해주세요.`,
          };
        }

        // 적절한 결과 수
        return {
          status: 'ready' as const,
          totalCount: allPlaces.length,
          restaurants: allPlaces.map(place => this.toRestaurantInfo(place)),
          message: `"${area}" 지역에서 ${allPlaces.length}개의 식당을 찾았습니다.`,
        };
      },
    );
  }
}

/**
 * Kakao Map 서비스 생성 팩토리
 */
export function createKakaoMapService(
  apiKey?: string,
  cache?: CacheService,
): KakaoMapService {
  return new KakaoMapApiClient(apiKey, cache);
}
