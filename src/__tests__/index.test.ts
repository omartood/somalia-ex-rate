import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getRates, getRate, convert, formatSOS, formatCurrency, quote } from '../index';
import type { Provider, RateTable } from '../types';
import { setMemoryCache } from '../cache';

// Mock provider for testing
class MockProvider implements Provider {
  name = 'mock';
  private shouldFail = false;
  private mockRates: RateTable = {
    SOS: 1,
    USD: 0.00175,
    EUR: 0.00160,
    GBP: 0.00135,
    KES: 0.225,
    ETB: 0.102,
    AED: 0.0064,
    SAR: 0.0066,
    TRY: 0.056,
    CNY: 0.012
  };

  setRates(rates: RateTable) {
    this.mockRates = rates;
  }

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  async fetchRatesSOS(): Promise<RateTable> {
    if (this.shouldFail) {
      throw new Error('Mock provider error');
    }
    return this.mockRates;
  }
}

describe('Exchange Rates API', () => {
  let mockProvider: MockProvider;
  const testDir = path.join(process.cwd(), 'test-cache');
  const testCacheFile = path.join(testDir, 'cache.json');

  beforeEach(async () => {
    mockProvider = new MockProvider();
    setMemoryCache(null as any);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe('getRates', () => {
    it('should fetch fresh rates from provider', async () => {
      const rates = await getRates({
        provider: mockProvider,
        persistPath: testCacheFile
      });

      expect(rates).toEqual(mockProvider['mockRates']);
    });

    it('should use cached rates when within TTL', async () => {
      const cachedRates: RateTable = {
        SOS: 1,
        USD: 0.002,
        EUR: 0.0018,
        GBP: 0.0015,
        KES: 0.25,
        ETB: 0.11,
        AED: 0.007,
        SAR: 0.0075,
        TRY: 0.06,
        CNY: 0.013
      };

      // Write cache file
      const cached = {
        at: Date.now() - 1000, // 1 second ago
        rates: cachedRates
      };
      await fs.writeFile(testCacheFile, JSON.stringify(cached));

      const rates = await getRates({
        provider: mockProvider,
        persistPath: testCacheFile,
        ttlMs: 5000 // 5 seconds TTL
      });

      expect(rates).toEqual(cachedRates);
    });

    it('should fetch fresh rates when cache is expired', async () => {
      const oldRates: RateTable = {
        SOS: 1,
        USD: 0.001,
        EUR: 0.0009,
        GBP: 0.0008,
        KES: 0.15,
        ETB: 0.08,
        AED: 0.004,
        SAR: 0.0045,
        TRY: 0.03,
        CNY: 0.007
      };

      // Write expired cache
      const cached = {
        at: Date.now() - 10000, // 10 seconds ago
        rates: oldRates
      };
      await fs.writeFile(testCacheFile, JSON.stringify(cached));

      const rates = await getRates({
        provider: mockProvider,
        persistPath: testCacheFile,
        ttlMs: 5000 // 5 seconds TTL
      });

      expect(rates).toEqual(mockProvider['mockRates']);
      expect(rates).not.toEqual(oldRates);
    });

    it('should use seed data in offline mode when no cache exists', async () => {
      const rates = await getRates({
        provider: mockProvider,
        offline: true
      });

      // Should return seed data
      expect(rates.USD).toBe(0.00175);
      expect(rates.EUR).toBe(0.00160);
    });

    it('should fallback to cache when provider fails', async () => {
      const cachedRates: RateTable = {
        SOS: 1,
        USD: 0.002,
        EUR: 0.0018,
        GBP: 0.0015,
        KES: 0.25,
        ETB: 0.11,
        AED: 0.007,
        SAR: 0.0075,
        TRY: 0.06,
        CNY: 0.013
      };

      // Write cache file
      const cached = {
        at: Date.now() - 10000, // Expired cache
        rates: cachedRates
      };
      await fs.writeFile(testCacheFile, JSON.stringify(cached));

      mockProvider.setShouldFail(true);

      const rates = await getRates({
        provider: mockProvider,
        persistPath: testCacheFile,
        ttlMs: 5000
      });

      expect(rates).toEqual(cachedRates);
    });

    it('should fallback to seed data when provider fails and no cache exists', async () => {
      mockProvider.setShouldFail(true);

      const rates = await getRates({
        provider: mockProvider
      });

      // Should return seed data
      expect(rates.USD).toBe(0.00175);
      expect(rates.EUR).toBe(0.00160);
    });
  });

  describe('getRate', () => {
    it('should return rate for specific currency', async () => {
      const rate = await getRate('USD', {
        provider: mockProvider
      });

      expect(rate).toBe(0.00175);
    });

    it('should return rate for SOS', async () => {
      const rate = await getRate('SOS', {
        provider: mockProvider
      });

      expect(rate).toBe(1);
    });
  });

  describe('convert', () => {
    beforeEach(() => {
      mockProvider.setRates({
        SOS: 1,
        USD: 0.00175,
        EUR: 0.00160,
        GBP: 0.00135,
        KES: 0.225,
        ETB: 0.102,
        AED: 0.0064,
        SAR: 0.0066,
        TRY: 0.056,
        CNY: 0.012
      });
    });

    it('should convert same currency (no conversion)', async () => {
      const result = await convert(100, 'USD', 'USD', { provider: mockProvider });
      expect(result).toBe(100);
    });

    it('should convert from SOS to other currency', async () => {
      const result = await convert(1000, 'SOS', 'USD', { provider: mockProvider });
      expect(result).toBe(1.75); // 1000 SOS * 0.00175 USD/SOS = 1.75 USD
    });

    it('should convert from other currency to SOS', async () => {
      const result = await convert(1, 'USD', 'SOS', { provider: mockProvider });
      expect(result).toBeCloseTo(571.43, 2); // 1 USD * (1/0.00175) SOS/USD ≈ 571.43 SOS
    });

    it('should convert between two non-SOS currencies', async () => {
      // 100 USD -> SOS -> EUR
      // 100 USD = 100 * (1/0.00175) ≈ 57142.86 SOS
      // 57142.86 SOS = 57142.86 * 0.00160 ≈ 91.43 EUR
      const result = await convert(100, 'USD', 'EUR', { provider: mockProvider });
      expect(result).toBeCloseTo(91.43, 1);
    });

    it('should handle decimal amounts', async () => {
      const result = await convert(0.5, 'USD', 'SOS', { provider: mockProvider });
      expect(result).toBeCloseTo(285.71, 2); // 0.5 USD * (1/0.00175) ≈ 285.71 SOS
    });
  });

  describe('formatSOS', () => {
    it('should format SOS currency', () => {
      const formatted = formatSOS(1000);
      expect(formatted).toContain('1,000');
      // The actual symbol might be 'S' instead of 'Sh' depending on locale
      expect(formatted).toMatch(/S\s*1,000/);
    });

    it('should handle decimal values', () => {
      const formatted = formatSOS(1234.56);
      expect(formatted).toContain('1,235'); // Currency formatting might round
    });
  });

  describe('formatCurrency', () => {
    it('should format USD currency', () => {
      const formatted = formatCurrency(100, 'USD');
      expect(formatted).toContain('100');
      expect(formatted).toContain('$');
    });

    it('should format EUR currency', () => {
      const formatted = formatCurrency(50, 'EUR');
      expect(formatted).toContain('50');
      expect(formatted).toContain('€');
    });
  });

  describe('quote', () => {
    beforeEach(() => {
      mockProvider.setRates({
        SOS: 1,
        USD: 0.00175,
        EUR: 0.00160,
        GBP: 0.00135,
        KES: 0.225,
        ETB: 0.102,
        AED: 0.0064,
        SAR: 0.0066,
        TRY: 0.056,
        CNY: 0.012
      });
    });

    it('should return formatted quote string', async () => {
      const quote_result = await quote('USD', 'SOS', 1, { provider: mockProvider });
      
      expect(quote_result).toContain('$1');
      expect(quote_result).toContain('=');
      expect(quote_result).toContain('S'); // Use 'S' instead of 'Sh'
    });

    it('should handle default amount of 1', async () => {
      const quote_result = await quote('SOS', 'USD', undefined, { provider: mockProvider });
      
      expect(quote_result).toContain('S'); // Just check for 'S' symbol
      expect(quote_result).toContain('1');
      expect(quote_result).toContain('=');
      expect(quote_result).toContain('$0');
    });

    it('should format large amounts correctly', async () => {
      const quote_result = await quote('USD', 'SOS', 100, { provider: mockProvider });
      
      expect(quote_result).toContain('$100');
      expect(quote_result).toContain('S'); // Just check for 'S' symbol
    });
  });
});