import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tryReadJSON, tryWriteJSON, invert, nice } from '../utils';
import type { RateTable } from '../types';

describe('Utils', () => {
  const testDir = path.join(process.cwd(), 'test-temp');
  const testFile = path.join(testDir, 'test.json');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe('tryReadJSON', () => {
    it('should read valid JSON file', async () => {
      const data = { test: 'value', number: 42 };
      await fs.writeFile(testFile, JSON.stringify(data));
      
      const result = await tryReadJSON(testFile);
      expect(result).toEqual(data);
    });

    it('should return null for non-existent file', async () => {
      const result = await tryReadJSON('non-existent.json');
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      await fs.writeFile(testFile, 'invalid json content');
      
      const result = await tryReadJSON(testFile);
      expect(result).toBeNull();
    });
  });

  describe('tryWriteJSON', () => {
    it('should write JSON data to file', async () => {
      const data = { currency: 'USD', rate: 0.00175 };
      
      await tryWriteJSON(testFile, data);
      
      const content = await fs.readFile(testFile, 'utf8');
      expect(JSON.parse(content)).toEqual(data);
    });

    it('should create directories if they don\'t exist', async () => {
      const nestedFile = path.join(testDir, 'nested', 'deep', 'test.json');
      const data = { test: true };
      
      await tryWriteJSON(nestedFile, data);
      
      const content = await fs.readFile(nestedFile, 'utf8');
      expect(JSON.parse(content)).toEqual(data);
    });

    it('should handle write errors gracefully', async () => {
      // Try to write to an invalid path (should not throw)
      await expect(tryWriteJSON('/invalid/path/test.json', {})).resolves.toBeUndefined();
    });
  });

  describe('invert', () => {
    it('should invert rate table correctly', () => {
      const baseToOthers = {
        USD: 1,
        EUR: 0.85,
        GBP: 0.75
      };
      const sosPerBase = 570; // 1 USD = 570 SOS
      
      const result = invert(baseToOthers, sosPerBase);
      
      expect(result.USD).toBeCloseTo(1 / 570, 6);
      expect(result.EUR).toBeCloseTo(0.85 / 570, 6);
      expect(result.GBP).toBeCloseTo(0.75 / 570, 6);
    });

    it('should handle zero sosPerBase', () => {
      const baseToOthers = { USD: 1 };
      const sosPerBase = 0;
      
      const result = invert(baseToOthers, sosPerBase);
      
      expect(result.USD).toBe(Infinity);
    });
  });

  describe('nice', () => {
    it('should format numbers < 1 with 4 decimals', () => {
      expect(nice(0.123456789)).toBe(0.1235);
      expect(nice(0.001234)).toBe(0.0012);
    });

    it('should format numbers >= 1 with 2 decimals', () => {
      expect(nice(123.456789)).toBe(123.46);
      expect(nice(1.999)).toBe(2.00);
    });

    it('should handle edge cases', () => {
      expect(nice(0)).toBe(0);
      expect(nice(1)).toBe(1.00);
      expect(nice(0.9999)).toBe(0.9999); // 0.9999 < 1, so gets 4 decimals
    });
  });
});