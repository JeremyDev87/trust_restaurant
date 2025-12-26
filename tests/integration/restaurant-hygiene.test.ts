/**
 * 식당 위생 정보 조회 통합 테스트
 *
 * 실제 API를 호출하지 않고 전체 플로우를 테스트합니다.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FoodSafetyApiClient } from '../../src/utils/api-client.js';
import { HygieneGradeService } from '../../src/services/hygiene-grade.service.js';
import { ViolationService } from '../../src/services/violation.service.js';
import type { C004Response } from '../../src/types/api/c004.types.js';
import type { I2630Response } from '../../src/types/api/i2630.types.js';

describe('Restaurant Hygiene Integration', () => {
  let client: FoodSafetyApiClient;
  let hygieneService: HygieneGradeService;
  let violationService: ViolationService;

  // Mock C004 응답
  const mockC004Response: C004Response = {
    C004: {
      total_count: '1',
      row: [
        {
          BSSH_NM: '스타벅스 강남역점',
          ADDR: '서울특별시 강남구 역삼동 123-45',
          LCNS_NO: '20200123456',
          INDUTY_NM: '휴게음식점',
          HG_ASGN_LV: '매우우수',
          ASGN_FROM: '20240115',
          ASGN_TO: '20260114',
        },
      ],
      RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
    },
  };

  // Mock I2630 응답 (위반 없음)
  const mockI2630ResponseEmpty: I2630Response = {
    I2630: {
      total_count: '0',
      RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
    },
  };

  // Mock I2630 응답 (위반 있음)
  const mockI2630ResponseWithViolation: I2630Response = {
    I2630: {
      total_count: '1',
      row: [
        {
          PRCSCITYPOINT_BSSHNM: '문제있는 식당',
          ADDR: '서울특별시 종로구 종로3가 100',
          LCNS_NO: '20190012345',
          INDUTY_CD_NM: '일반음식점',
          DSPS_TYPECD_NM: '영업정지',
          DSPSCN: '영업정지 7일',
          DSPS_DCSNDT: '20241201',
          DSPS_BGNDT: '20241210',
          DSPS_ENDDT: '20241216',
          VILTCN: '(20241115)위생관리 불량',
          TEL_NO: '',
          PRSDNT_NM: '',
          LAWORD_CD_NM: '',
          PUBLIC_DT: '',
          LAST_UPDT_DTM: '',
          DSPS_INSTTCD_NM: '',
          DSPSDTLS_SEQ: '',
        },
      ],
      RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
    },
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    process.env.FOOD_API_KEY = 'test-api-key';

    client = new FoodSafetyApiClient();
    hygieneService = new HygieneGradeService(client);
    violationService = new ViolationService(client);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.FOOD_API_KEY;
  });

  describe('시나리오: 위생등급 보유 + 행정처분 없음', () => {
    it('식당 정보를 성공적으로 조회한다', async () => {
      // C004 API 호출
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockC004Response,
      } as Response);

      const result = await hygieneService.findExactMatch('스타벅스', '강남구');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('스타벅스 강남역점');
      expect(result!.hygieneGrade.has_grade).toBe(true);
      expect(result!.hygieneGrade.grade).toBe('AAA');
      expect(result!.hygieneGrade.stars).toBe(3);
    });

    it('행정처분 조회 결과가 비어있다', async () => {
      // I2630 API 호출
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockI2630ResponseEmpty,
      } as Response);

      const result = await violationService.getViolationsForRestaurant(
        '스타벅스 강남역점',
        '강남구'
      );

      expect(result.total_count).toBe(0);
      expect(result.recent_items).toHaveLength(0);
      expect(result.has_more).toBe(false);
    });
  });

  describe('시나리오: 행정처분 이력 있음', () => {
    it('행정처분 정보를 정확히 파싱한다', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockI2630ResponseWithViolation,
      } as Response);

      const result = await violationService.getViolationsForRestaurant(
        '문제있는 식당',
        '종로구'
      );

      expect(result.total_count).toBe(1);
      expect(result.recent_items).toHaveLength(1);

      const violation = result.recent_items[0];
      expect(violation.date).toBe('2024-12-01');
      expect(violation.type).toBe('영업정지');
      expect(violation.content).toBe('영업정지 7일');
      expect(violation.reason).toBe('(20241115)위생관리 불량');
      expect(violation.period).toEqual({
        start: '2024-12-10',
        end: '2024-12-16',
      });
    });
  });

  describe('시나리오: 검색 결과 없음', () => {
    it('위생등급이 없는 식당은 null을 반환한다', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          C004: {
            total_count: '0',
            RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
          },
        }),
      } as Response);

      const result = await hygieneService.findExactMatch(
        '존재하지않는식당',
        '강남구'
      );

      expect(result).toBeNull();
    });
  });

  describe('시나리오: 복수 검색 결과', () => {
    it('여러 식당이 검색되면 모두 반환한다', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          C004: {
            total_count: '3',
            row: [
              {
                BSSH_NM: '맛있는 마라탕 본점',
                ADDR: '서울특별시 강남구 역삼동 1',
                LCNS_NO: '111',
                INDUTY_NM: '일반음식점',
                HG_ASGN_LV: '매우우수',
                ASGN_FROM: '20240101',
                ASGN_TO: '20251231',
              },
              {
                BSSH_NM: '맛있는 마라탕 2호점',
                ADDR: '서울특별시 강남구 삼성동 2',
                LCNS_NO: '222',
                INDUTY_NM: '일반음식점',
                HG_ASGN_LV: '우수',
                ASGN_FROM: '20240201',
                ASGN_TO: '20260131',
              },
              {
                BSSH_NM: '맛있는 마라탕 3호점',
                ADDR: '서울특별시 강남구 청담동 3',
                LCNS_NO: '333',
                INDUTY_NM: '일반음식점',
                HG_ASGN_LV: '좋음',
                ASGN_FROM: '20240301',
                ASGN_TO: '20260228',
              },
            ],
            RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
          },
        }),
      } as Response);

      const result = await hygieneService.searchByName('맛있는 마라탕', '강남구');

      expect(result.totalCount).toBe(3);
      expect(result.items).toHaveLength(3);
      expect(result.items[0].name).toBe('맛있는 마라탕 본점');
      expect(result.items[1].hygieneGrade.grade).toBe('AA');
      expect(result.items[2].hygieneGrade.grade).toBe('A');
    });
  });

  describe('시나리오: 지역 필터링', () => {
    it('지역으로 결과를 필터링한다', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          C004: {
            total_count: '2',
            row: [
              {
                BSSH_NM: '스타벅스 강남역점',
                ADDR: '서울특별시 강남구 역삼동 123',
                LCNS_NO: '111',
                INDUTY_NM: '휴게음식점',
                HG_ASGN_LV: '매우우수',
                ASGN_FROM: '20240101',
                ASGN_TO: '20251231',
              },
              {
                BSSH_NM: '스타벅스 종로점',
                ADDR: '서울특별시 종로구 종로3가 456',
                LCNS_NO: '222',
                INDUTY_NM: '휴게음식점',
                HG_ASGN_LV: '우수',
                ASGN_FROM: '20240201',
                ASGN_TO: '20260131',
              },
            ],
            RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
          },
        }),
      } as Response);

      const result = await hygieneService.searchByName('스타벅스', '강남구');

      expect(result.totalCount).toBe(1);
      expect(result.items[0].name).toBe('스타벅스 강남역점');
    });
  });
});
