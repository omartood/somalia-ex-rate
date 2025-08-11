import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExchangerateHostProvider } from '../providers/exchangeratehost';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ExchangerateHostProvider', () => {
  let provider: ExchangerateHostProvider;

  beforeEach(() => {
    provider = new ExchangerateHostProvider();
    mockFetch.mockClear();
  });

  it('should have correct name', () => {
    expect(provider.name).toBe('exchangerate.host');
  });

  describe('fetchRatesSOS', () => {
    it('should fetch and convert rates correctly', async () => {
      const mockResponse = {
        rates: {
          SOS: 570,
          USD: 1,
          EUR: 0.85,
          GBP: 0.75,
          KES: 128,
          ETB: 58,
          AED: 3.67,
          SAR: 3.75,
          TRY: 32,
          CNY: 7.2
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await provider.fetchRatesSOS();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.exchangerate.host/latest?base=USD&symbols=')
      );
      
      // Check that rates are inverted correctly (1 SOS in other currencies)
      expect(result.USD).toBeCloseTo(1 / 570, 6);
      expect(result.EUR).toBeCloseTo(0.85 / 570, 6);
      expect(result.GBP).toBeCloseTo(0.75 / 570, 6);
      expect(result.SOS).toBe(1); // 1 SOS = 1 SOS
    });

    it('should throw error on HTTP error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(provider.fetchRatesSOS()).rejects.toThrow('Provider error 404');
    });

    it('should throw error when SOS rate is missing', async () => {
      const mockResponse = {
        rates: {
          USD: 1,
          EUR: 0.85
          // Missing SOS rate
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(provider.fetchRatesSOS()).rejects.toThrow('Provider returned no SOS rate');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(provider.fetchRatesSOS()).rejects.toThrow('Network error');
    });

    it('should request all expected currency symbols', async () => {
      const mockResponse = {
        rates: {
          SOS: 570,
          USD: 1,
          EUR: 0.85,
          GBP: 0.75,
          KES: 128,
          ETB: 58,
          AED: 3.67,
          SAR: 3.75,
          TRY: 32,
          CNY: 7.2
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await provider.fetchRatesSOS();

      const calledUrl = mockFetch.mock.calls[0][0];
      const expectedSymbols = ['SOS', 'EUR', 'GBP', 'KES', 'ETB', 'AED', 'SAR', 'TRY', 'CNY', 'USD'];
      
      expectedSymbols.forEach(symbol => {
        expect(calledUrl).toContain(symbol);
      });
    });
  });
});