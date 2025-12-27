import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HaccpService, createHaccpService } from './haccp.service.js';
import { GovDataClient } from '../utils/gov-data-client.js';
import type { HaccpApiResponse } from '../types/api/gov-data/haccp.types.js';

describe('HaccpService', () => {
  let mockClient: GovDataClient;
  let service: HaccpService;

  // 2030년까지 유효한 인증
  const futureDate = '2030-12-31';

  const mockResponse: HaccpApiResponse = {
    header: { resultCode: '00', resultMessage: 'NORMAL SERVICE' },
    body: {
      numOfRows: '10',
      pageNo: '1',
      totalCount: '1',
      items: {
        item: {
          appointno: '2020-6-0001',
          productGb: '식품',
          company: '스타벅스코리아',
          companyNo: '123-45-67890',
          ceoname: '홍길동',
          worksaddr: '서울특별시 중구 세종대로 100',
          area1: '서울특별시',
          area2: '중구',
          companykindNm: '식품제조업',
          businesstypeNm: '커피',
          issuedate: '2020-01-15',
          issueenddate: futureDate,
        },
      },
    },
  };

  const mockEmptyResponse: HaccpApiResponse = {
    header: { resultCode: '00', resultMessage: 'NORMAL SERVICE' },
    body: { numOfRows: '10', pageNo: '1', totalCount: '0' },
  };

  beforeEach(() => {
    mockClient = { fetch: vi.fn() } as unknown as GovDataClient;
    service = new HaccpService(mockClient);
  });

  describe('searchByName', () => {
    it('should return certification info when found', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockResponse);

      const result = await service.searchByName('스타벅스');

      expect(result.totalCount).toBe(1);
      expect(result.items[0].company).toBe('스타벅스코리아');
      expect(result.items[0].isCertified).toBe(true);
    });

    it('should return empty when not found', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockEmptyResponse);

      const result = await service.searchByName('존재하지않는업체');

      expect(result.totalCount).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it('should handle multiple items', async () => {
      const multiResponse: HaccpApiResponse = {
        header: { resultCode: '00', resultMessage: 'NORMAL SERVICE' },
        body: {
          numOfRows: '10',
          pageNo: '1',
          totalCount: '2',
          items: {
            item: [
              { ...mockResponse.body.items!.item as object, company: '업체1' },
              { ...mockResponse.body.items!.item as object, company: '업체2' },
            ] as HaccpApiResponse['body']['items']['item'],
          },
        },
      };
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(multiResponse);

      const result = await service.searchByName('업체');

      expect(result.totalCount).toBe(2);
      expect(result.items).toHaveLength(2);
    });

    it('should pass pagination params', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockEmptyResponse);

      await service.searchByName('테스트', { pageNo: 2, numOfRows: 20 });

      expect(mockClient.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          company: '테스트',
          pageNo: '2',
          numOfRows: '20',
        }),
      );
    });
  });

  describe('isCompanyCertified', () => {
    it('should return true for certified company', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockResponse);

      const result = await service.isCompanyCertified('스타벅스');

      expect(result).toBe(true);
    });

    it('should return false for non-certified company', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockEmptyResponse);

      const result = await service.isCompanyCertified('미인증업체');

      expect(result).toBe(false);
    });

    it('should use numOfRows=1 for efficiency', async () => {
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(mockEmptyResponse);

      await service.isCompanyCertified('테스트');

      expect(mockClient.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ numOfRows: '1' }),
      );
    });
  });

  describe('certification expiration', () => {
    it('should mark expired certification as not certified', async () => {
      const expiredResponse: HaccpApiResponse = {
        ...mockResponse,
        body: {
          ...mockResponse.body,
          items: {
            item: {
              ...(mockResponse.body.items!.item as object),
              issueenddate: '2020-01-01', // 과거 날짜
            } as HaccpApiResponse['body']['items']['item'],
          },
        },
      };
      vi.mocked(mockClient.fetch).mockResolvedValueOnce(expiredResponse);

      const result = await service.searchByName('만료업체');

      expect(result.items[0].isCertified).toBe(false);
    });
  });
});

describe('createHaccpService', () => {
  it('should create service with custom client', () => {
    const mockClient = { fetch: vi.fn() } as unknown as GovDataClient;
    const service = createHaccpService(mockClient);

    expect(service).toBeInstanceOf(HaccpService);
  });
});
