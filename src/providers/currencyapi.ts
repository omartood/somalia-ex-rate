import type { Provider, RateTable } from "../types";
import { invert } from "../utils";

const API_BASE = "https://api.currencyapi.com/v3";

export class CurrencyAPIProvider implements Provider {
  name = "currencyapi.com";
  priority = 3;
  timeout = 5000;

  constructor(private apiKey: string) {}

  async fetchRatesSOS(): Promise<RateTable> {
    const currencies = ["SOS", "EUR", "GBP", "KES", "ETB", "AED", "SAR", "TRY", "CNY", "USD"].join(",");
    const url = `${API_BASE}/latest?apikey=${this.apiKey}&base_currency=USD&currencies=${currencies}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error(`CurrencyAPI error ${res.status}`);
      
      const data = await res.json();
      if (data.errors) throw new Error(`CurrencyAPI error: ${JSON.stringify(data.errors)}`);
      
      const rates: Record<string, number> = {};
      for (const [currency, info] of Object.entries(data.data as any)) {
        rates[currency] = (info as any).value;
      }
      
      const sosPerUsd = rates["SOS"];
      if (!sosPerUsd) throw new Error("CurrencyAPI returned no SOS rate");
      
      return invert(rates, sosPerUsd);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async fetchHistoricalRates(date: string): Promise<RateTable> {
    const currencies = ["SOS", "EUR", "GBP", "KES", "ETB", "AED", "SAR", "TRY", "CNY", "USD"].join(",");
    const url = `${API_BASE}/historical?apikey=${this.apiKey}&base_currency=USD&currencies=${currencies}&date=${date}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CurrencyAPI historical error ${res.status}`);
    
    const data = await res.json();
    if (data.errors) throw new Error(`CurrencyAPI error: ${JSON.stringify(data.errors)}`);
    
    const rates: Record<string, number> = {};
    for (const [currency, info] of Object.entries(data.data as any)) {
      rates[currency] = (info as any).value;
    }
    
    const sosPerUsd = rates["SOS"];
    if (!sosPerUsd) throw new Error("CurrencyAPI returned no SOS rate for date");
    
    return invert(rates, sosPerUsd);
  }
}