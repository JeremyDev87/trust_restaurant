import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FoodSafetyApiClient,
  ApiError,
  createApiClient,
} from './api-client.js';
import { API_CONFIG, SERVICE_IDS } from '../config/constants.js';

describe('FoodSafetyApiClient', () => {
  const TEST_API_KEY = 'test-api-key';

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should create client with provided API key', () => {
      const client = new FoodSafetyApiClient(TEST_API_KEY);
      expect(client).toBeInstanceOf(FoodSafetyApiClient);
    });

    it('should throw error when API key is missing', () => {
      const originalEnv = process.env.FOOD_API_KEY;
      delete process.env.FOOD_API_KEY;

      expect(() => new FoodSafetyApiClient()).toThrow('API key is required');

      process.env.FOOD_API_KEY = originalEnv;
    });

    it('should use environment variable if no key provided', () => {
      process.env.FOOD_API_KEY = 'env-api-key';
      const client = new FoodSafetyApiClient();
      expect(client).toBeInstanceOf(FoodSafetyApiClient);
    });
  });

  describe('buildUrl', () => {
    it('should build basic URL with defaults', () => {
      const client = new FoodSafetyApiClient(TEST_API_KEY);
      const url = client.buildUrl({ serviceId: 'C004' });

      expect(url).toBe(
        `${API_CONFIG.BASE_URL}/${TEST_API_KEY}/C004/json/1/${API_CONFIG.MAX_RESULTS}`,
      );
    });

    it('should build URL with custom indices', () => {
      const client = new FoodSafetyApiClient(TEST_API_KEY);
      const url = client.buildUrl({
        serviceId: 'C004',
        startIdx: 1,
        endIdx: 10,
      });

      expect(url).toBe(`${API_CONFIG.BASE_URL}/${TEST_API_KEY}/C004/json/1/10`);
    });

    it('should build URL with params', () => {
      const client = new FoodSafetyApiClient(TEST_API_KEY);
      const url = client.buildUrl({
        serviceId: 'C004',
        startIdx: 1,
        endIdx: 10,
        params: { UPSO_NM: '스타벅스' },
      });

      expect(url).toContain('UPSO_NM=%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4');
    });

    it('should ignore empty params', () => {
      const client = new FoodSafetyApiClient(TEST_API_KEY);
      const url = client.buildUrl({
        serviceId: 'C004',
        params: { UPSO_NM: '', HG_ASGN_LV: '매우우수' },
      });

      expect(url).not.toContain('UPSO_NM=');
      expect(url).toContain('HG_ASGN_LV=');
    });
  });

  describe('fetch', () => {
    it('should fetch and parse JSON response', async () => {
      const mockResponse = {
        C004: {
          total_count: '1',
          row: [{ BSSH_NM: '테스트식당' }],
          RESULT: { CODE: 'INFO-000', MSG: '정상처리되었습니다.' },
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const client = new FoodSafetyApiClient(TEST_API_KEY);
      const result = await client.fetch({ serviceId: 'C004' });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw ApiError on HTTP error', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const client = new FoodSafetyApiClient(TEST_API_KEY);

      await expect(client.fetch({ serviceId: 'C004' })).rejects.toThrow(
        ApiError,
      );
      await expect(client.fetch({ serviceId: 'C004' })).rejects.toMatchObject({
        code: 'HTTP_ERROR',
      });
    });

    it('should throw ApiError on API error response', async () => {
      const mockResponse = {
        C004: {
          RESULT: { CODE: 'ERROR-300', MSG: '인증 오류' },
        },
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const client = new FoodSafetyApiClient(TEST_API_KEY);

      await expect(client.fetch({ serviceId: 'C004' })).rejects.toThrow(
        ApiError,
      );
      await expect(client.fetch({ serviceId: 'C004' })).rejects.toMatchObject({
        code: 'ERROR-300',
      });
    });

    it('should throw ApiError on network error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const client = new FoodSafetyApiClient(TEST_API_KEY);

      await expect(client.fetch({ serviceId: 'C004' })).rejects.toThrow(
        ApiError,
      );
      await expect(client.fetch({ serviceId: 'C004' })).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
      });
    });
  });
});

describe('createApiClient', () => {
  it('should create client with provided key', () => {
    const client = createApiClient('my-key');
    expect(client).toBeInstanceOf(FoodSafetyApiClient);
  });
});

describe('ApiError', () => {
  it('should create error with code', () => {
    const error = new ApiError('Test error', 'TEST_CODE');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('ApiError');
  });

  it('should create error with status code', () => {
    const error = new ApiError('HTTP error', 'HTTP_ERROR', 500);
    expect(error.statusCode).toBe(500);
  });
});
