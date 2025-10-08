import { APIRequestContext, expect, request } from '@playwright/test';

export type Tokens = { access: string; refresh: string };
export type User = { id: string; email: string; name: string; tokens: Tokens };

export async function api(baseURL: string) {
  return await request.newContext({ baseURL, extraHTTPHeaders: { 'Content-Type': 'application/json' } });
}

export async function register(t: APIRequestContext, email: string, name = 'User', password = 'password123'): Promise<User> {
  const r = await t.post('/auth/register', { data: { email, name, password } });
  expect(r.ok()).toBeTruthy();
  const tokens = await r.json() as Tokens;

  // Get user ID from /me endpoint
  const me = await t.get('/me', { headers: { Authorization: `Bearer ${tokens.access}` } });
  expect(me.ok()).toBeTruthy();
  const userData = await me.json();
  const userId = userData.id;

  return { id: userId, email, name, tokens };
}

export async function authCtx(baseURL: string, access: string) {
  return await request.newContext({
    baseURL,
    extraHTTPHeaders: { 'Content-Type': 'application/json', Authorization: `Bearer ${access}` }
  });
}

export async function createGroup(t: APIRequestContext, name: string, currency: string, ownerUserId: string) {
  const r = await t.post('/groups', { data: { name, currency, ownerUserId } });
  expect(r.ok()).toBeTruthy();
  return await r.json(); // { id, ... }
}

export async function addMemberDirect(t: APIRequestContext, groupId: string, userId: string, role = 'member') {
  // Add member directly to group (bypassing invites for E2E simplicity)
  const r = await t.post(`/groups/${groupId}/members`, { data: { userId, role } });
  expect(r.ok()).toBeTruthy();
  return await r.json();
}

export async function createExpense(t: APIRequestContext, groupId: string, paidById: string, totalCents: number, note = '') {
  const r = await t.post(`/groups/${groupId}/expenses`, { data: {
    paidById, totalCents, currency: 'USD', mode: 'equal', note
  }});
  expect(r.ok()).toBeTruthy();
  return await r.json();
}

export async function balances(t: APIRequestContext, groupId: string) {
  const r = await t.get(`/groups/${groupId}/balances`);
  expect(r.ok()).toBeTruthy();
  return await r.json();
}

export async function suggestSettle(t: APIRequestContext, groupId: string) {
  const r = await t.post(`/groups/${groupId}/settlements:suggest`, { data: {} });
  expect(r.ok()).toBeTruthy();
  return await r.json();
}

export async function settle(t: APIRequestContext, groupId: string, fromUserId: string, toUserId: string, amountCents: number) {
  const r = await t.post(`/groups/${groupId}/settlements`, { data: {
    fromUserId, toUserId, amountCents, currency: 'USD', note: 'E2E'
  }});
  expect(r.ok()).toBeTruthy();
  return await r.json();
}
