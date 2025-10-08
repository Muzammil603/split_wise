import { test, expect } from '@playwright/test';
import { api, authCtx, register, createGroup } from './_utils';

test('idempotent POST /expenses', async ({ baseURL }) => {
  const t = await api(baseURL!);
  const alice = await register(t, `idem+${Date.now()}+${Math.random()}@example.com`, 'Idem Alice');
  const a = await authCtx(baseURL!, alice.tokens.access);
  const g = await createGroup(a, 'Idem Test', 'USD', alice.id);

  const payload = { paidById: alice.id, totalCents: 1234, currency: 'USD', mode: 'equal', note: 'Idempotency test' };
  const headers = { 'Idempotency-Key': `k-test-${alice.id}-${Date.now()}` };

  const r1 = await a.post(`/groups/${g.id}/expenses`, { data: payload, headers });
  expect(r1.ok()).toBeTruthy();
  const j1 = await r1.json();

  const r2 = await a.post(`/groups/${g.id}/expenses`, { data: payload, headers });
  expect(r2.ok()).toBeTruthy();
  const j2 = await r2.json();

  expect(j2.id).toBe(j1.id); // same expense
});
