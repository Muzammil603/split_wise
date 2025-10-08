export type Balance = { userId: string; balanceCents: number };
export type Transfer = { fromUserId: string; toUserId: string; amountCents: number };

/**
 * Greedy settlement suggestion:
 * - Converts negative balances (debtors) to pay positives (creditors)
 * - Produces a minimal number of transfers for exact netting
 * - Assumes sum(balances) === 0 (or near-0 after rounding)
 */
export function suggestTransfers(balances: Balance[]): Transfer[] {
  const debtors = balances
    .filter(b => b.balanceCents < 0)
    .map(d => ({ userId: d.userId, amt: -d.balanceCents }));
  const creditors = balances
    .filter(b => b.balanceCents > 0)
    .map(c => ({ userId: c.userId, amt: c.balanceCents }));

  // Optional: stable sort for deterministic output
  debtors.sort((a, b) => a.userId.localeCompare(b.userId));
  creditors.sort((a, b) => a.userId.localeCompare(b.userId));

  const out: Transfer[] = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    if (pay > 0) {
      out.push({ fromUserId: debtors[i].userId, toUserId: creditors[j].userId, amountCents: pay });
      debtors[i].amt -= pay;
      creditors[j].amt -= pay;
    }
    if (debtors[i].amt === 0) i++;
    if (creditors[j].amt === 0) j++;
  }
  return out;
}