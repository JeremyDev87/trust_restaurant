/**
 * 행정처분 조회 서비스
 *
 * I2630 API를 사용하여 식품접객업 행정처분 정보를 조회합니다.
 */

import type {
  I2630Response,
  I2630Row,
} from '../types/api/food-safety/i2630.types.js';
import type {
  ViolationItem,
  ViolationHistory,
} from '../types/domain/restaurant.types.js';
import { FoodSafetyApiClient } from '../utils/api-client.js';
import { matchName, matchAddress } from '../utils/address-matcher.js';
import { withCache } from '../utils/cache-wrapper.js';
import { formatDate } from '../utils/date-formatter.js';
import { SERVICE_IDS } from '../config/constants.js';
import {
  type CacheService,
  buildCacheKey,
  CACHE_TTL,
  CACHE_PREFIX,
} from './cache.service.js';

/**
 * 행정처분 조회 결과
 */
export interface ViolationSearchResult {
  /** 조회된 행정처분 목록 */
  items: ViolationItemWithBusiness[];
  /** 전체 검색 결과 수 */
  totalCount: number;
}

/**
 * 업소 정보가 포함된 행정처분 항목
 */
export interface ViolationItemWithBusiness extends ViolationItem {
  /** 업소명 */
  businessName: string;
  /** 주소 */
  address: string;
  /** 인허가번호 */
  licenseNo?: string;
}

/**
 * 처분 내용 생성
 */
function buildViolationContent(row: I2630Row): string {
  // DSPSCN: 처분내용, DSPS_TYPECD_NM: 처분유형
  if (row.DSPSCN) {
    return row.DSPSCN;
  }
  return row.DSPS_TYPECD_NM || '';
}

/**
 * I2630Row를 ViolationItemWithBusiness로 변환
 */
function transformRow(row: I2630Row): ViolationItemWithBusiness {
  const startDate = formatDate(row.DSPS_BGNDT);
  const endDate = formatDate(row.DSPS_ENDDT);

  const result: ViolationItemWithBusiness = {
    businessName: row.PRCSCITYPOINT_BSSHNM,
    address: row.ADDR,
    licenseNo: row.LCNS_NO,
    date: formatDate(row.DSPS_DCSNDT) || '',
    type: row.DSPS_TYPECD_NM || '',
    content: buildViolationContent(row),
    reason: row.VILTCN || '', // VILTCN: 위반일자 및 위반내용
  };

  // 정지 기간이 있는 경우 추가
  if (startDate && endDate) {
    result.period = {
      start: startDate,
      end: endDate,
    };
  }

  return result;
}

/**
 * 행정처분 서비스 클래스
 */
export class ViolationService {
  private readonly client: FoodSafetyApiClient;
  private readonly cache?: CacheService;

  constructor(client: FoodSafetyApiClient, cache?: CacheService) {
    this.client = client;
    this.cache = cache;
  }

  /**
   * 업소명으로 행정처분 검색
   */
  async searchByName(
    name: string,
    region?: string,
  ): Promise<ViolationSearchResult> {
    const cacheKey = buildCacheKey(
      CACHE_PREFIX.VIOLATION,
      'search',
      name,
      region,
    );

    return withCache(
      { cache: this.cache, key: cacheKey, ttl: CACHE_TTL.VIOLATION },
      async () => {
        const response = await this.client.fetch<I2630Response>({
          serviceId: SERVICE_IDS.VIOLATION_FOOD_SERVICE,
        });

        const rows = response.I2630?.row || [];

        // 이름과 지역으로 필터링 (클라이언트 사이드)
        const filtered = rows.filter(row => {
          const nameMatch = matchName(row.PRCSCITYPOINT_BSSHNM, name);
          const regionMatch = region ? matchAddress(row.ADDR, region) : true;
          return nameMatch && regionMatch;
        });

        return {
          items: filtered.map(transformRow),
          totalCount: filtered.length,
        };
      },
    );
  }

  /**
   * 업소명과 지역으로 행정처분 조회
   * Violations 형식으로 반환
   */
  async getViolationsForRestaurant(
    name: string,
    region: string,
    limit: number = 5,
  ): Promise<ViolationHistory> {
    const cacheKey = buildCacheKey(
      CACHE_PREFIX.VIOLATION,
      'history',
      name,
      region,
      String(limit),
    );

    return withCache(
      { cache: this.cache, key: cacheKey, ttl: CACHE_TTL.VIOLATION },
      async () => {
        const result = await this.searchByName(name, region);

        // 날짜 기준 정렬 (최신순)
        const sorted = result.items.sort((a, b) => {
          return b.date.localeCompare(a.date);
        });

        const recentItems: ViolationItem[] = sorted
          .slice(0, limit)
          .map(item => ({
            date: item.date,
            type: item.type,
            content: item.content,
            reason: item.reason,
            period: item.period,
          }));

        return {
          total_count: result.totalCount,
          recent_items: recentItems,
          has_more: result.totalCount > limit,
        };
      },
    );
  }

  /**
   * 인허가번호로 행정처분 조회
   */
  async getByLicenseNo(
    licenseNo: string,
  ): Promise<ViolationItemWithBusiness[]> {
    const cacheKey = buildCacheKey(
      CACHE_PREFIX.VIOLATION,
      'license',
      licenseNo,
    );

    return withCache(
      { cache: this.cache, key: cacheKey, ttl: CACHE_TTL.VIOLATION },
      async () => {
        const response = await this.client.fetch<I2630Response>({
          serviceId: SERVICE_IDS.VIOLATION_FOOD_SERVICE,
          params: { LCNS_NO: licenseNo },
        });

        const rows = response.I2630?.row || [];
        return rows.map(transformRow);
      },
    );
  }
}

/**
 * 행정처분 서비스 인스턴스 생성
 */
export function createViolationService(
  client: FoodSafetyApiClient,
  cache?: CacheService,
): ViolationService {
  return new ViolationService(client, cache);
}
