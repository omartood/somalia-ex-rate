import { RateTable } from "./types";

export type Cached = {
  at: number;
  rates: RateTable;
};

let memoryCache: Cached | null = null;

export function getMemoryCache(): Cached | null {
  return memoryCache;
}

export function setMemoryCache(c: Cached) {
  memoryCache = c;
}
