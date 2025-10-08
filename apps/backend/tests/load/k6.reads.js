import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const GROUPS = (__ENV.GROUP_IDS || '').split(',').filter(Boolean);
const TOKENS = (__ENV.TOKENS || '').split(',').filter(Boolean);

export const options = {
  scenarios: {
    reads_mixed: {
      executor: 'ramping-arrival-rate',
      startRate: 20, timeUnit: '1s',
      preAllocatedVUs: 50, maxVUs: 300,
      stages: [
        { target: 100, duration: '1m' },
        { target: 200, duration: '2m' },
        { target: 0,   duration: '30s' },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<250'],
  },
};

export default function () {
  if (GROUPS.length === 0 || TOKENS.length === 0) {
    console.error('Missing required environment variables');
    return;
  }
  
  const gi = Math.floor(Math.random() * GROUPS.length);
  const groupId = GROUPS[gi];
  const token = TOKENS[gi % TOKENS.length];

  // balances
  const r1 = http.get(`${BASE}/groups/${groupId}/balances`, { 
    headers: { Authorization: `Bearer ${token}` },
    timeout: '10s'
  });
  check(r1, { 'balances ok': r => r.status === 200 });

  // latest expenses page
  const r2 = http.get(`${BASE}/groups/${groupId}/expenses?limit=20`, { 
    headers: { Authorization: `Bearer ${token}` },
    timeout: '10s'
  });
  check(r2, { 'expenses ok': r => r.status === 200 });

  sleep(0.05);
}
