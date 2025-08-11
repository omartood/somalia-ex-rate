# 🇸🇴 Somali Exchange Rates (SOS) - Complete Financial Platform

A comprehensive TypeScript library and CLI tool for Somali Shilling (SOS) exchange rates with advanced financial features, real-time monitoring, and multi-language support.

## ✨ Features

### 🌐 **Core Exchange Rate Features**

- **Real-time exchange rates** from multiple providers (exchangerate.host, Fixer.io, CurrencyAPI)
- **Smart caching** with configurable TTL and persistent storage
- **Offline fallback** using seed data when network is unavailable
- **Multi-currency support** for 10 major currencies
- **Historical data** with 90-day cache and trend analysis

### 📊 **Advanced Financial Tools**

- **Market analysis** with volatility, RSI, SMA/EMA indicators
- **Transfer fee calculator** for Western Union, Remitly, WorldRemit, Wise
- **Rate alerts** with email/webhook notifications
- **Anomaly detection** for unusual rate changes
- **Somalia regional data** with black market rates

### 🔄 **Real-time & Monitoring**

- **WebSocket streaming** for live rate updates
- **Alert monitoring** with cron-based scheduling
- **Interactive TUI** (Terminal User Interface)
- **Rate prediction** using historical analysis

### 🌍 **Localization & Accessibility**

- **Multi-language support** (English, Somali, Arabic)
- **Localized formatting** with proper currency symbols
- **Cultural adaptation** for Somali financial practices
- **Islamic finance compliance** considerations

### 📈 **Export & Reporting**

- **Multiple export formats** (CSV, Excel, JSON, PDF/HTML)
- **Analysis reports** with market insights
- **Historical data export** with customizable periods
- **Automated report generation**

### ⚙️ **Configuration & Extensibility**

- **User configuration** with wizard setup
- **Plugin system** for custom providers
- **Database integration** (SQLite, PostgreSQL, MongoDB)
- **API key management** with rotation support

## Supported Currencies

- **SOS** - Somali Shilling (base currency)
- **USD** - US Dollar
- **EUR** - Euro
- **GBP** - British Pound
- **KES** - Kenyan Shilling
- **ETB** - Ethiopian Birr
- **AED** - UAE Dirham
- **SAR** - Saudi Riyal
- **TRY** - Turkish Lira
- **CNY** - Chinese Yuan

## Installation

```bash
npm install somali-exchange-rates
```

## 🖥️ CLI Usage

### Basic Commands

```bash
# Show help
npx sosx help

# Convert currencies (raw number output)
npx sosx rate USD SOS 100
# Output: 57142.857142857145

# Get formatted quotes
npx sosx quote USD SOS 100
# Output: US$100.00 = S 57,143

# Show all current rates
npx sosx rates
```

### 📊 Historical Data & Analysis

```bash
# Get rate history
npx sosx history USD 30        # Last 30 days
npx sosx historical 2024-01-15 # Specific date

# Calculate volatility
npx sosx volatility USD 30d

# Market analysis
npx sosx analyze USD SOS 30d

# Somalia regional data
npx sosx somalia

# Detect anomalies
npx sosx anomaly USD SOS 0.05 1h
```

### 🚨 Alerts & Monitoring

```bash
# Set rate alerts
npx sosx alert set USD SOS 600 above --email user@example.com
npx sosx alert set EUR SOS 650 below --webhook https://api.example.com/webhook

# List and manage alerts
npx sosx alert list
npx sosx alert remove alert-id-123

# Start monitoring
npx sosx monitor

# Interactive terminal UI
npx sosx tui

# WebSocket rate stream server
npx sosx stream 8080
```

### 💸 Transfer Fee Calculator

```bash
# Calculate transfer fees
npx sosx transfer 1000 USD SOS remitly mobile-money

# Compare providers for a method
npx sosx compare 1000 USD SOS bank-transfer

# Find best transfer option
npx sosx best 1000 USD SOS
```

### 📈 Export & Reporting

```bash
# Export rate data
npx sosx export csv USD,EUR,GBP 30d --output rates.csv
npx sosx export xlsx USD,EUR,GBP 90d --output quarterly-rates.xlsx

# Generate analysis reports
npx sosx report USD,EUR,GBP 30d --output analysis.xlsx
```

### ⚙️ Configuration

```bash
# Show current config
npx sosx config

# Run setup wizard
npx sosx config wizard

# Set language
npx sosx config language so  # Somali
npx sosx config language ar  # Arabic
npx sosx config language en  # English
```

## Library API

### Basic Usage

```javascript
import { getRates, convert, quote, formatSOS } from "somali-exchange-rates";

// Get all current exchange rates
const rates = await getRates();
console.log(rates);
// { SOS: 1, USD: 0.00175, EUR: 0.0016, ... }

// Convert between currencies
const sosAmount = await convert(100, "USD", "SOS");
console.log(sosAmount); // 57142.857142857145

// Get formatted quote
const quote = await quote("USD", "SOS", 100);
console.log(quote); // "US$100.00 = S 57,143"

// Format SOS currency
const formatted = formatSOS(50000);
console.log(formatted); // "S 50,000"
```

### Advanced Usage

```javascript
import { getRates, convert } from "somali-exchange-rates";

// Use offline mode (seed data only)
const offlineRates = await getRates({ offline: true });

// Custom cache settings
const rates = await getRates({
  ttlMs: 1000 * 60 * 30, // 30 minutes cache
  persistPath: "./my-cache.json",
});

// Convert with custom options
const amount = await convert(100, "USD", "EUR", {
  offline: true,
  ttlMs: 1000 * 60 * 60, // 1 hour cache
});
```

## API Reference

### `getRates(options?)`

Fetches current exchange rates with caching support.

**Parameters:**

- `options.provider?` - Custom rate provider (default: exchangerate.host)
- `options.ttlMs?` - Cache TTL in milliseconds (default: 6 hours)
- `options.persistPath?` - Cache file path (default: ~/.sosx/cache.json)
- `options.offline?` - Use offline/seed data only (default: false)

**Returns:** `Promise<RateTable>` - Object with currency codes as keys and rates as values

### `getRate(currency, options?)`

Gets the exchange rate for a specific currency.

**Parameters:**

- `currency` - Target currency code (ISO4217)
- `options` - Same as `getRates()`

**Returns:** `Promise<number>` - Exchange rate (1 SOS in target currency)

### `convert(amount, from, to, options?)`

Converts an amount between any two supported currencies.

**Parameters:**

- `amount` - Amount to convert
- `from` - Source currency code
- `to` - Target currency code
- `options` - Same as `getRates()`

**Returns:** `Promise<number>` - Converted amount

### `quote(from, to, amount?, options?)`

Gets a formatted conversion quote string.

**Parameters:**

- `from` - Source currency code
- `to` - Target currency code
- `amount?` - Amount to convert (default: 1)
- `options` - Same as `getRates()`

**Returns:** `Promise<string>` - Formatted quote (e.g., "US$100.00 = S 57,143")

### `formatSOS(amount)`

Formats an amount as Somali Shillings.

**Parameters:**

- `amount` - Amount to format

**Returns:** `string` - Formatted SOS amount (e.g., "S 1,000")

### `formatCurrency(amount, currency)`

Formats an amount in any supported currency.

**Parameters:**

- `amount` - Amount to format
- `currency` - Currency code

**Returns:** `string` - Formatted currency amount

## Caching

The library automatically caches exchange rates to improve performance and reduce API calls:

- **Default TTL:** 6 hours
- **Cache location:** `~/.sosx/cache.json`
- **Memory cache:** In-memory caching for the current session
- **Fallback:** Uses cached data when API is unavailable

## Offline Support

When the network is unavailable or `offline: true` is specified, the library falls back to:

1. **Cached data** (if available)
2. **Seed data** (built-in exchange rates)

This ensures the library works even without internet connectivity.

## Error Handling

The library gracefully handles various error scenarios:

- **Network failures** → Falls back to cache or seed data
- **Invalid API responses** → Uses fallback data
- **Missing cache files** → Creates directories automatically
- **Invalid currency codes** → TypeScript prevents at compile time

## Development

### Setup

```bash
git clone <repository-url>
cd somali-exchange-rates
npm install
```

### Scripts

```bash
# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test -- --coverage

# Build and test (pre-publish)
npm run prepublishOnly
```

### Testing

The project includes comprehensive tests with 92.95% code coverage:

```bash
npm test
```

Test files are located in `src/__tests__/` and cover:

- Core API functionality
- CLI interface
- Error handling
- Caching mechanisms
- Provider integration
- Utility functions

## Examples

### Demo Script

```javascript
const {
  getRates,
  convert,
  quote,
  formatSOS,
} = require("somali-exchange-rates");

async function demo() {
  // Get current rates
  const rates = await getRates();
  console.log("Current rates:", rates);

  // Convert currencies
  const usdToSos = await convert(100, "USD", "SOS");
  console.log(`$100 = ${formatSOS(usdToSos)}`);

  // Get formatted quotes
  const quote1 = await quote("EUR", "SOS", 50);
  console.log(quote1); // "€50.00 = S 31,250"

  // Offline mode
  const offlineQuote = await quote("USD", "SOS", 1, { offline: true });
  console.log("Offline:", offlineQuote);
}

demo();
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## Support

For issues, questions, or contributions, please visit the project repository.

---

**Note:** Exchange rates are provided by exchangerate.host and are for informational purposes only. Always verify rates with official financial institutions for important transactions.
