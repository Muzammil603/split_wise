export type Allocation = { userId: string; amountCents: number };

// Backward-compatible input for equalSplit
export type EqualSplitInput = { totalCents: number; userIds: string[] };

/**
 * Evenly distributes `totalCents` across `userIds`.
 * Overloads support either (totalCents, userIds) or ({ totalCents, userIds }).
 */
export function equalSplit(totalCents: number, userIds: string[]): Allocation[];
export function equalSplit(input: EqualSplitInput): Allocation[];
export function equalSplit(
  a: number | EqualSplitInput,
  b?: string[],
): Allocation[] {
  const totalCents = typeof a === 'number' ? a : a.totalCents;
  const userIds    = Array.isArray(b) ? b : (a as EqualSplitInput).userIds;
  const n = Math.max(userIds.length, 1);
  const base = Math.floor(totalCents / n);
  let remainder = totalCents - base * n;
  return userIds.map((userId) => ({
    userId,
    amountCents: base + (remainder-- > 0 ? 1 : 0),
  }));
}

/**
 * Splits by integer "shares" (a.k.a. weights). Accepts either `share` or `shares` key.
 */
export function sharesSplit(
  totalCents: number,
  shares: { userId: string; share?: number; shares?: number }[],
): Allocation[] {
  const normalized = shares.map((s) => ({ userId: s.userId, share: s.share ?? s.shares ?? 0 }));
  const totalShares = normalized.reduce((a, s) => a + s.share, 0) || 1;

  let allocated = 0;
  const out = normalized.map((s) => {
    const amt = Math.floor((totalCents * s.share) / totalShares);
    allocated += amt;
    return { userId: s.userId, amountCents: amt } as Allocation;
  });

  // Distribute any remainder by index for determinism
  let remainder = totalCents - allocated;
  for (let i = 0; i < remainder; i++) out[i % out.length].amountCents += 1;
  return out;
}

/**
 * Splits by percentages that should sum to ~100. We tolerate tiny rounding drift.
 */
export function percentSplit(
  totalCents: number,
  percents: { userId: string; percent: number }[],
): Allocation[] {
  const totalPercent = percents.reduce((a, p) => a + p.percent, 0);
  // Allow minor floating/rounding differences (e.g., 99.999 or 100.001)
  if (Math.round(totalPercent) !== 100) throw new Error('Percent must sum to 100');

  let allocated = 0;
  const out = percents.map((p) => {
    const amt = Math.floor((totalCents * p.percent) / 100);
    allocated += amt;
    return { userId: p.userId, amountCents: amt } as Allocation;
  });

  // Distribute leftover cents deterministically
  let remainder = totalCents - allocated;
  for (let i = 0; i < remainder; i++) out[i % out.length].amountCents += 1;
  return out;
}
