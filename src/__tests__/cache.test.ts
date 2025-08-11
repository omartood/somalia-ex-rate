import { describe, it, expect, beforeEach } from 'vitest';
import { getMemoryCache, setMemoryCache, type Cached } from '../cache';

describe('Cache', () => {
  beforeEach(() => {
    // Clear memory cache before each test
    setMemoryCache(null as any);
  });

  describe('memory cache', () => {
    it('should start with null cache', () => {
      expect(getMemoryCache()).toBeNull();
    });

    it('should store and retrieve cached data', () => {
      const cached: Cached = {
        at: Date.now(),
        rates: {
          USD: 0.00175,
          EUR: 0.00160,
          GBP: 0.00135,
          KES: 0.225,
          ETB: 0.102,
          AED: 0.0064,
          SAR: 0.0066,
          TRY: 0.056,
          CNY: 0.012,
          SOS: 1
        }
      };

      setMemoryCache(cached);
      expect(getMemoryCache()).toEqual(cached);
    });

    it('should overwrite existing cache', () => {
      const first: Cached = {
        at: 1000,
        rates: { USD: 0.001, EUR: 0.002, GBP: 0.003, KES: 0.1, ETB: 0.05, AED: 0.004, SAR: 0.005, TRY: 0.03, CNY: 0.008, SOS: 1 }
      };

      const second: Cached = {
        at: 2000,
        rates: { USD: 0.002, EUR: 0.003, GBP: 0.004, KES: 0.2, ETB: 0.1, AED: 0.005, SAR: 0.006, TRY: 0.04, CNY: 0.009, SOS: 1 }
      };

      setMemoryCache(first);
      setMemoryCache(second);
      
      expect(getMemoryCache()).toEqual(second);
      expect(getMemoryCache()).not.toEqual(first);
    });
  });
});