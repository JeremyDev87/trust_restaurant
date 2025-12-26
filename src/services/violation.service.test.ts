import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ViolationService,
  createViolationService,
} from './violation.service.js';
import { FoodSafetyApiClient } from '../utils/api-client.js';
import type { I2630Response } from '../types/api/i2630.types.js';

describe('ViolationService', () => {
  let mockClient: FoodSafetyApiClient;
  let service: ViolationService;

  const mockI2630Response: I2630Response = {
    I2630: {
      total_count: '3',
      row: [
        {
          PRCSCITYPOINT_BSSHNM: '야간비행',
          ADDR: '경기도 화성시 동탄동 100',
          LCNS_NO: '111222333',
          INDUTY_CD_NM: '일반음식점',
          DSPS_TYPECD_NM: '영업정지',
          DSPSCN: '영업정지 3일',
          DSPS_DCSNDT: '20251224',
          DSPS_BGNDT: '20260105',
          DSPS_ENDDT: '20260107',
          VILTCN: '청소년에게 주류 제공',
          TEL_NO: '',
          PRSDNT_NM: '',
          LAWORD_CD_NM: '',
          PUBLIC_DT: '',
          LAST_UPDT_DTM: '',
          DSPS_INSTTCD_NM: '',
          DSPSDTLS_SEQ: '',
        },
        {
          PRCSCITYPOINT_BSSHNM: '야간비행',
          ADDR: '경기도 화성시 동탄동 100',
          LCNS_NO: '111222333',
          INDUTY_CD_NM: '일반음식점',
          DSPS_TYPECD_NM: '과태료',
          DSPSCN: '과태료 50만원',
          DSPS_DCSNDT: '20240515',
          DSPS_BGNDT: '',
          DSPS_ENDDT: '',
          VILTCN: '위생관리 미흡',
          TEL_NO: '',
          PRSDNT_NM: '',
          LAWORD_CD_NM: '',
          PUBLIC_DT: '',
          LAST_UPDT_DTM: '',
          DSPS_INSTTCD_NM: '',
          DSPSDTLS_SEQ: '',
        },
        {
          PRCSCITYPOINT_BSSHNM: '맛있는 치킨',
          ADDR: '서울특별시 강남구 역삼동 200',
          LCNS_NO: '444555666',
          INDUTY_CD_NM: '일반음식점',
          DSPS_TYPECD_NM: '시정명령',
          DSPSCN: '',
          DSPS_DCSNDT: '20241101',
          DSPS_BGNDT: '',
          DSPS_ENDDT: '',
          VILTCN: '원산지 표시 위반',
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
    mockClient = {
      fetch: vi.fn(),
    } as unknown as FoodSafetyApiClient;
    service = new ViolationService(mockClient);
  });

  describe('searchByName', () => {
    it('should filter by name', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockI2630Response);

      const result = await service.searchByName('야간비행');

      expect(result.totalCount).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items.every((item) => item.businessName === '야간비행')).toBe(
        true
      );
    });

    it('should filter by name and region', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockI2630Response);

      const result = await service.searchByName('야간비행', '화성시');

      expect(result.totalCount).toBe(2);
      expect(result.items[0].address).toContain('화성시');
    });

    it('should return empty when no match found', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockI2630Response);

      const result = await service.searchByName('존재하지않는업소');

      expect(result.totalCount).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it('should transform row correctly', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockI2630Response);

      const result = await service.searchByName('야간비행', '화성시');
      const item = result.items[0];

      expect(item.businessName).toBe('야간비행');
      expect(item.address).toBe('경기도 화성시 동탄동 100');
      expect(item.licenseNo).toBe('111222333');
      expect(item.date).toBe('2025-12-24');
      expect(item.type).toBe('영업정지');
      expect(item.content).toBe('영업정지 3일');
      expect(item.reason).toBe('청소년에게 주류 제공');
      expect(item.period).toEqual({
        start: '2026-01-05',
        end: '2026-01-07',
      });
    });

    it('should handle items without period', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockI2630Response);

      const result = await service.searchByName('맛있는 치킨', '강남구');
      const item = result.items[0];

      expect(item.period).toBeUndefined();
    });

    it('should handle empty API response', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce({
        I2630: {
          total_count: '0',
          RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
        },
      });

      const result = await service.searchByName('테스트');

      expect(result.totalCount).toBe(0);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('getViolationsForRestaurant', () => {
    it('should return Violations format', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockI2630Response);

      const result = await service.getViolationsForRestaurant('야간비행', '화성시');

      expect(result.total_count).toBe(2);
      expect(result.recent_items).toHaveLength(2);
      expect(result.has_more).toBe(false);
    });

    it('should sort by date descending', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockI2630Response);

      const result = await service.getViolationsForRestaurant('야간비행', '화성시');

      expect(result.recent_items[0].date).toBe('2025-12-24');
      expect(result.recent_items[1].date).toBe('2024-05-15');
    });

    it('should limit results', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockI2630Response);

      const result = await service.getViolationsForRestaurant(
        '야간비행',
        '화성시',
        1
      );

      expect(result.recent_items).toHaveLength(1);
      expect(result.has_more).toBe(true);
    });

    it('should exclude businessName and address from ViolationItem', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockI2630Response);

      const result = await service.getViolationsForRestaurant('야간비행', '화성시');
      const item = result.recent_items[0];

      expect(item).not.toHaveProperty('businessName');
      expect(item).not.toHaveProperty('address');
      expect(item).toHaveProperty('date');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('content');
      expect(item).toHaveProperty('reason');
    });
  });

  describe('getByLicenseNo', () => {
    it('should return violations by license number', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce({
        I2630: {
          total_count: '2',
          row: mockI2630Response.I2630.row!.slice(0, 2),
          RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
        },
      });

      const result = await service.getByLicenseNo('111222333');

      expect(result).toHaveLength(2);
      expect(mockClient.fetch).toHaveBeenCalledWith({
        serviceId: 'I2630',
        params: { LCNS_NO: '111222333' },
      });
    });

    it('should return empty array when not found', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce({
        I2630: {
          total_count: '0',
          RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
        },
      });

      const result = await service.getByLicenseNo('nonexistent');

      expect(result).toHaveLength(0);
    });
  });

  describe('date formatting', () => {
    it('should format dates correctly', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockI2630Response);

      const result = await service.searchByName('야간비행', '화성시');

      expect(result.items[0].date).toBe('2025-12-24');
      expect(result.items[0].period?.start).toBe('2026-01-05');
      expect(result.items[0].period?.end).toBe('2026-01-07');
    });

    it('should handle invalid dates', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce({
        I2630: {
          total_count: '1',
          row: [
            {
              PRCSCITYPOINT_BSSHNM: '테스트',
              ADDR: '서울시 강남구 역삼동',
              LCNS_NO: '',
              INDUTY_CD_NM: '',
              DSPS_TYPECD_NM: '과태료',
              DSPSCN: '과태료',
              DSPS_DCSNDT: '',
              DSPS_BGNDT: '',
              DSPS_ENDDT: '',
              VILTCN: '테스트',
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
      });

      const result = await service.searchByName('테스트', '강남구');

      expect(result.items[0].date).toBe('');
    });
  });

  describe('content building', () => {
    it('should build content with type and period', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockI2630Response);

      const result = await service.searchByName('야간비행', '화성시');

      expect(result.items[0].content).toBe('영업정지 3일');
      expect(result.items[1].content).toBe('과태료 50만원');
    });

    it('should handle empty period', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockI2630Response);

      const result = await service.searchByName('맛있는 치킨', '강남구');

      expect(result.items[0].content).toBe('시정명령');
    });
  });
});

describe('createViolationService', () => {
  it('should create service instance', () => {
    const mockClient = {} as FoodSafetyApiClient;
    const service = createViolationService(mockClient);

    expect(service).toBeInstanceOf(ViolationService);
  });
});
