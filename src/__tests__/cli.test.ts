import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the main functions
vi.mock('../index', () => ({
  convert: vi.fn(),
  quote: vi.fn()
}));

import { convert, quote } from '../index';
import { help, main } from '../cli';

const mockConvert = vi.mocked(convert);
const mockQuote = vi.mocked(quote);

describe('CLI Functions', () => {
  const originalArgv = process.argv;
  const originalExit = process.exit;
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    mockConvert.mockClear();
    mockQuote.mockClear();
    consoleSpy.mockClear();
    consoleErrorSpy.mockClear();
    process.exit = vi.fn() as any;
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
    vi.clearAllMocks();
  });

  it('should show help message', () => {
    help();
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('sosx — Somali exchange rates')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Usage:')
    );
  });

  it('should handle rate conversion', async () => {
    mockConvert.mockResolvedValue(571.43);
    
    // Mock process.argv for rate command
    process.argv = ['node', 'cli.js', 'rate', 'USD', 'SOS', '1'];
    
    await main();
    
    expect(mockConvert).toHaveBeenCalledWith(1, 'USD', 'SOS');
    expect(consoleSpy).toHaveBeenCalledWith(571.43);
  });

  it('should handle quote command', async () => {
    mockQuote.mockResolvedValue('$1.00 = S 571');
    
    // Mock process.argv for quote command
    process.argv = ['node', 'cli.js', 'quote', 'USD', 'SOS', '1'];
    
    await main();
    
    expect(mockQuote).toHaveBeenCalledWith('USD', 'SOS', 1);
    expect(consoleSpy).toHaveBeenCalledWith('$1.00 = S 571');
  });

  it('should show help for missing arguments', async () => {
    process.argv = ['node', 'cli.js', 'rate'];
    
    await main();
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Usage:')
    );
    expect(mockConvert).not.toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    mockConvert.mockRejectedValue(new Error('Network error'));
    
    process.argv = ['node', 'cli.js', 'rate', 'USD', 'SOS'];
    
    await main();
    
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'Network error');
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});