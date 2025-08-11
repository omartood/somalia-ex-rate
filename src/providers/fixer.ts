import type { Provider, RateTable } from "../types";
import { invert } from "../utils";

const API_BASE = "https://api.fixer.io/v1";

export class FixerProvider implements Provider {
  name = "fixer.io";
  priority = 2;
  timeout = 5000;

  constructor(private apiKey: string) {}

  async fetchRatesSOS(): Promise<RateTable> {
    const symbols = ["SOS", "EUR", "GBP", "KES", "ETB", "AED", "SAR", "TRY", "CNY", "USD"].join(",");
    const url = `${API_BASE}/latest?access_key=${this.apiKey}&base=USD&symbols=${symbols}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error(`Fixer API error ${res.status}`);
      
      const data = await res.json();
      if (!data.success) throw new Error(`Fixer API error: ${data.error?.info || 'Unknown error'}`);
      
      const usdTo = data.rates as Record<string, number>;
      const sosPerUsd = usdTo["SOS"];
      if (!sosPerUsd) throw new Error("Fixer returned no SOS rate");
      
      return invert(usdTo, sosPerUsd);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async fetchHistoricalRates(date: string): Promise<RateTable> {
    const symbols = ["SOS", "EUR", "GBP", "KES", "ETB", "AED", "SAR", "TRY", "CNY", "USD"].join(",");
    const url = `${API_BASE}/${date}?access_key=${this.apiKey}&base=USD&symbols=${symbols}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fixer historical API error ${res.status}`);
    
    const data = await res.json();
    if (!data.success) throw new Error(`Fixer API error: ${data.error?.info || 'Unknown error'}`);
    
    const usdTo = data.rates as Record<string, number>;
    const sosPerUsd = usdTo["SOS"];
    if (!sosPerUsd) throw new Error("Fixer returned no SOS rate for date");
    
    return invert(usdTo, sosPerUsd);
  }
}