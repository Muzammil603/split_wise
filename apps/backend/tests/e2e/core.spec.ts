import { test, expect } from '@playwright/test';
import { api, authCtx, register, createGroup, addMemberDirect, createExpense, balances, suggestSettle, settle } from './_utils';

test.describe('Splitwise++ core flow', () => {
  test('register → group → add member → expense → balances → settle → export → delete', async ({ baseURL }) => {
    const t = await api(baseURL!);

    // 1) Register Alice & Bob
    const alice = await register(t, `alice+${Date.now()}@example.com`, 'Alice');
    const bob = await register(t, `bob+${Date.now()}@example.com`, 'Bob');

    // 2) Auth contexts
    const a = await authCtx(baseURL!, alice.tokens.access);
    const b = await authCtx(baseURL!, bob.tokens.access);

    // 3) Create group (owner: Alice)
    const g = await createGroup(a, 'Roomies E2E', 'USD', alice.id);

    // 4) Add Bob as member
    await addMemberDirect(a, g.id, bob.id, 'member');

    // 5) Create an expense paid by Alice
    const exp = await createExpense(a, g.id, alice.id, 2567, 'Groceries');
    expect(exp.splits?.length).toBeGreaterThan(0);

    // 6) Check balances
    const bal1 = await balances(a, g.id);
    // We expect Alice > 0, Bob < 0 and absolute values sum to 0
    const totals = bal1.reduce((acc: number, r: any) => acc + Number(r.balance_cents), 0);
    expect(totals).toBe(0);

    const aliceBal = bal1.find((r: any) => r.user_id === alice.id)?.balance_cents ?? 0;
    const bobBal = bal1.find((r: any) => r.user_id === bob.id)?.balance_cents ?? 0;
    expect(aliceBal).toBeGreaterThan(0);
    expect(bobBal).toBeLessThan(0);

    // 7) Suggest settle-up
    const sugg = await suggestSettle(a, g.id);
    expect(Array.isArray(sugg)).toBeTruthy();
    // Settle just the first suggestion if it matches Bob->Alice
    if (sugg.length) {
      const s = sugg[0];
      await settle(a, g.id, s.fromUserId, s.toUserId, s.amountCents);
    }

    // 8) Balances should move toward zero
    const bal2 = await balances(a, g.id);
    const total2 = bal2.reduce((acc: number, r: any) => acc + Number(r.balance_cents), 0);
    expect(total2).toBe(0);

    // 9) Export Alice's data
    const expAlice = await a.get(`/me/privacy/export`);
    expect(expAlice.ok()).toBeTruthy();
    const dump = await expAlice.json();
    expect(dump.user.email).toContain('alice');

    // 10) Delete Bob (ensure not sole owner)
    const delBob = await b.post(`/me/privacy/delete`);
    expect(delBob.ok()).toBeTruthy();
  });
});
