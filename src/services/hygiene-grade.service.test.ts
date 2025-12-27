import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  HygieneGradeService,
  createHygieneGradeService,
} from './hygiene-grade.service.js';
import { FoodSafetyApiClient } from '../utils/api-client.js';
import type { C004Response } from '../types/api/food-safety/c004.types.js';

describe('HygieneGradeService', () => {
  let mockClient: FoodSafetyApiClient;
  let service: HygieneGradeService;

  const mockC004Response: C004Response = {
    C004: {
      total_count: '2',
      row: [
        {
          BSSH_NM: '스타벅스 강남점',
          ADDR: '서울특별시 강남구 역삼동 123-45',
          LCNS_NO: '123456789',
          INDUTY_NM: '휴게음식점',
          HG_ASGN_LV: '매우우수',
          ASGN_FROM: '20240115',
          ASGN_TO: '20260114',
        },
        {
          BSSH_NM: '스타벅스 종로점',
          ADDR: '서울특별시 종로구 종로3가 100',
          LCNS_NO: '987654321',
          INDUTY_NM: '휴게음식점',
          HG_ASGN_LV: '우수',
          ASGN_FROM: '20240301',
          ASGN_TO: '20260228',
        },
      ],
      RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
    },
  };

  beforeEach(() => {
    mockClient = {
      fetch: vi.fn(),
    } as unknown as FoodSafetyApiClient;
    service = new HygieneGradeService(mockClient);
  });

  describe('searchByName', () => {
    it('should return all matching results without region filter', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockC004Response);

      const result = await service.searchByName('스타벅스');

      expect(result.totalCount).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(mockClient.fetch).toHaveBeenCalledWith({
        serviceId: 'C004',
        params: { UPSO_NM: '스타벅스' },
      });
    });

    it('should filter by region when provided', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockC004Response);

      const result = await service.searchByName('스타벅스', '강남구');

      expect(result.totalCount).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('스타벅스 강남점');
    });

    it('should transform row to HygieneGradeItem correctly', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockC004Response);

      const result = await service.searchByName('스타벅스', '강남구');
      const item = result.items[0];

      expect(item.name).toBe('스타벅스 강남점');
      expect(item.address).toBe('서울특별시 강남구 역삼동 123-45');
      expect(item.licenseNo).toBe('123456789');
      expect(item.businessType).toBe('휴게음식점');
      expect(item.hygieneGrade).toEqual({
        has_grade: true,
        grade: 'AAA',
        grade_label: '매우 우수',
        grade_date: '2024-01-15',
        valid_until: '2026-01-14',
        stars: 3,
      });
    });

    it('should handle empty response', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce({
        C004: {
          total_count: '0',
          RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
        },
      });

      const result = await service.searchByName('존재하지않는식당');

      expect(result.totalCount).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it('should handle different grade levels', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockC004Response);

      const result = await service.searchByName('스타벅스', '종로구');
      const item = result.items[0];

      expect(item.hygieneGrade.grade).toBe('AA');
      expect(item.hygieneGrade.grade_label).toBe('우수');
      expect(item.hygieneGrade.stars).toBe(2);
    });
  });

  describe('findExactMatch', () => {
    it('should find exact matching restaurant', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockC004Response);

      const result = await service.findExactMatch('스타벅스 강남점', '강남구');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('스타벅스 강남점');
      expect(result!.hygieneGrade.grade).toBe('AAA');
    });

    it('should return null when no exact match found', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockC004Response);

      const result = await service.findExactMatch('스타벅스 역삼점', '강남구');

      expect(result).toBeNull();
    });

    it('should match partial name', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockC004Response);

      const result = await service.findExactMatch('스타벅스', '강남구');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('스타벅스 강남점');
    });
  });

  describe('getByLicenseNo', () => {
    it('should return item by license number', async () => {
      const singleResponse: C004Response = {
        C004: {
          total_count: '1',
          row: [mockC004Response.C004.row![0]],
          RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
        },
      };
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(singleResponse);

      const result = await service.getByLicenseNo('123456789');

      expect(result).not.toBeNull();
      expect(result!.licenseNo).toBe('123456789');
      expect(mockClient.fetch).toHaveBeenCalledWith({
        serviceId: 'C004',
        params: { LCNS_NO: '123456789' },
      });
    });

    it('should return null when license not found', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce({
        C004: {
          total_count: '0',
          RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
        },
      });

      const result = await service.getByLicenseNo('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('date formatting', () => {
    it('should format dates correctly', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockC004Response);

      const result = await service.searchByName('스타벅스', '강남구');

      expect(result.items[0].hygieneGrade.grade_date).toBe('2024-01-15');
      expect(result.items[0].hygieneGrade.valid_until).toBe('2026-01-14');
    });

    it('should handle missing dates', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce({
        C004: {
          total_count: '1',
          row: [
            {
              BSSH_NM: '테스트 식당',
              ADDR: '서울특별시 강남구 역삼동 1',
              LCNS_NO: '111',
              INDUTY_NM: '일반음식점',
              HG_ASGN_LV: '좋음',
              ASGN_FROM: '',
              ASGN_TO: '',
            },
          ],
          RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
        },
      });

      const result = await service.searchByName('테스트', '강남구');

      expect(result.items[0].hygieneGrade.grade_date).toBeNull();
      expect(result.items[0].hygieneGrade.valid_until).toBeNull();
    });
  });

  describe('unknown grade handling', () => {
    it('should handle unknown grade level', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce({
        C004: {
          total_count: '1',
          row: [
            {
              BSSH_NM: '테스트 식당',
              ADDR: '서울특별시 강남구 역삼동 1',
              LCNS_NO: '111',
              INDUTY_NM: '일반음식점',
              HG_ASGN_LV: '알수없음',
              ASGN_FROM: '20240101',
              ASGN_TO: '20251231',
            },
          ],
          RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
        },
      });

      const result = await service.searchByName('테스트', '강남구');

      expect(result.items[0].hygieneGrade).toEqual({
        has_grade: false,
        grade: null,
        grade_label: null,
        grade_date: null,
        valid_until: null,
        stars: 0,
      });
    });
  });
});

describe('createHygieneGradeService', () => {
  it('should create service instance', () => {
    const mockClient = {} as FoodSafetyApiClient;
    const service = createHygieneGradeService(mockClient);

    expect(service).toBeInstanceOf(HygieneGradeService);
  });
});
