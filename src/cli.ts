#!/usr/bin/env node
import { convert, quote, getRates } from "./index";
import { getHistoricalRates, getRateHistory, getVolatility } from "./historical";
import { setRateAlert, listRateAlerts, removeRateAlert, startAlertMonitoring } from "./alerts";
import { calculateTransferFee, compareTransferOptions, getBestTransferOption } from "./transfer-fees";
import { analyzeMarket, getSomaliaMarketData } from "./analysis";
import { exportRates, exportAnalysisReport } from "./export";
import { runConfigWizard, loadUserConfig, getUserConfig } from "./config";
import { startTUI } from "./tui";
import { RateStreamServer } from "./realtime";
import type { ISO4217, TransferFeeOptions } from "./types";

export function help() {
  console.log(
    `
🇸🇴 sosx — Somali Exchange Rates (SOS)

BASIC USAGE:
  sosx rate <FROM> <TO> [AMOUNT]     Show conversion (default amount 1)
  sosx quote <FROM> <TO> [AMOUNT]    Pretty formatted conversion
  sosx rates                         Show all current rates

HISTORICAL DATA:
  sosx history <CURRENCY> [DAYS]     Show rate history (default 30 days)
  sosx historical <DATE>             Get rates for specific date (YYYY-MM-DD)
  sosx volatility <CURRENCY> [DAYS]  Calculate volatility (default 30 days)

ALERTS & MONITORING:
  sosx alert set <FROM> <TO> <THRESHOLD> <above|below> [--email EMAIL] [--webhook URL]
  sosx alert list                    List all alerts
  sosx alert remove <ID>             Remove alert by ID
  sosx monitor                       Start alert monitoring
  sosx tui                           Launch interactive terminal UI
  sosx stream [PORT]                 Start WebSocket rate stream server

TRANSFER FEES:
  sosx transfer <AMOUNT> <FROM> <TO> <PROVIDER> <METHOD>
  sosx compare <AMOUNT> <FROM> <TO> <METHOD>
  sosx best <AMOUNT> <FROM> <TO>     Find best transfer option

MARKET ANALYSIS:
  sosx analyze <FROM> <TO> [PERIOD]  Market analysis (default 30d)
  sosx somalia                       Somalia regional market data
  sosx anomaly <FROM> <TO> [THRESHOLD] [WINDOW]

EXPORT & REPORTING:
  sosx export <FORMAT> <CURRENCIES> <PERIOD> [--output FILE]
  sosx report <CURRENCIES> <PERIOD> [--output FILE]

CONFIGURATION:
  sosx config                        Show current configuration
  sosx config wizard                 Run configuration wizard
  sosx config set <KEY> <VALUE>      Set configuration value
  sosx config language <LANGUAGE>    Set language (en|so|ar)

EXAMPLES:
  sosx rate USD SOS 100
  sosx quote SOS USD 500000
  sosx history USD 7
  sosx alert set USD SOS 600 above --email user@example.com
  sosx transfer 1000 USD SOS remitly mobile-money
  sosx analyze USD SOS 30d
  sosx export csv USD,EUR,GBP 30d
  sosx tui

SUPPORTED CURRENCIES:
  SOS (Somali Shilling), USD, EUR, GBP, KES, ETB, AED, SAR, TRY, CNY

TRANSFER PROVIDERS:
  western-union, remitly, worldremit, wise

TRANSFER METHODS:
  bank-transfer, cash-pickup, mobile-money

For more help: sosx help <command>
`.trim()
  );
}

export async function main() {
  const args = process.argv.slice(2);
  const [cmd, ...params] = args;

  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    if (params[0]) {
      return showCommandHelp(params[0]);
    }
    return help();
  }

  try {
    await loadUserConfig();

    switch (cmd) {
      case "rate":
        await handleRate(params);
        break;
      case "quote":
        await handleQuote(params);
        break;
      case "rates":
        await handleRates();
        break;
      case "history":
        await handleHistory(params);
        break;
      case "historical":
        await handleHistorical(params);
        break;
      case "volatility":
        await handleVolatility(params);
        break;
      case "alert":
        await handleAlert(params);
        break;
      case "monitor":
        await handleMonitor();
        break;
      case "tui":
        startTUI();
        break;
      case "stream":
        await handleStream(params);
        break;
      case "transfer":
        await handleTransfer(params);
        break;
      case "compare":
        await handleCompare(params);
        break;
      case "best":
        await handleBest(params);
        break;
      case "analyze":
        await handleAnalyze(params);
        break;
      case "somalia":
        await handleSomalia();
        break;
      case "anomaly":
        await handleAnomaly(params);
        break;
      case "export":
        await handleExport(params);
        break;
      case "report":
        await handleReport(params);
        break;
      case "config":
        await handleConfig(params);
        break;
      default:
        console.error(`Unknown command: ${cmd}`);
        console.log("Run 'sosx help' for usage information.");
        process.exit(1);
    }
  } catch (e: any) {
    console.error("Error:", e.message || e);
    process.exit(1);
  }
}

async function handleRate(params: string[]): Promise<void> {
  const [from, to, amountStr] = params;
  if (!from || !to) {
    console.error("Usage: sosx rate <FROM> <TO> [AMOUNT]");
    return;
  }
  const amount = amountStr ? Number(amountStr) : 1;
  const result = await convert(amount, from as ISO4217, to as ISO4217);
  console.log(result);
}

async function handleQuote(params: string[]): Promise<void> {
  const [from, to, amountStr] = params;
  if (!from || !to) {
    console.error("Usage: sosx quote <FROM> <TO> [AMOUNT]");
    return;
  }
  const amount = amountStr ? Number(amountStr) : 1;
  const result = await quote(from as ISO4217, to as ISO4217, amount);
  console.log(result);
}

async function handleRates(): Promise<void> {
  const rates = await getRates();
  console.log("Current exchange rates (1 SOS = X):");
  Object.entries(rates).forEach(([currency, rate]) => {
    if (currency !== 'SOS') {
      console.log(`  ${currency}: ${rate.toFixed(6)}`);
    }
  });
}

async function handleHistory(params: string[]): Promise<void> {
  const [currency, daysStr] = params;
  if (!currency) {
    console.error("Usage: sosx history <CURRENCY> [DAYS]");
    return;
  }
  const days = daysStr ? parseInt(daysStr) : 30;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const history = await getRateHistory(
    currency as ISO4217,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );
  
  console.log(`Rate history for ${currency} (last ${days} days):`);
  history.forEach(record => {
    console.log(`  ${record.date}: ${record.rate.toFixed(6)}`);
  });
}

async function handleHistorical(params: string[]): Promise<void> {
  const [date] = params;
  if (!date) {
    console.error("Usage: sosx historical <DATE> (YYYY-MM-DD)");
    return;
  }
  const rates = await getHistoricalRates(date);
  console.log(`Exchange rates for ${date}:`);
  Object.entries(rates).forEach(([currency, rate]) => {
    if (currency !== 'SOS') {
      console.log(`  ${currency}: ${rate.toFixed(6)}`);
    }
  });
}

async function handleVolatility(params: string[]): Promise<void> {
  const [currency, daysStr] = params;
  if (!currency) {
    console.error("Usage: sosx volatility <CURRENCY> [DAYS]");
    return;
  }
  const period = daysStr ? `${daysStr}d` : '30d';
  const volatility = await getVolatility(currency as ISO4217, period);
  console.log(`Volatility for ${currency} (${period}): ${(volatility * 100).toFixed(2)}%`);
}

async function handleAlert(params: string[]): Promise<void> {
  const [action, ...args] = params;
  
  switch (action) {
    case "set":
      const [from, to, thresholdStr, direction, ...flags] = args;
      if (!from || !to || !thresholdStr || !direction) {
        console.error("Usage: sosx alert set <FROM> <TO> <THRESHOLD> <above|below> [--email EMAIL] [--webhook URL]");
        return;
      }
      
      const threshold = Number(thresholdStr);
      const emailIndex = flags.indexOf('--email');
      const webhookIndex = flags.indexOf('--webhook');
      const email = emailIndex >= 0 ? flags[emailIndex + 1] : undefined;
      const webhook = webhookIndex >= 0 ? flags[webhookIndex + 1] : undefined;
      
      const newAlertId = await setRateAlert(
        from as ISO4217,
        to as ISO4217,
        threshold,
        direction as 'above' | 'below',
        { 
          ...(email && { email }), 
          ...(webhook && { webhook })
        }
      );
      console.log(`Alert created with ID: ${newAlertId}`);
      break;
      
    case "list":
      const alerts = await listRateAlerts();
      if (alerts.length === 0) {
        console.log("No alerts configured.");
      } else {
        console.log("Active alerts:");
        alerts.forEach(alert => {
          console.log(`  ${alert.id}: ${alert.from}/${alert.to} ${alert.direction} ${alert.threshold} (${alert.active ? 'active' : 'inactive'})`);
        });
      }
      break;
      
    case "remove":
      const [removeAlertId] = args;
      if (!removeAlertId) {
        console.error("Usage: sosx alert remove <ID>");
        return;
      }
      await removeRateAlert(removeAlertId);
      console.log(`Alert ${removeAlertId} removed.`);
      break;
      
    default:
      console.error("Usage: sosx alert <set|list|remove> ...");
  }
}

async function handleMonitor(): Promise<void> {
  console.log("Starting alert monitoring...");
  startAlertMonitoring();
  console.log("Alert monitoring started. Press Ctrl+C to stop.");
  
  // Keep the process running
  process.on('SIGINT', () => {
    console.log("\nStopping alert monitoring...");
    process.exit(0);
  });
  
  // Prevent the process from exiting
  setInterval(() => {}, 1000);
}

async function handleStream(params: string[]): Promise<void> {
  const port = params[0] ? parseInt(params[0]) : 8080;
  console.log(`Starting WebSocket rate stream server on port ${port}...`);
  
  const server = new RateStreamServer(port);
  server.startUpdates();
  
  console.log("Rate stream server started. Press Ctrl+C to stop.");
  
  process.on('SIGINT', () => {
    console.log("\nStopping rate stream server...");
    server.close();
    process.exit(0);
  });
}

async function handleTransfer(params: string[]): Promise<void> {
  const [amountStr, from, to, provider, method] = params;
  if (!amountStr || !from || !to || !provider || !method) {
    console.error("Usage: sosx transfer <AMOUNT> <FROM> <TO> <PROVIDER> <METHOD>");
    return;
  }
  
  const result = await calculateTransferFee({
    amount: Number(amountStr),
    from: from as ISO4217,
    to: to as ISO4217,
    provider: provider as TransferFeeOptions['provider'],
    method: method as TransferFeeOptions['method']
  });
  
  console.log(`Transfer Fee Calculation:`);
  console.log(`Provider: ${result.provider}`);
  console.log(`Fee: $${result.fee.toFixed(2)}`);
  console.log(`Exchange Rate: ${result.exchangeRate.toFixed(6)}`);
  console.log(`Total Cost: $${result.totalCost.toFixed(2)}`);
  console.log(`Recipient Gets: ${result.recipientAmount.toFixed(2)}`);
  console.log(`Estimated Time: ${result.estimatedTime}`);
}

async function handleCompare(params: string[]): Promise<void> {
  const [amountStr, from, to, method] = params;
  if (!amountStr || !from || !to || !method) {
    console.error("Usage: sosx compare <AMOUNT> <FROM> <TO> <METHOD>");
    return;
  }
  
  const results = await compareTransferOptions(
    Number(amountStr),
    from as ISO4217,
    to as ISO4217,
    method as TransferFeeOptions['method']
  );
  
  console.log(`Transfer comparison for ${method}:`);
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.provider}:`);
    console.log(`   Fee: $${result.fee.toFixed(2)}`);
    console.log(`   Total Cost: $${result.totalCost.toFixed(2)}`);
    console.log(`   Recipient Gets: ${result.recipientAmount.toFixed(2)}`);
    console.log(`   Time: ${result.estimatedTime}`);
  });
}

async function handleBest(params: string[]): Promise<void> {
  const [amountStr, from, to] = params;
  if (!amountStr || !from || !to) {
    console.error("Usage: sosx best <AMOUNT> <FROM> <TO>");
    return;
  }
  
  const { method, result } = await getBestTransferOption(
    Number(amountStr),
    from as ISO4217,
    to as ISO4217
  );
  
  console.log(`Best transfer option:`);
  console.log(`Method: ${method}`);
  console.log(`Provider: ${result.provider}`);
  console.log(`Fee: $${result.fee.toFixed(2)}`);
  console.log(`Total Cost: $${result.totalCost.toFixed(2)}`);
  console.log(`Recipient Gets: ${result.recipientAmount.toFixed(2)}`);
  console.log(`Time: ${result.estimatedTime}`);
}

async function handleAnalyze(params: string[]): Promise<void> {
  const [from, to, period] = params;
  if (!from || !to) {
    console.error("Usage: sosx analyze <FROM> <TO> [PERIOD]");
    return;
  }
  
  const analysis = await analyzeMarket(from as ISO4217, to as ISO4217, period || '30d');
  
  console.log(`Market Analysis for ${from}/${to}:`);
  console.log(`Volatility: ${(analysis.volatility * 100).toFixed(2)}%`);
  console.log(`Trend: ${analysis.trend}`);
  console.log(`Support: ${analysis.support.toFixed(6)}`);
  console.log(`Resistance: ${analysis.resistance.toFixed(6)}`);
  console.log(`RSI: ${analysis.rsi.toFixed(2)}`);
  console.log(`SMA (7/14/30): ${analysis.sma.map(v => v.toFixed(6)).join(' / ')}`);
  console.log(`EMA (7/14/30): ${analysis.ema.map(v => v.toFixed(6)).join(' / ')}`);
}

async function handleSomalia(): Promise<void> {
  const data = await getSomaliaMarketData();
  
  console.log("Somalia Regional Market Data:");
  Object.entries(data.regions).forEach(([region, info]) => {
    console.log(`\n${region.toUpperCase()}:`);
    console.log(`  Official Rate: ${info.officialRate}`);
    if (info.blackMarketRate) {
      console.log(`  Black Market Rate: ${info.blackMarketRate}`);
      console.log(`  Spread: ${(info.spread * 100).toFixed(1)}%`);
    }
    console.log(`  Daily Volume: $${info.volume.toLocaleString()}`);
    console.log(`  Last Updated: ${info.lastUpdated.toLocaleString()}`);
  });
}

async function handleAnomaly(params: string[]): Promise<void> {
  const [from, to, thresholdStr, window] = params;
  if (!from || !to) {
    console.error("Usage: sosx anomaly <FROM> <TO> [THRESHOLD] [WINDOW]");
    return;
  }
  
  const threshold = thresholdStr ? Number(thresholdStr) : 0.05;
  const timeWindow = window || '1h';
  
  const { detectAnomalies } = await import('./analysis.js');
  const result = await detectAnomalies(from as ISO4217, to as ISO4217, { threshold, timeWindow });
  
  console.log(result.message);
  if (result.anomaly) {
    console.log(`Deviation: ${(result.deviation * 100).toFixed(2)}%`);
  }
}

async function handleExport(params: string[]): Promise<void> {
  const [format, currenciesStr, period, ...flags] = params;
  if (!format || !currenciesStr || !period) {
    console.error("Usage: sosx export <FORMAT> <CURRENCIES> <PERIOD> [--output FILE]");
    return;
  }
  
  const currencies = currenciesStr.split(',') as ISO4217[];
  const outputIndex = flags.indexOf('--output');
  const output = outputIndex >= 0 ? flags[outputIndex + 1] : undefined;
  
  const exportOptions: any = {
    format: format as any,
    currencies,
    period
  };
  if (output) {
    exportOptions.output = output;
  }
  const filename = await exportRates(exportOptions);
  
  console.log(`Data exported to: ${filename}`);
}

async function handleReport(params: string[]): Promise<void> {
  const [currenciesStr, period, ...flags] = params;
  if (!currenciesStr || !period) {
    console.error("Usage: sosx report <CURRENCIES> <PERIOD> [--output FILE]");
    return;
  }
  
  const currencies = currenciesStr.split(',') as ISO4217[];
  const outputIndex = flags.indexOf('--output');
  const output = outputIndex >= 0 ? flags[outputIndex + 1] : undefined;
  
  const filename = await exportAnalysisReport(currencies, period, output);
  console.log(`Analysis report exported to: ${filename}`);
}

async function handleConfig(params: string[]): Promise<void> {
  const [action, key, value] = params;
  
  if (!action) {
    const config = getUserConfig();
    console.log("Current configuration:");
    console.log(JSON.stringify(config, null, 2));
    return;
  }
  
  switch (action) {
    case "wizard":
      await runConfigWizard();
      break;
    case "set":
      if (!key || !value) {
        console.error("Usage: sosx config set <KEY> <VALUE>");
        return;
      }
      console.log(`Setting ${key} = ${value} (not implemented yet)`);
      break;
    case "language":
      if (!key) {
        console.error("Usage: sosx config language <LANGUAGE>");
        return;
      }
      console.log(`Setting language to ${key} (not implemented yet)`);
      break;
    default:
      console.error("Usage: sosx config [wizard|set|language]");
  }
}

function showCommandHelp(command: string): void {
  // Command-specific help would go here
  console.log(`Help for command: ${command}`);
  console.log("(Detailed help not implemented yet)");
}

// Only run main if this file is executed directly
if (require.main === module) {
  main();
}
