/**
 * 전체 워크플로우 통합 테스트
 *
 * 검색 -> 추천 -> 비교 전체 흐름을 테스트합니다.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FoodSafetyApiClient } from '../../src/utils/api-client.js';
import { HygieneGradeService } from '../../src/services/hygiene-grade.service.js';
import { ViolationService } from '../../src/services/violation.service.js';
import type { C004Response } from '../../src/types/api/c004.types.js';
import type { I2630Response } from '../../src/types/api/i2630.types.js';

describe('Full Workflow Integration', () => {
  let foodApiClient: FoodSafetyApiClient;
  let hygieneService: HygieneGradeService;
  let violationService: ViolationService;

  // Mock 응답 데이터
  const mockC004Response: C004Response = {
    C004: {
      total_count: '3',
      row: [
        {
          BSSH_NM: '맛있는 한식당 본점',
          ADDR: '서울특별시 강남구 역삼동 123-1',
          LCNS_NO: '20200101001',
          INDUTY_NM: '일반음식점',
          HG_ASGN_LV: '매우우수',
          ASGN_FROM: '20240101',
          ASGN_TO: '20260101',
        },
        {
          BSSH_NM: '맛있는 한식당 2호점',
          ADDR: '서울특별시 강남구 역삼동 123-2',
          LCNS_NO: '20200101002',
          INDUTY_NM: '일반음식점',
          HG_ASGN_LV: '우수',
          ASGN_FROM: '20240201',
          ASGN_TO: '20260201',
        },
        {
          BSSH_NM: '맛있는 한식당 3호점',
          ADDR: '서울특별시 강남구 역삼동 123-3',
          LCNS_NO: '20200101003',
          INDUTY_NM: '일반음식점',
          HG_ASGN_LV: '좋음',
          ASGN_FROM: '20240301',
          ASGN_TO: '20260301',
        },
      ],
      RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
    },
  };

  const mockI2630ResponseEmpty: I2630Response = {
    I2630: {
      total_count: '0',
      RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
    },
  };

  const mockI2630ResponseWithViolations: I2630Response = {
    I2630: {
      total_count: '1',
      row: [
        {
          PRCSCITYPOINT_BSSHNM: '맛있는 한식당 2호점',
          ADDR: '서울특별시 강남구 역삼동 123-2',
          LCNS_NO: '20200101002',
          INDUTY_CD_NM: '일반음식점',
          DSPS_TYPECD_NM: '시정명령',
          DSPSCN: '시정명령',
          DSPS_DCSNDT: '20230601',
          DSPS_BGNDT: '20230605',
          DSPS_ENDDT: '20230615',
          VILTCN: '(20230515)위생관리 미흡',
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

    foodApiClient = new FoodSafetyApiClient();
    hygieneService = new HygieneGradeService(foodApiClient);
    violationService = new ViolationService(foodApiClient);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.FOOD_API_KEY;
  });

  describe('검색 -> 위생정보 조회 워크플로우', () => {
    it('지역 검색 후 위생정보를 조회한다', async () => {
      // C004 API 호출 mock
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockC004Response,
      } as Response);

      // 1. 지역 내 식당 위생등급 검색
      const searchResult = await hygieneService.searchByName('맛있는 한식당', '강남구');

      expect(searchResult.totalCount).toBe(3);
      expect(searchResult.items.length).toBe(3);

      // 각 등급 확인
      expect(searchResult.items[0].hygieneGrade.grade).toBe('AAA');
      expect(searchResult.items[1].hygieneGrade.grade).toBe('AA');
      expect(searchResult.items[2].hygieneGrade.grade).toBe('A');
    });

    it('검색된 식당들의 행정처분 이력을 조회한다', async () => {
      // 첫 번째 식당 - 행정처분 없음
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockI2630ResponseEmpty,
      } as Response);

      const violations1 = await violationService.getViolationsForRestaurant(
        '맛있는 한식당 본점',
        '역삼동',
      );
      expect(violations1.total_count).toBe(0);

      // 두 번째 식당 - 행정처분 있음
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockI2630ResponseWithViolations,
      } as Response);

      const violations2 = await violationService.getViolationsForRestaurant(
        '맛있는 한식당 2호점',
        '역삼동',
      );
      expect(violations2.total_count).toBe(1);
      expect(violations2.recent_items[0].type).toBe('시정명령');
    });
  });

  describe('위생등급 비교 워크플로우', () => {
    it('여러 식당의 위생등급을 비교한다', async () => {
      // 모든 식당 위생등급 조회
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockC004Response,
      } as Response);

      const searchResult = await hygieneService.searchByName('맛있는 한식당', '강남구');

      // 등급별 분류
      const gradeAAA = searchResult.items.filter((r) => r.hygieneGrade.grade === 'AAA');
      const gradeAA = searchResult.items.filter((r) => r.hygieneGrade.grade === 'AA');
      const gradeA = searchResult.items.filter((r) => r.hygieneGrade.grade === 'A');

      expect(gradeAAA.length).toBe(1);
      expect(gradeAA.length).toBe(1);
      expect(gradeA.length).toBe(1);

      // AAA 등급 식당 정보 확인
      expect(gradeAAA[0].name).toBe('맛있는 한식당 본점');
      expect(gradeAAA[0].hygieneGrade.stars).toBe(3);
    });
  });

  describe('필터링 워크플로우', () => {
    it('위생등급이 있는 식당만 필터링한다', async () => {
      const responseWithMixed: C004Response = {
        C004: {
          total_count: '3',
          row: [
            {
              BSSH_NM: '좋은 식당',
              ADDR: '서울특별시 강남구 역삼동 1',
              LCNS_NO: '111',
              INDUTY_NM: '일반음식점',
              HG_ASGN_LV: '매우우수',
              ASGN_FROM: '20240101',
              ASGN_TO: '20260101',
            },
            {
              BSSH_NM: '보통 식당',
              ADDR: '서울특별시 강남구 역삼동 2',
              LCNS_NO: '222',
              INDUTY_NM: '일반음식점',
              HG_ASGN_LV: '', // 등급 없음
              ASGN_FROM: '',
              ASGN_TO: '',
            },
            {
              BSSH_NM: '괜찮은 식당',
              ADDR: '서울특별시 강남구 역삼동 3',
              LCNS_NO: '333',
              INDUTY_NM: '일반음식점',
              HG_ASGN_LV: '우수',
              ASGN_FROM: '20240201',
              ASGN_TO: '20260201',
            },
          ],
          RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithMixed,
      } as Response);

      const searchResult = await hygieneService.searchByName('식당', '역삼동');

      // 등급이 있는 식당 필터링
      const withGrade = searchResult.items.filter((r) => r.hygieneGrade.has_grade);
      const withoutGrade = searchResult.items.filter((r) => !r.hygieneGrade.has_grade);

      expect(withGrade.length).toBe(2);
      expect(withoutGrade.length).toBe(1);
    });
  });
});

describe('서비스 간 연동 테스트', () => {
  let foodApiClient: FoodSafetyApiClient;
  let hygieneService: HygieneGradeService;
  let violationService: ViolationService;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    process.env.FOOD_API_KEY = 'test-api-key';

    foodApiClient = new FoodSafetyApiClient();
    hygieneService = new HygieneGradeService(foodApiClient);
    violationService = new ViolationService(foodApiClient);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.FOOD_API_KEY;
  });

  describe('HygieneGradeService + ViolationService 연동', () => {
    it('위생등급과 위반 이력을 순차적으로 조회한다', async () => {
      // C004 위생등급 조회
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          C004: {
            total_count: '1',
            row: [
              {
                BSSH_NM: '테스트 식당',
                ADDR: '서울특별시 강남구 역삼동 123',
                LCNS_NO: '20200101001',
                INDUTY_NM: '일반음식점',
                HG_ASGN_LV: '매우우수',
                ASGN_FROM: '20240101',
                ASGN_TO: '20260101',
              },
            ],
            RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
          },
        }),
      } as Response);

      // 위생등급 조회
      const hygieneResult = await hygieneService.findExactMatch('테스트 식당', '강남구');
      expect(hygieneResult).not.toBeNull();
      expect(hygieneResult!.hygieneGrade.grade).toBe('AAA');

      // I2630 위반 이력 조회
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          I2630: {
            total_count: '1',
            row: [
              {
                PRCSCITYPOINT_BSSHNM: '테스트 식당',
                ADDR: '서울특별시 강남구 역삼동 123',
                LCNS_NO: '20200101001',
                INDUTY_CD_NM: '일반음식점',
                DSPS_TYPECD_NM: '시정명령',
                DSPSCN: '시정명령',
                DSPS_DCSNDT: '20230601',
                DSPS_BGNDT: '20230605',
                DSPS_ENDDT: '20230615',
                VILTCN: '(20230515)위생관리 미흡',
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
        }),
      } as Response);

      // 위반 이력 조회
      const violationResult = await violationService.getViolationsForRestaurant(
        '테스트 식당',
        '강남구',
      );
      expect(violationResult.total_count).toBe(1);
      expect(violationResult.recent_items.length).toBe(1);
      expect(violationResult.recent_items[0].type).toBe('시정명령');
    });

    it('위생등급 AAA + 행정처분 없는 깨끗한 식당 식별', async () => {
      // C004 위생등급 조회
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          C004: {
            total_count: '1',
            row: [
              {
                BSSH_NM: '깨끗한 식당',
                ADDR: '서울특별시 강남구 역삼동 100',
                LCNS_NO: '20200101001',
                INDUTY_NM: '일반음식점',
                HG_ASGN_LV: '매우우수',
                ASGN_FROM: '20240101',
                ASGN_TO: '20260101',
              },
            ],
            RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
          },
        }),
      } as Response);

      const hygieneResult = await hygieneService.findExactMatch('깨끗한 식당', '역삼동');

      // I2630 위반 이력 조회 - 없음
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          I2630: {
            total_count: '0',
            RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
          },
        }),
      } as Response);

      const violationResult = await violationService.getViolationsForRestaurant(
        '깨끗한 식당',
        '역삼동',
      );

      // 깨끗한 식당 판별
      const isClean =
        hygieneResult?.hygieneGrade.grade === 'AAA' && violationResult.total_count === 0;

      expect(isClean).toBe(true);
    });
  });

  describe('에러 처리 연동', () => {
    it('API 에러 시에도 다른 조회는 계속된다', async () => {
      // 첫 번째 조회 성공
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          C004: {
            total_count: '1',
            row: [
              {
                BSSH_NM: '성공 식당',
                ADDR: '서울특별시 강남구 역삼동 1',
                LCNS_NO: '111',
                INDUTY_NM: '일반음식점',
                HG_ASGN_LV: '매우우수',
                ASGN_FROM: '20240101',
                ASGN_TO: '20260101',
              },
            ],
            RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
          },
        }),
      } as Response);

      const result1 = await hygieneService.findExactMatch('성공 식당', '역삼동');
      expect(result1).not.toBeNull();

      // 두 번째 조회 실패
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          C004: {
            total_count: '0',
            RESULT: { CODE: 'INFO-200', MSG: '해당하는 데이터가 없습니다.' },
          },
        }),
      } as Response);

      const result2 = await hygieneService.findExactMatch('없는 식당', '역삼동');
      expect(result2).toBeNull();

      // 세 번째 조회 다시 성공
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          C004: {
            total_count: '1',
            row: [
              {
                BSSH_NM: '다른 성공 식당',
                ADDR: '서울특별시 강남구 역삼동 2',
                LCNS_NO: '222',
                INDUTY_NM: '일반음식점',
                HG_ASGN_LV: '우수',
                ASGN_FROM: '20240201',
                ASGN_TO: '20260201',
              },
            ],
            RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
          },
        }),
      } as Response);

      const result3 = await hygieneService.findExactMatch('다른 성공 식당', '역삼동');
      expect(result3).not.toBeNull();
      expect(result3!.hygieneGrade.grade).toBe('AA');
    });
  });
});
