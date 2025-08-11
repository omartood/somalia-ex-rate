import fs from "node:fs/promises";
import path from "node:path";
import { RateTable } from "./types";

export async function tryReadJSON<T>(p: string): Promise<T | null> {
  try { const raw = await fs.readFile(p, "utf8"); return JSON.parse(raw) as T; }
  catch { return null; }
}

export async function tryWriteJSON<T>(p: string, data: T) {
  try {
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, JSON.stringify(data, null, 2), "utf8");
  } catch { /* ignore */ }
}

/** Invert a rate table: if table is 1 USD -> X, make it 1 SOS -> X etc. */
export function invert(baseToOthers: Record<string, number>, sosPerBase: number): RateTable {
  // baseToOthers[k] = 1 BASE in k
  // We want: 1 SOS in k = (1 BASE in k) / (sosPerBase)
  const out: any = {};
  for (const [k, v] of Object.entries(baseToOthers)) {
    out[k] = v / sosPerBase;
  }
  return out as RateTable;
}

/** Clamp a number to 2–6 decimals for nicer output */
export function nice(n: number): number {
  return Number(n.toFixed(n < 1 ? 4 : 2));
}
