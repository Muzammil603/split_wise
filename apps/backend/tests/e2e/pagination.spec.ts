import { test, expect } from '@playwright/test';
import { api, authCtx, register, createGroup } from './_utils';

test('pagination works', async ({ baseURL }) => {
  const t = await api(baseURL!);
  const u = await register(t, `pagination+${Date.now()}+${Math.random()}@example.com`, 'Pagination User');
  const a = await authCtx(baseURL!, u.tokens.access);
  const g = await createGroup(a, 'Page Test', 'USD', u.id);

  // seed 25 expenses
  for (let i = 0; i < 25; i++) {
    await a.post(`/groups/${g.id}/expenses`, { data: {
      paidById: u.id, totalCents: 100 + i, currency: 'USD', mode: 'equal', note: `e${i}`
    }});
  }

  const p1 = await a.get(`/groups/${g.id}/expenses?limit=10`);
  const j1 = await p1.json();
  expect(j1.items.length).toBe(10);
  expect(j1.nextCursor).toBeTruthy();

  const p2 = await a.get(`/groups/${g.id}/expenses?limit=10&cursor=${encodeURIComponent(j1.nextCursor)}`);
  const j2 = await p2.json();
  expect(j2.items.length).toBe(10);

  const p3 = await a.get(`/groups/${g.id}/expenses?limit=10&cursor=${encodeURIComponent(j2.nextCursor)}`);
  const j3 = await p3.json();
  expect(j3.items.length).toBeLessThanOrEqual(10);
});
