export type ISO4217 = "SOS" | "USD" | "EUR" | "GBP" | "KES" | "ETB" | "AED" | "SAR" | "TRY" | "CNY";

export type RateTable = Record<ISO4217, number>;

export type Language = "en" | "so" | "ar";
export type Locale = "en-US" | "so-SO" | "ar-SA";

export interface Provider {
  /** Return a table where keys are currency codes and values are the rate for 1 SOS in that currency. */
  fetchRatesSOS(): Promise<RateTable>;
  fetchHistoricalRates?(date: string): Promise<RateTable>;
  name: string;
  priority: number;
  timeout?: number;
}

export interface ProviderConfig {
  primary: Provider;
  fallbacks: Provider[];
  timeout: number;
  maxRetries: number;
}

export interface CacheOptions {
  /** How long to keep cache before a refresh is allowed (ms). Default 6 hours. */
  ttlMs?: number;
  /** Optional path to persist JSON cache (e.g., ~/.sosx/cache.json). If omitted, in-memory only. */
  persistPath?: string;
}

export interface GetRateOptions extends CacheOptions {
  /** Inject a custom provider. Default: exchangerate.host adapter. */
  provider?: Provider;
  /** If true, skip network and use cache/seed. */
  offline?: boolean;
  /** Language for localized output */
  language?: Language;
  /** Locale for formatting */
  locale?: Locale;
}

export interface HistoricalRateOptions {
  from: string;
  to: string;
  currency: ISO4217;
  baseCurrency?: ISO4217;
}

export interface RateAlert {
  id: string;
  from: ISO4217;
  to: ISO4217;
  threshold: number;
  direction: 'above' | 'below';
  webhook?: string;
  email?: string;
  active: boolean;
  createdAt: Date;
}

export interface TransferFeeOptions {
  amount: number;
  from: ISO4217;
  to: ISO4217;
  provider: 'western-union' | 'remitly' | 'worldremit' | 'wise';
  method: 'bank-transfer' | 'cash-pickup' | 'mobile-money';
}

export interface TransferFeeResult {
  fee: number;
  exchangeRate: number;
  totalCost: number;
  recipientAmount: number;
  provider: string;
  estimatedTime: string;
}

export interface MarketAnalysis {
  volatility: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  support: number;
  resistance: number;
  rsi: number;
  sma: number[];
  ema: number[];
}

export interface SomaliaMarketData {
  regions: {
    [region: string]: {
      officialRate: number;
      blackMarketRate?: number;
      spread: number;
      volume: number;
      lastUpdated: Date;
    };
  };
}

export interface WebhookConfig {
  url: string;
  events: ('rate-change' | 'anomaly-detected' | 'alert-triggered')[];
  currencies: ISO4217[];
  secret?: string;
}

export interface DatabaseConfig {
  type: 'sqlite' | 'postgresql' | 'mongodb';
  connection: string;
  retentionDays: number;
}

export interface UserConfig {
  defaultCurrencies: ISO4217[];
  language: Language;
  locale: Locale;
  notifications: {
    email?: string;
    webhook?: string;
  };
  providers: {
    primary: string;
    fallbacks: string[];
  };
  database?: DatabaseConfig;
}

export interface Plugin {
  name: string;
  version: string;
  hooks: {
    beforeRateFetch?: (options: any) => any;
    afterRateFetch?: (rates: RateTable) => RateTable;
    onError?: (error: Error) => void;
  };
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  period: string;
  currencies: ISO4217[];
  output?: string | undefined;
}

export interface PredictionResult {
  currency: ISO4217;
  baseCurrency: ISO4217;
  predictions: {
    date: string;
    rate: number;
    confidence: number;
  }[];
  model: string;
  accuracy: number;
}

export interface EconomicIndicator {
  name: string;
  value: number;
  date: string;
  source: string;
}

export interface CorrelationResult {
  currency: ISO4217;
  baseCurrency: ISO4217;
  indicators: {
    [indicator: string]: {
      correlation: number;
      pValue: number;
      significance: 'high' | 'medium' | 'low';
    };
  };
}
