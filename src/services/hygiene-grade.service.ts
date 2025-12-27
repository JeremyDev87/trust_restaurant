/**
 * 위생등급 조회 서비스
 *
 * C004 API를 사용하여 식당의 위생등급 정보를 조회합니다.
 */

import type {
  C004Response,
  C004Row,
} from '../types/api/food-safety/c004.types.js';
import type { HygieneGrade } from '../types/domain/restaurant.types.js';
import { FoodSafetyApiClient } from '../utils/api-client.js';
import { matchName, matchAddress } from '../utils/address-matcher.js';
import { withCache, withCacheNullable } from '../utils/cache-wrapper.js';
import { formatDate } from '../utils/date-formatter.js';
import { isNoDataError } from '../utils/error-handler.js';
import { SERVICE_IDS, HYGIENE_GRADE_MAP } from '../config/constants.js';
import {
  type CacheService,
  buildCacheKey,
  CACHE_TTL,
  CACHE_PREFIX,
} from './cache.service.js';

/**
 * 위생등급 조회 결과
 */
export interface HygieneGradeSearchResult {
  /** 조회된 업소 목록 */
  items: HygieneGradeItem[];
  /** 전체 검색 결과 수 */
  totalCount: number;
}

/**
 * 위생등급 업소 정보
 */
export interface HygieneGradeItem {
  /** 업소명 */
  name: string;
  /** 주소 */
  address: string;
  /** 인허가번호 */
  licenseNo: string;
  /** 업종명 */
  businessType: string;
  /** 위생등급 정보 */
  hygieneGrade: HygieneGrade;
}

/**
 * C004Row를 HygieneGradeItem으로 변환
 */
function transformRow(row: C004Row): HygieneGradeItem {
  const gradeInfo =
    HYGIENE_GRADE_MAP[row.HG_ASGN_LV as keyof typeof HYGIENE_GRADE_MAP];

  const hygieneGrade: HygieneGrade = gradeInfo
    ? {
        has_grade: true,
        grade: gradeInfo.grade,
        grade_label: gradeInfo.label,
        grade_date: formatDate(row.ASGN_FROM),
        valid_until: formatDate(row.ASGN_TO),
        stars: gradeInfo.stars,
      }
    : {
        has_grade: false,
        grade: null,
        grade_label: null,
        grade_date: null,
        valid_until: null,
        stars: 0,
      };

  return {
    name: row.BSSH_NM,
    address: row.ADDR,
    licenseNo: row.LCNS_NO,
    businessType: row.INDUTY_NM,
    hygieneGrade,
  };
}

/**
 * 위생등급 서비스 클래스
 */
export class HygieneGradeService {
  private readonly client: FoodSafetyApiClient;
  private readonly cache?: CacheService;

  constructor(client: FoodSafetyApiClient, cache?: CacheService) {
    this.client = client;
    this.cache = cache;
  }

  /**
   * 업소명으로 위생등급 검색
   */
  async searchByName(
    name: string,
    region?: string,
  ): Promise<HygieneGradeSearchResult> {
    const cacheKey = buildCacheKey(
      CACHE_PREFIX.HYGIENE_GRADE,
      'search',
      name,
      region,
    );

    return withCache(
      { cache: this.cache, key: cacheKey, ttl: CACHE_TTL.HYGIENE_GRADE },
      async () => {
        try {
          const response = await this.client.fetch<C004Response>({
            serviceId: SERVICE_IDS.HYGIENE_GRADE,
            params: { UPSO_NM: name },
          });

          const rows = response.C004?.row || [];

          // 지역 필터링 (클라이언트 사이드)
          const filtered = region
            ? rows.filter(row => matchAddress(row.ADDR, region))
            : rows;

          return {
            items: filtered.map(transformRow),
            totalCount: filtered.length,
          };
        } catch (error) {
          // INFO-200 (데이터 없음)은 빈 결과로 처리
          if (isNoDataError(error)) {
            return { items: [], totalCount: 0 };
          }
          throw error;
        }
      },
    );
  }

  /**
   * 업소명과 지역으로 정확한 매칭 검색
   */
  async findExactMatch(
    name: string,
    region: string,
  ): Promise<HygieneGradeItem | null> {
    const cacheKey = buildCacheKey(
      CACHE_PREFIX.HYGIENE_GRADE,
      'exact',
      name,
      region,
    );

    return withCacheNullable(
      { cache: this.cache, key: cacheKey, ttl: CACHE_TTL.HYGIENE_GRADE },
      async () => {
        const result = await this.searchByName(name, region);

        // 정확히 일치하는 업소 찾기
        const exactMatch = result.items.find(
          item =>
            matchName(item.name, name) && matchAddress(item.address, region),
        );

        return exactMatch || null;
      },
    );
  }

  /**
   * 인허가번호로 위생등급 조회
   */
  async getByLicenseNo(licenseNo: string): Promise<HygieneGradeItem | null> {
    const cacheKey = buildCacheKey(
      CACHE_PREFIX.HYGIENE_GRADE,
      'license',
      licenseNo,
    );

    return withCacheNullable(
      { cache: this.cache, key: cacheKey, ttl: CACHE_TTL.HYGIENE_GRADE },
      async () => {
        const response = await this.client.fetch<C004Response>({
          serviceId: SERVICE_IDS.HYGIENE_GRADE,
          params: { LCNS_NO: licenseNo },
        });

        const row = response.C004?.row?.[0];
        return row ? transformRow(row) : null;
      },
    );
  }
}

/**
 * 위생등급 서비스 인스턴스 생성
 */
export function createHygieneGradeService(
  client: FoodSafetyApiClient,
  cache?: CacheService,
): HygieneGradeService {
  return new HygieneGradeService(client, cache);
}
