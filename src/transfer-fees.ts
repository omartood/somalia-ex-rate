import type { ISO4217, TransferFeeOptions, TransferFeeResult } from "./types";
import { convert } from "./index";

interface ProviderFeeStructure {
  fixedFee: number;
  percentageFee: number;
  exchangeRateMargin: number;
  estimatedTime: string;
  minimumFee?: number;
  maximumFee?: number;
}

const PROVIDER_FEES: Record<string, Record<string, ProviderFeeStructure>> = {
  'western-union': {
    'bank-transfer': {
      fixedFee: 5.00,
      percentageFee: 0.015, // 1.5%
      exchangeRateMargin: 0.02, // 2% margin on exchange rate
      estimatedTime: '1-3 business days',
      minimumFee: 5.00,
      maximumFee: 50.00
    },
    'cash-pickup': {
      fixedFee: 8.00,
      percentageFee: 0.02, // 2%
      exchangeRateMargin: 0.025, // 2.5% margin
      estimatedTime: 'Within minutes',
      minimumFee: 8.00,
      maximumFee: 75.00
    },
    'mobile-money': {
      fixedFee: 3.00,
      percentageFee: 0.01, // 1%
      exchangeRateMargin: 0.015, // 1.5% margin
      estimatedTime: 'Within minutes',
      minimumFee: 3.00,
      maximumFee: 25.00
    }
  },
  'remitly': {
    'bank-transfer': {
      fixedFee: 3.99,
      percentageFee: 0.01, // 1%
      exchangeRateMargin: 0.015, // 1.5% margin
      estimatedTime: '1-2 business days',
      minimumFee: 3.99,
      maximumFee: 30.00
    },
    'cash-pickup': {
      fixedFee: 4.99,
      percentageFee: 0.015, // 1.5%
      exchangeRateMargin: 0.02, // 2% margin
      estimatedTime: 'Within minutes',
      minimumFee: 4.99,
      maximumFee: 40.00
    },
    'mobile-money': {
      fixedFee: 1.99,
      percentageFee: 0.005, // 0.5%
      exchangeRateMargin: 0.01, // 1% margin
      estimatedTime: 'Within minutes',
      minimumFee: 1.99,
      maximumFee: 15.00
    }
  },
  'worldremit': {
    'bank-transfer': {
      fixedFee: 2.99,
      percentageFee: 0.012, // 1.2%
      exchangeRateMargin: 0.018, // 1.8% margin
      estimatedTime: '1-2 business days',
      minimumFee: 2.99,
      maximumFee: 35.00
    },
    'cash-pickup': {
      fixedFee: 5.99,
      percentageFee: 0.018, // 1.8%
      exchangeRateMargin: 0.022, // 2.2% margin
      estimatedTime: 'Within minutes',
      minimumFee: 5.99,
      maximumFee: 45.00
    },
    'mobile-money': {
      fixedFee: 2.49,
      percentageFee: 0.008, // 0.8%
      exchangeRateMargin: 0.012, // 1.2% margin
      estimatedTime: 'Within minutes',
      minimumFee: 2.49,
      maximumFee: 20.00
    }
  },
  'wise': {
    'bank-transfer': {
      fixedFee: 1.50,
      percentageFee: 0.005, // 0.5%
      exchangeRateMargin: 0.005, // 0.5% margin (Wise uses mid-market rate)
      estimatedTime: '1-2 business days',
      minimumFee: 1.50,
      maximumFee: 15.00
    },
    'cash-pickup': {
      fixedFee: 0, // Not available
      percentageFee: 0,
      exchangeRateMargin: 0,
      estimatedTime: 'Not available',
      minimumFee: 0,
      maximumFee: 0
    },
    'mobile-money': {
      fixedFee: 2.00,
      percentageFee: 0.007, // 0.7%
      exchangeRateMargin: 0.008, // 0.8% margin
      estimatedTime: 'Within hours',
      minimumFee: 2.00,
      maximumFee: 12.00
    }
  }
};

export async function calculateTransferFee(options: TransferFeeOptions): Promise<TransferFeeResult> {
  const { amount, from, to, provider, method } = options;

  // Get fee structure for provider and method
  const providerFees = PROVIDER_FEES[provider];
  if (!providerFees) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  const feeStructure = providerFees[method];
  if (!feeStructure) {
    throw new Error(`Method ${method} not available for ${provider}`);
  }

  // Check if service is available
  if (feeStructure.fixedFee === 0 && feeStructure.percentageFee === 0) {
    throw new Error(`${method} is not available for ${provider}`);
  }

  // Get current exchange rate
  const midMarketRate = await convert(1, from, to);
  
  // Apply provider's exchange rate margin
  const providerRate = midMarketRate * (1 - feeStructure.exchangeRateMargin);

  // Calculate fees
  const percentageFee = amount * feeStructure.percentageFee;
  let totalFee = feeStructure.fixedFee + percentageFee;

  // Apply minimum and maximum fee limits
  if (feeStructure.minimumFee && totalFee < feeStructure.minimumFee) {
    totalFee = feeStructure.minimumFee;
  }
  if (feeStructure.maximumFee && totalFee > feeStructure.maximumFee) {
    totalFee = feeStructure.maximumFee;
  }

  // Calculate final amounts
  const totalCost = amount + totalFee;
  const recipientAmount = amount * providerRate;

  return {
    fee: totalFee,
    exchangeRate: providerRate,
    totalCost,
    recipientAmount,
    provider,
    estimatedTime: feeStructure.estimatedTime
  };
}

export async function compareTransferOptions(
  amount: number,
  from: ISO4217,
  to: ISO4217,
  method: TransferFeeOptions['method']
): Promise<TransferFeeResult[]> {
  const providers: TransferFeeOptions['provider'][] = ['western-union', 'remitly', 'worldremit', 'wise'];
  const results: TransferFeeResult[] = [];

  for (const provider of providers) {
    try {
      const result = await calculateTransferFee({
        amount,
        from,
        to,
        provider,
        method
      });
      results.push(result);
    } catch (error) {
      console.warn(`Failed to calculate fees for ${provider}:`, error);
    }
  }

  // Sort by total cost (lowest first)
  return results.sort((a, b) => a.totalCost - b.totalCost);
}

export async function getBestTransferOption(
  amount: number,
  from: ISO4217,
  to: ISO4217
): Promise<{ method: string; result: TransferFeeResult }> {
  const methods: TransferFeeOptions['method'][] = ['bank-transfer', 'cash-pickup', 'mobile-money'];
  let bestOption: { method: string; result: TransferFeeResult } | null = null;

  for (const method of methods) {
    try {
      const options = await compareTransferOptions(amount, from, to, method);
      if (options.length > 0) {
        const best = options[0]; // Already sorted by total cost
        
        if (!bestOption || best.totalCost < bestOption.result.totalCost) {
          bestOption = { method, result: best };
        }
      }
    } catch (error) {
      console.warn(`Failed to compare options for ${method}:`, error);
    }
  }

  if (!bestOption) {
    throw new Error('No transfer options available');
  }

  return bestOption;
}

// Utility function to format transfer fee results
export function formatTransferResult(result: TransferFeeResult): string {
  return `
Provider: ${result.provider}
Fee: $${result.fee.toFixed(2)}
Exchange Rate: ${result.exchangeRate.toFixed(6)}
Total Cost: $${result.totalCost.toFixed(2)}
Recipient Gets: ${result.recipientAmount.toFixed(2)}
Estimated Time: ${result.estimatedTime}
`.trim();
}