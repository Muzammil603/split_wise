export function ttl(seconds: number) { 
  return seconds; 
}

/** Build stable keys */
export const cacheKey = {
  balances: (groupId: string) => `g:${groupId}:balances:v1`,
  expensesFirstPage: (groupId: string, limit: number) => `g:${groupId}:exp:first:${limit}:v1`,
};

/** Minimal SWR: serve cached, then refresh in background if stale soon */
export function nearExpiry(ttlLeftSec: number, thresholdSec = 2) {
  return ttlLeftSec <= thresholdSec;
}
