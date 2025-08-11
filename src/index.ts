import os from "node:os";
import path from "node:path";
import { ExchangerateHostProvider } from "./providers/exchangeratehost";
import seed from "./data/seed.json";
import { tryReadJSON, tryWriteJSON, nice } from "./utils";
import { getMemoryCache, setMemoryCache, Cached } from "./cache";
import type { ISO4217, RateTable, GetRateOptions } from "./types";

// Export all types
export * from "./types";

// Export all modules
export * from "./historical";
export * from "./alerts";
export * from "./transfer-fees";
export * from "./analysis";
export * from "./localization";
export * from "./export";
export * from "./config";
export * from "./realtime";
export * from "./providers/manager";

/** Default persistent cache path: ~/.sosx/cache.json */
function defaultPersistPath() {
  return path.join(os.homedir(), ".sosx", "cache.json");
}

async function readCache(persistPath?: string): Promise<Cached | null> {
  const mem = getMemoryCache();
  if (mem) return mem;
  if (persistPath) return (await tryReadJSON<Cached>(persistPath));
  return null;
}

async function writeCache(c: Cached, persistPath?: string) {
  setMemoryCache(c);
  if (persistPath) await tryWriteJSON(persistPath, c);
}

/** Load rates (1 SOS in currency X), honoring cache/ttl/offline. */
export async function getRates(options: GetRateOptions = {}): Promise<RateTable> {
  const {
    provider = new ExchangerateHostProvider(),
    ttlMs = 1000 * 60 * 60 * 6, // 6 hours
    persistPath = defaultPersistPath(),
    offline = false
  } = options;

  const cached = await readCache(persistPath);
  const fresh = cached && (Date.now() - cached.at) < ttlMs;
  if (fresh) return cached!.rates;

  if (offline) {
    // return seed or stale cache if present
    if (cached) return cached.rates;
    return seed as RateTable;
  }

  try {
    const live = await provider.fetchRatesSOS();
    const c: Cached = { at: Date.now(), rates: live };
    await writeCache(c, persistPath);
    return live;
  } catch {
    // Fallback to cache, then seed
    if (cached) return cached.rates;
    return seed as RateTable;
  }
}

/** Get single rate: 1 SOS in target currency. */
export async function getRate(target: ISO4217, options?: GetRateOptions): Promise<number> {
  const table = await getRates(options);
  return table[target];
}

/** Convert amount between any two currencies using SOS as pivot. */
export async function convert(amount: number, from: ISO4217, to: ISO4217, options?: GetRateOptions): Promise<number> {
  if (from === to) return amount;
  const table = await getRates(options); // 1 SOS in X
  if (from === "SOS") {
    return amount * table[to];
  }
  if (to === "SOS") {
    // amount in FROM → SOS
    // 1 SOS in FROM = table[FROM] -> so 1 FROM = 1 / table[FROM] SOS
    return amount * (1 / table[from]);
  }
  // FROM -> SOS -> TO
  const inSOS = amount * (1 / table[from]);
  return inSOS * table[to];
}

/** Format a number in Somali Shillings (Sh.). */
export function formatSOS(value: number): string {
  return new Intl.NumberFormat("so-SO", { style: "currency", currency: "SOS", currencyDisplay: "symbol" }).format(value);
}

/** Format any ISO currency in Somali locale. */
export function formatCurrency(value: number, currency: ISO4217): string {
  return new Intl.NumberFormat("so-SO", { style: "currency", currency, currencyDisplay: "symbol" }).format(value);
}

/** Convenience helper: get compact string like '100 USD = Sh. 5,700,000' */
export async function quote(from: ISO4217, to: ISO4217, amount = 1, options?: GetRateOptions): Promise<string> {
  const out = await convert(amount, from, to, options);
  const left = formatCurrency(amount, from);
  const right = to === "SOS" ? formatSOS(nice(out)) : formatCurrency(nice(out), to);
  return `${left} = ${right}`;
}
