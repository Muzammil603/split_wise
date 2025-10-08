import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomSeed, randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ENV you set before run:
// BASE_URL=http://localhost:3000
// GROUP_IDS=g1,g2,g3
// PAID_BY_IDS=u1,u2,u3 (user ids who are members of those groups)
// TOKENS=t1,t2,t3 (matching Bearer access tokens for those users)
const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const GROUPS = (__ENV.GROUP_IDS || '').split(',').filter(Boolean);
const USERS  = (__ENV.PAID_BY_IDS || '').split(',').filter(Boolean);
const TOKENS = (__ENV.TOKENS || '').split(',').filter(Boolean);

// randomSeed(42); // Commented out to avoid issues

console.log('Environment variables:', { BASE, GROUPS, USERS, TOKENS });

export const options = {
  scenarios: {
    ramp_writes: {
      executor: 'ramping-arrival-rate',
      startRate: 5, timeUnit: '1s',
      preAllocatedVUs: 50, maxVUs: 200,
      stages: [
        { target: 20, duration: '1m' },
        { target: 50, duration: '2m' },
        { target: 0,  duration: '30s' },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],            // <1% errors
    http_req_duration: ['p(95)<300'],          // p95 < 300ms
  },
};

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random()*16)|0, v = c === 'x' ? r : (r&0x3|0x8); return v.toString(16);
  });
}

export default function () {
  if (GROUPS.length === 0 || USERS.length === 0 || TOKENS.length === 0) {
    console.error('Missing required environment variables');
    return;
  }
  
  const gi = Math.floor(Math.random() * GROUPS.length);
  const groupId = GROUPS[gi];
  const paidById = USERS[gi % USERS.length];
  const token = TOKENS[gi % TOKENS.length];

  const totalCents = 100 + Math.floor(Math.random()*5000);
  const idem = 'k6-' + uuid();

  const res = http.post(`${BASE}/groups/${groupId}/expenses`, JSON.stringify({
    paidById, totalCents, currency: 'USD', mode: 'equal', note: 'k6'
  }), {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'Idempotency-Key': idem },
    timeout: '10s',
  });

  check(res, {
    '201/200': r => r.status === 201 || r.status === 200,
    'json ok': r => !!r.json('id'),
  });

  sleep(0.1);
}
