import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/v1';
const STAFF_EMAIL = __ENV.STAFF_EMAIL || 'staff@stanforte.com';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@stanforte.com';
const PASSWORD = __ENV.PASSWORD || 'Password123!';

export const options = {
  scenarios: {
    // 1. Morning 9:00 AM Attendance Clock-In Surge (200 concurrent users in 10s)
    morning_clockin_burst: {
      executor: 'ramping-vus',
      exec: 'clockInBurst',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 200 },
        { duration: '20s', target: 200 },
        { duration: '10s', target: 0 },
      ],
    },
    // 2. Sustained Dashboard & Catalog Load
    sustained_dashboard: {
      executor: 'constant-arrival-rate',
      exec: 'dashboardRead',
      rate: 50,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 40,
      maxVUs: 120,
      startTime: '45s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:clockin}': ['p(95)<500', 'p(99)<1200'],
    'http_req_duration{endpoint:dashboard}': ['p(95)<300', 'p(99)<800'],
    errors: ['rate<0.01'],
  },
};

export function setup() {
  const staffLogin = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: STAFF_EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  const adminLogin = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: ADMIN_EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(staffLogin, { 'staff setup login ok': (r) => r.status === 200 || r.status === 201 });
  check(adminLogin, { 'admin setup login ok': (r) => r.status === 200 || r.status === 201 });

  return {
    staffCookie: staffLogin.headers['Set-Cookie'],
    adminCookie: adminLogin.headers['Set-Cookie'],
  };
}

export function clockInBurst(data) {
  const headers = { 'Content-Type': 'application/json', Cookie: data.staffCookie };

  const statusRes = http.get(`${BASE_URL}/attendance/status`, {
    headers,
    tags: { endpoint: 'clockin' },
  });
  const clockRes = http.post(
    `${BASE_URL}/attendance/clock-in`,
    JSON.stringify({ attendance_mode: 'remote' }),
    { headers, tags: { endpoint: 'clockin' } },
  );

  const ok =
    check(statusRes, { 'status 200': (r) => r.status === 200 }) &&
    check(clockRes, { 'clock-in non-5xx': (r) => r.status < 500 });
  errorRate.add(!ok);
  sleep(0.5);
}

export function dashboardRead(data) {
  const headers = { Cookie: data.adminCookie };
  const responses = http.batch([
    ['GET', `${BASE_URL}/auth/status`, null, { headers, tags: { endpoint: 'dashboard' } }],
    ['GET', `${BASE_URL}/attendance/summary`, null, { headers, tags: { endpoint: 'dashboard' } }],
    ['GET', `${BASE_URL}/requests/types`, null, { headers, tags: { endpoint: 'dashboard' } }],
    ['GET', `${BASE_URL}/requests?page=1&per_page=20`, null, { headers, tags: { endpoint: 'dashboard' } }],
  ]);

  const ok = responses.every((r) => r.status === 200);
  check(responses[0], { 'batch all 200': () => ok });
  errorRate.add(!ok);
}
