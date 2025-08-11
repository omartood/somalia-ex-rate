import type { Provider, ProviderConfig, RateTable } from "../types";
import { ExchangerateHostProvider } from "./exchangeratehost";
import { FixerProvider } from "./fixer";
import { CurrencyAPIProvider } from "./currencyapi";

export class ProviderManager {
  private config: ProviderConfig;

  constructor(config?: Partial<ProviderConfig>) {
    this.config = {
      primary: new ExchangerateHostProvider(),
      fallbacks: [],
      timeout: 10000,
      maxRetries: 3,
      ...config
    };
  }

  async fetchRates(): Promise<RateTable> {
    const providers = [this.config.primary, ...this.config.fallbacks];
    let lastError: Error | null = null;

    for (const provider of providers) {
      for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
        try {
          console.log(`Attempting to fetch rates from ${provider.name} (attempt ${attempt})`);
          const rates = await this.fetchWithTimeout(provider, this.config.timeout);
          console.log(`Successfully fetched rates from ${provider.name}`);
          return rates;
        } catch (error) {
          lastError = error as Error;
          console.warn(`Failed to fetch from ${provider.name} (attempt ${attempt}):`, error);
          
          if (attempt < this.config.maxRetries) {
            // Exponential backoff
            const delay = Math.pow(2, attempt - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  async fetchHistoricalRates(date: string): Promise<RateTable> {
    const providers = [this.config.primary, ...this.config.fallbacks].filter(p => p.fetchHistoricalRates);
    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        if (provider.fetchHistoricalRates) {
          console.log(`Fetching historical rates from ${provider.name} for ${date}`);
          const rates = await provider.fetchHistoricalRates(date);
          console.log(`Successfully fetched historical rates from ${provider.name}`);
          return rates;
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`Failed to fetch historical rates from ${provider.name}:`, error);
      }
    }

    throw new Error(`All providers failed for historical data. Last error: ${lastError?.message}`);
  }

  private async fetchWithTimeout(provider: Provider, timeout: number): Promise<RateTable> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Provider ${provider.name} timed out after ${timeout}ms`));
      }, timeout);

      provider.fetchRatesSOS()
        .then(rates => {
          clearTimeout(timer);
          resolve(rates);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  addFallbackProvider(provider: Provider): void {
    this.config.fallbacks.push(provider);
    // Sort by priority (lower number = higher priority)
    this.config.fallbacks.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  }

  setPrimaryProvider(provider: Provider): void {
    this.config.primary = provider;
  }

  getProviderStatus(): { name: string; priority: number; available: boolean }[] {
    const providers = [this.config.primary, ...this.config.fallbacks];
    return providers.map(provider => ({
      name: provider.name,
      priority: provider.priority || 999,
      available: true // Could implement health checks here
    }));
  }
}

// Factory function to create providers with API keys
export function createProvider(name: string, apiKey?: string): Provider {
  switch (name.toLowerCase()) {
    case 'exchangerate-host':
      return new ExchangerateHostProvider();
    case 'fixer':
      if (!apiKey) throw new Error('Fixer provider requires API key');
      return new FixerProvider(apiKey);
    case 'currencyapi':
      if (!apiKey) throw new Error('CurrencyAPI provider requires API key');
      return new CurrencyAPIProvider(apiKey);
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}