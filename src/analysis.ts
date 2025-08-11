import type { ISO4217, MarketAnalysis, SomaliaMarketData } from "./types";
import { getRateHistory, getVolatility } from "./historical";

export class MarketAnalyzer {
  async analyzeMarket(
    from: ISO4217,
    to: ISO4217,
    period: string = '30d'
  ): Promise<MarketAnalysis> {
    const days = parseInt(period.replace('d', ''));
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get historical data
    const history = await getRateHistory(
      to,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    if (history.length < 14) {
      throw new Error('Insufficient data for analysis (minimum 14 days required)');
    }

    const rates = history.map(h => h.rate);
    const volatility = await getVolatility(to, period);

    return {
      volatility,
      trend: this.calculateTrend(rates),
      support: this.calculateSupport(rates),
      resistance: this.calculateResistance(rates),
      rsi: this.calculateRSI(rates),
      sma: this.calculateSMA(rates, [7, 14, 30]),
      ema: this.calculateEMA(rates, [7, 14, 30])
    };
  }

  private calculateTrend(rates: number[]): 'bullish' | 'bearish' | 'neutral' {
    if (rates.length < 2) return 'neutral';

    const recentRates = rates.slice(-7); // Last 7 days
    const olderRates = rates.slice(-14, -7); // Previous 7 days

    const recentAvg = recentRates.reduce((sum, rate) => sum + rate, 0) / recentRates.length;
    const olderAvg = olderRates.reduce((sum, rate) => sum + rate, 0) / olderRates.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.02) return 'bullish'; // 2% increase
    if (change < -0.02) return 'bearish'; // 2% decrease
    return 'neutral';
  }

  private calculateSupport(rates: number[]): number {
    // Support is typically the lowest low in recent period
    const recentRates = rates.slice(-30); // Last 30 days
    return Math.min(...recentRates);
  }

  private calculateResistance(rates: number[]): number {
    // Resistance is typically the highest high in recent period
    const recentRates = rates.slice(-30); // Last 30 days
    return Math.max(...recentRates);
  }

  private calculateRSI(rates: number[], period: number = 14): number {
    if (rates.length < period + 1) return 50; // Neutral RSI

    const changes: number[] = [];
    for (let i = 1; i < rates.length; i++) {
      changes.push(rates[i] - rates[i - 1]);
    }

    const recentChanges = changes.slice(-period);
    const gains = recentChanges.filter(change => change > 0);
    const losses = recentChanges.filter(change => change < 0).map(loss => Math.abs(loss));

    const avgGain = gains.length > 0 ? gains.reduce((sum, gain) => sum + gain, 0) / gains.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((sum, loss) => sum + loss, 0) / losses.length : 0;

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateSMA(rates: number[], periods: number[]): number[] {
    return periods.map(period => {
      if (rates.length < period) return rates[rates.length - 1] || 0;
      
      const recentRates = rates.slice(-period);
      return recentRates.reduce((sum, rate) => sum + rate, 0) / recentRates.length;
    });
  }

  private calculateEMA(rates: number[], periods: number[]): number[] {
    return periods.map(period => {
      if (rates.length < period) return rates[rates.length - 1] || 0;

      const multiplier = 2 / (period + 1);
      let ema = rates[0];

      for (let i = 1; i < rates.length; i++) {
        ema = (rates[i] * multiplier) + (ema * (1 - multiplier));
      }

      return ema;
    });
  }
}

export class SomaliaMarketService {
  async getSomaliaMarketData(): Promise<SomaliaMarketData> {
    // In a real implementation, this would fetch from Somalia-specific sources
    // For now, we'll simulate regional data
    const baseRate = 570; // Approximate USD/SOS rate
    
    return {
      regions: {
        mogadishu: {
          officialRate: baseRate,
          blackMarketRate: baseRate * 1.05, // 5% premium
          spread: 0.05,
          volume: 1000000, // Daily volume in USD
          lastUpdated: new Date()
        },
        hargeisa: {
          officialRate: baseRate,
          blackMarketRate: baseRate * 1.08, // 8% premium
          spread: 0.08,
          volume: 500000,
          lastUpdated: new Date()
        },
        bosaso: {
          officialRate: baseRate,
          blackMarketRate: baseRate * 1.12, // 12% premium
          spread: 0.12,
          volume: 200000,
          lastUpdated: new Date()
        },
        kismayo: {
          officialRate: baseRate,
          blackMarketRate: baseRate * 1.15, // 15% premium
          spread: 0.15,
          volume: 150000,
          lastUpdated: new Date()
        },
        garowe: {
          officialRate: baseRate,
          blackMarketRate: baseRate * 1.10, // 10% premium
          spread: 0.10,
          volume: 100000,
          lastUpdated: new Date()
        }
      }
    };
  }

  async getRegionalSpread(region: string): Promise<number> {
    const marketData = await this.getSomaliaMarketData();
    const regionData = marketData.regions[region.toLowerCase()];
    
    if (!regionData) {
      throw new Error(`Unknown region: ${region}`);
    }

    return regionData.spread;
  }

  async getBestRegionalRate(amount: number): Promise<{ region: string; rate: number; savings: number }> {
    const marketData = await this.getSomaliaMarketData();
    let bestRegion = '';
    let bestRate = 0;
    let bestAmount = 0;

    for (const [region, data] of Object.entries(marketData.regions)) {
      const rate = data.blackMarketRate || data.officialRate;
      const convertedAmount = amount * rate;
      
      if (convertedAmount > bestAmount) {
        bestRegion = region;
        bestRate = rate;
        bestAmount = convertedAmount;
      }
    }

    // Calculate savings compared to worst rate
    const worstAmount = Math.min(...Object.values(marketData.regions).map(data => 
      amount * (data.blackMarketRate || data.officialRate)
    ));
    const savings = bestAmount - worstAmount;

    return {
      region: bestRegion,
      rate: bestRate,
      savings
    };
  }
}

// Convenience functions
let marketAnalyzer: MarketAnalyzer;
let somaliaMarketService: SomaliaMarketService;

export async function analyzeMarket(
  from: ISO4217,
  to: ISO4217,
  period?: string
): Promise<MarketAnalysis> {
  if (!marketAnalyzer) {
    marketAnalyzer = new MarketAnalyzer();
  }
  return marketAnalyzer.analyzeMarket(from, to, period);
}

export async function getSomaliaMarketData(): Promise<SomaliaMarketData> {
  if (!somaliaMarketService) {
    somaliaMarketService = new SomaliaMarketService();
  }
  return somaliaMarketService.getSomaliaMarketData();
}

export async function detectAnomalies(
  from: ISO4217,
  to: ISO4217,
  options: { threshold: number; timeWindow: string }
): Promise<{ anomaly: boolean; deviation: number; message: string }> {
  const { threshold, timeWindow } = options;
  const days = parseInt(timeWindow.replace(/[^\d]/g, ''));
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const history = await getRateHistory(
    to,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );

  if (history.length < 2) {
    return { anomaly: false, deviation: 0, message: 'Insufficient data' };
  }

  const currentRate = history[history.length - 1].rate;
  const previousRate = history[history.length - 2].rate;
  const change = Math.abs((currentRate - previousRate) / previousRate);

  const anomaly = change > threshold;
  const message = anomaly 
    ? `Anomaly detected: ${(change * 100).toFixed(2)}% change in ${from}/${to} rate`
    : 'No anomaly detected';

  return {
    anomaly,
    deviation: change,
    message
  };
}