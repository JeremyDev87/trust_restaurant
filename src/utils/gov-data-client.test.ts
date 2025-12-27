import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GovDataClient,
  GovDataApiError,
  createGovDataClient,
} from './gov-data-client.js';

describe('GovDataClient', () => {
  const originalEnv = process.env.GOV_DATA_KEY;

  beforeEach(() => {
    process.env.GOV_DATA_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env.GOV_DATA_KEY = originalEnv;
  });

  describe('constructor', () => {
    it('should throw if no API key', () => {
      process.env.GOV_DATA_KEY = '';
      expect(() => new GovDataClient()).toThrow('GOV_DATA_KEY');
    });

    it('should accept API key from constructor', () => {
      const client = new GovDataClient('custom-key');
      expect(client).toBeInstanceOf(GovDataClient);
    });

    it('should use env variable if no constructor arg', () => {
      process.env.GOV_DATA_KEY = 'env-key';
      const client = new GovDataClient();
      expect(client).toBeInstanceOf(GovDataClient);
    });
  });

  describe('buildUrl', () => {
    it('should build correct URL with params', () => {
      const client = new GovDataClient('test-key');
      const url = client.buildUrl('/B553748/TestService/getTest', {
        company: '스타벅스',
        pageNo: '1',
      });

      expect(url).toContain('apis.data.go.kr');
      expect(url).toContain('ServiceKey=test-key');
      expect(url).toContain('returnType=json');
      expect(url).toContain('company=' + encodeURIComponent('스타벅스'));
      expect(url).toContain('pageNo=1');
    });

    it('should skip empty params', () => {
      const client = new GovDataClient('test-key');
      const url = client.buildUrl('/TestService', {
        company: '',
        pageNo: '1',
      });

      expect(url).not.toContain('company=');
      expect(url).toContain('pageNo=1');
    });
  });

  describe('fetch', () => {
    it('should handle successful response', async () => {
      const mockData = { body: { items: [] } };
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const client = new GovDataClient('test-key');
      const result = await client.fetch('/TestService');

      expect(result).toEqual(mockData);
    });

    it('should throw GovDataApiError on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const client = new GovDataClient('test-key');

      await expect(client.fetch('/TestService')).rejects.toThrow(
        GovDataApiError,
      );
    });

    it('should throw GovDataApiError on network error', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const client = new GovDataClient('test-key');

      await expect(client.fetch('/TestService')).rejects.toThrow(
        GovDataApiError,
      );
    });
  });
});

describe('GovDataApiError', () => {
  it('should store error code', () => {
    const error = new GovDataApiError('Test error', 'TEST_CODE', 500);

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('GovDataApiError');
  });
});

describe('createGovDataClient', () => {
  const originalEnv = process.env.GOV_DATA_KEY;

  afterEach(() => {
    process.env.GOV_DATA_KEY = originalEnv;
  });

  it('should create client instance', () => {
    process.env.GOV_DATA_KEY = 'test-key';
    const client = createGovDataClient();
    expect(client).toBeInstanceOf(GovDataClient);
  });

  it('should accept custom API key', () => {
    const client = createGovDataClient('custom-key');
    expect(client).toBeInstanceOf(GovDataClient);
  });
});
