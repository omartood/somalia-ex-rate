import type { ISO4217, RateTable, HistoricalRateOptions, Provider } from "./types";
import { ProviderManager } from "./providers/manager";
import { tryReadJSON, tryWriteJSON } from "./utils";
import path from "node:path";
import os from "node:os";

interface HistoricalCache {
  [date: string]: RateTable;
}

export class HistoricalRateService {
  private providerManager: ProviderManager;
  private cachePath: string;

  constructor(providerManager?: ProviderManager) {
    this.providerManager = providerManager || new ProviderManager();
    this.cachePath = path.join(os.homedir(), ".sosx", "historical-cache.json");
  }

  async getHistoricalRates(date: string): Promise<RateTable> {
    // Check cache first
    const cached = await this.getCachedRates();
    if (cached[date]) {
      console.log(`Using cached historical rates for ${date}`);
      return cached[date];
    }

    try {
      // Fetch from provider
      const rates = await this.providerManager.fetchHistoricalRates(date);
      
      // Cache the result
      await this.cacheRates(date, rates);
      
      return rates;
    } catch (error) {
      console.warn(`Failed to fetch historical rates for ${date}:`, error);
      throw error;
    }
  }

  async getRateHistory(options: HistoricalRateOptions): Promise<{ date: string; rate: number }[]> {
    const { from, to, currency, baseCurrency = 'SOS' } = options;
    const startDate = new Date(from);
    const endDate = new Date(to);
    const results: { date: string; rate: number }[] = [];

    // Generate date range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      try {
        const rates = await this.getHistoricalRates(dateStr);
        const rate = baseCurrency === 'SOS' ? rates[currency] : (1 / rates[currency]);
        results.push({ date: dateStr, rate });
      } catch (error) {
        console.warn(`Skipping ${dateStr} due to error:`, error);
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return results;
  }

  async getVolatility(currency: ISO4217, period: string = '30d'): Promise<number> {
    const days = parseInt(period.replace('d', ''));
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await this.getRateHistory({
      from: startDate.toISOString().split('T')[0],
      to: endDate.toISOString().split('T')[0],
      currency
    });

    if (history.length < 2) return 0;

    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < history.length; i++) {
      const dailyReturn = (history[i].rate - history[i-1].rate) / history[i-1].rate;
      returns.push(dailyReturn);
    }

    // Calculate standard deviation (volatility)
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(365); // Annualized volatility
  }

  private async getCachedRates(): Promise<HistoricalCache> {
    const cached = await tryReadJSON<HistoricalCache>(this.cachePath);
    return cached || {};
  }

  private async cacheRates(date: string, rates: RateTable): Promise<void> {
    const cached = await this.getCachedRates();
    cached[date] = rates;
    
    // Keep only last 90 days to prevent cache from growing too large
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    Object.keys(cached).forEach(date => {
      if (date < cutoffStr) {
        delete cached[date];
      }
    });

    await tryWriteJSON(this.cachePath, cached);
  }
}

// Convenience functions
let historicalService: HistoricalRateService;

export async function getHistoricalRates(date: string, provider?: Provider): Promise<RateTable> {
  if (!historicalService) {
    const providerManager = provider ? new ProviderManager({ primary: provider }) : undefined;
    historicalService = new HistoricalRateService(providerManager);
  }
  return historicalService.getHistoricalRates(date);
}

export async function getRateHistory(currency: ISO4217, from: string, to: string): Promise<{ date: string; rate: number }[]> {
  if (!historicalService) {
    historicalService = new HistoricalRateService();
  }
  return historicalService.getRateHistory({ currency, from, to });
}

export async function getVolatility(currency: ISO4217, period: string = '30d'): Promise<number> {
  if (!historicalService) {
    historicalService = new HistoricalRateService();
  }
  return historicalService.getVolatility(currency, period);
}