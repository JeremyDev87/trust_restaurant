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

/**
 * Kakao Map API 에러
 */
export class KakaoApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number
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
}

/**
 * Kakao Map API 클라이언트
 */
export class KakaoMapApiClient implements KakaoMapService {
  private readonly baseUrl = 'https://dapi.kakao.com/v2/local/search/keyword.json';
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.KAKAO_API_KEY || '';
    if (!this.apiKey) {
      console.warn('KAKAO_API_KEY is not set. Kakao Map search will be disabled.');
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
  private async search(params: KakaoSearchParams): Promise<KakaoSearchResponse> {
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
          response.status
        );
      }

      return await response.json() as KakaoSearchResponse;
    } catch (error) {
      if (error instanceof KakaoApiError) {
        throw error;
      }
      throw new KakaoApiError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * 카테고리별 검색 (음식점 또는 카페)
   */
  private async searchByCategory(
    query: string,
    category: 'FD6' | 'CE7'
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
    return places.filter((place) => {
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
  async searchRestaurant(query: string, region: string): Promise<RestaurantInfo[]> {
    if (!this.isAvailable()) {
      return [];
    }

    const searchQuery = `${query} ${region}`;

    // 음식점과 카페 동시 검색
    const [restaurants, cafes] = await Promise.all([
      this.searchByCategory(searchQuery, 'FD6'),
      this.searchByCategory(searchQuery, 'CE7'),
    ]);

    // 결과 병합 및 중복 제거
    const allPlaces = this.deduplicateByPlaceId([...restaurants, ...cafes]);

    // RestaurantInfo로 변환 (최대 5개)
    return allPlaces.slice(0, 5).map((place) => this.toRestaurantInfo(place));
  }
}

/**
 * Kakao Map 서비스 생성 팩토리
 */
export function createKakaoMapService(apiKey?: string): KakaoMapService {
  return new KakaoMapApiClient(apiKey);
}
