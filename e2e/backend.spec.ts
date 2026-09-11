import { test, expect, request, type APIRequestContext } from '@playwright/test';

/**
 * End-to-end backend verification against the running Portal API.
 *
 * Prerequisites (see repo docs / prior session):
 *  - docker compose up (postgres on 5433, redis, mailpit on 8025)
 *  - migrations applied, then run: seed:rbac, seed:first-user, seed:hr-leave-system
 *  - API built and running on http://localhost:3000
 *
 * The HR leave seed plants an approved leave request covering [today-1 .. today+6],
 * so "today" is always a leave day for the seeded staff member. Attendance status
 * tests therefore use weekdays strictly BEFORE the leave window.
 */

const BASE = 'http://localhost:3000/v1';
const MAILPIT = 'http://localhost:8025';

const ADMIN_EMAIL = 'admin@stanforteedge.com';
const STAFF_EMAIL = 'staff@stanforteedge.com';
const PASSWORD = 'ChangeMe123!';

// ── Date helpers (the API interprets bare datetimes in server-local time) ──
function fmt(d: Date): string {
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
function localTime(dateKey: string, hh = '09', mm = '00'): string {
  return `${dateKey}T${hh}:${mm}:00`;
}

// The attendance schedule is evaluated in UTC (atTime uses Date.UTC). Convert a
// desired UTC time-of-day into the local wall-clock string the API parses.
function utcLocalTime(dateKey: string, hh = '09', mm = '00'): string {
  const offsetMinutes = new Date().getTimezoneOffset();
  const total = Number(hh) * 60 + Number(mm) - offsetMinutes;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${dateKey}T${p(((h % 24) + 24) % 24)}:${p(m)}:00`;
}

// last `count` weekdays strictly before yesterday (outside the seeded leave window)
function weekdaysForTests(today: Date, count: number): string[] {
  const out: string[] = [];
  let cursor = addDays(today, -2);
  while (out.length < count) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) out.push(fmt(cursor));
    cursor = addDays(cursor, -1);
  }
  return out;
}

test.describe.configure({ mode: 'serial' });

let admin: APIRequestContext;
let staff: APIRequestContext;

const ids: Record<string, any> = {};

async function api(ctx: APIRequestContext, method: string, path: string, body?: any) {
  const res = await ctx.fetch(`${BASE}${path}`, {
    method,
    data: body,
    headers: { 'content-type': 'application/json' },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status(), ok: res.ok(), json };
}

async function app(ctx: APIRequestContext, method: string, path: string, body?: any) {
  const result = await api(ctx, method, path, body);
  expect(result.ok, `[${method} ${path}] ${result.status} ${JSON.stringify(result.json).slice(0, 300)}`).toBeTruthy();
  expect(result.json.success).toBe(true);
  return result.json.data !== undefined ? result.json.data : result.json;
}

test.beforeAll(async () => {
  admin = await request.newContext({ baseURL: BASE });
  staff = await request.newContext({ baseURL: BASE });
  const health = await api(admin, 'GET', '/health');
  expect(health.status).toBe(200);

  // Reset state mutated by previous runs so the suite is idempotent.
  const { createRequire } = await import('module');
  const requireFromApi = createRequire('/home/kokoserver/Documents/facity/Portal/apps/api/package.json');
  const { Pool } = requireFromApi('pg');
  const pool = new Pool({
    connectionString: 'postgresql://stanforte:stanforte-dev@localhost:5433/stanforte',
  });
  try {
    await pool.query('DELETE FROM sta_attendance_exceptions WHERE user_id = 2');
    await pool.query('DELETE FROM sta_attendance_corrections WHERE user_id = 2');
    await pool.query('DELETE FROM sta_attendance_entries WHERE user_id = 2');
    await pool.query('DELETE FROM sta_attendance_daily WHERE user_id = 2');
    await pool.query('DELETE FROM sta_leave_requests WHERE user_id = 2');
    await pool.query('DELETE FROM sta_notifications WHERE user_id = 2');
    await pool.query(`DELETE FROM sta_office_locations WHERE name LIKE 'Yaba Annex%'`);
  } finally {
    await pool.end();
  }
});

test('auth: login sets session cookies; status and tenants resolve', async () => {
  const adminLogin = await api(admin, 'POST', '/auth/login', { email: ADMIN_EMAIL, password: PASSWORD });
  expect(adminLogin.status).toBe(201);
  expect(adminLogin.json.data.user.roles).toContain('administrator');
  expect(adminLogin.json.data.user.permissions).toContain('*');

  const staffLogin = await api(staff, 'POST', '/auth/login', { email: STAFF_EMAIL, password: PASSWORD });
  expect(staffLogin.status).toBe(201);
  expect(staffLogin.json.data.user.roles).toContain('staff');
  ids.staffUserId = staffLogin.json.data.user.id;
  ids.adminUserId = adminLogin.json.data.user.id;

  const adminStatus = await app(admin, 'GET', '/auth/status');
  expect(adminStatus.tenant.slug).toBe('stanforte-demo');
  expect(adminStatus.roles).toContain('administrator');

  const tenants = await app(admin, 'GET', '/auth/tenants');
  expect(tenants.some((t: any) => t.slug === 'stanforte-demo')).toBe(true);

  // wrong password → 401
  const bad = await api(staff, 'POST', '/auth/login', { email: STAFF_EMAIL, password: 'wrong-pass' });
  expect(bad.status).toBe(401);
});

test('rbac + user admin surfaces are reachable (admin)', async () => {
  const roles = await app(admin, 'GET', '/admin/rbac/roles');
  const rows = Array.isArray(roles) ? roles : roles?.items ?? roles?.data ?? [];
  const names = rows.map((r: any) => r.name.toLowerCase());
  expect(names).toContain('administrator');
  expect(names).toContain('staff');

  const users = await app(admin, 'GET', '/admin/users');
  const userRows = Array.isArray(users) ? users : users?.items ?? users?.data ?? [];
  expect(userRows.some((u: any) => u?.email === STAFF_EMAIL)).toBe(true);
});

test('hr: office location create + link org + list/update', async () => {
  const existing = await app(admin, 'GET', '/hr/attendance/office-locations');
  const existingList = Array.isArray(existing) ? existing : existing?.data ?? [];
  const ikeja = existingList.find((l: any) => l.name === 'Ikeja HQ');
  expect(ikeja, 'Ikeja HQ seeded location present').toBeTruthy();
  ids.ikejaLocationId = ikeja.id;

  const created = await app(admin, 'POST', '/hr/attendance/office-locations', {
    name: 'Yaba Annex',
    address: '12 Herbert Macaulay, Yaba',
    latitude: 6.5097,
    longitude: 3.3675,
    radius_meters: 120,
    organization_ids: ['1'],
    primary_organization_id: '1',
  });
  ids.yabaLocationId = created.id;

  const updated = await app(admin, 'PATCH', `/hr/attendance/office-locations/${created.id}`, {
    name: 'Yaba Annex 2',
    radius_meters: 200,
    is_active: true,
  });
  expect(updated.name).toBe('Yaba Annex 2');
  expect(updated.radius_meters).toBe(200);
});

test('attendance: web clock-in/out on a past weekday yields present + geofence inside', async () => {
  const [webDate, lateDate, presentDate] = weekdaysForTests(new Date(), 3);
  ids.webDate = webDate;
  ids.lateDate = lateDate;
  ids.presentDate = presentDate;

  // web clock-in: onsite at the seeded Ikeja HQ (lat/lng inside radius)
  const cin = await app(staff, 'POST', '/hr/attendance/clock-in', {
    source: 'web',
    at: localTime(webDate, '09', '00'),
    attendance_mode: 'onsite',
    office_location_id: ids.ikejaLocationId,
    latitude: 6.5244,
    longitude: 3.3792,
  });
  expect(cin.daily.status).toBe('present');
  expect(cin.daily.late_minutes).toBe(0);

  // current_state is scoped to the requested range, so ask for the web date
  const mineBefore = await app(staff, 'GET', `/hr/attendance/me?from=${webDate}&to=${webDate}`);
  expect(mineBefore.current_state.is_clocked_in).toBe(true);
  expect(mineBefore.current_state.can_clock_out).toBe(true);

  const cout = await app(staff, 'POST', '/hr/attendance/clock-out', {
    source: 'web',
    at: localTime(webDate, '17', '00'),
    attendance_mode: 'onsite',
    office_location_id: ids.ikejaLocationId,
    latitude: 6.5244,
    longitude: 3.3792,
  });
  expect(cout.daily.worked_minutes).toBe(480);
  expect(cout.daily.overtime_minutes).toBe(0);

  // geofence 'inside' on the clock-in entry recorded for that day
  const mine = await app(staff, 'GET', `/hr/attendance/me?from=${webDate}&to=${webDate}`);
  const entry = mine.entries.find((e: any) => String(e.work_date).slice(0, 10) === webDate && e.entry_type === 'clock_in');
  expect(entry.geofence_status).toBe('inside');
  expect(entry.attendance_mode).toBe('onsite');
  expect(mine.daily.find((d: any) => String(d.work_date).slice(0, 10) === webDate).status).toBe('present');
});

test('attendance: import-based present/late days for the seeded staff user', async () => {
  // present date (import clock-in @ 09:00)
  const presentIn = await app(staff, 'POST', '/hr/attendance/clock-in', {
    source: 'import', at: localTime(ids.presentDate, '09', '00'), attendance_mode: 'remote',
  });
  expect(presentIn.daily.status).toBe('present');
  await app(staff, 'POST', '/hr/attendance/clock-out', { source: 'import', at: localTime(ids.presentDate, '17', '00'), attendance_mode: 'remote' });

  // late date (import clock-in at 09:30 UTC → 15 min late)
  const lateAt = utcLocalTime(ids.lateDate, '09', '30');
  const lateIn = await app(staff, 'POST', '/hr/attendance/clock-in', {
    source: 'import', at: lateAt, attendance_mode: 'remote',
  });
  expect(lateIn.daily.status).toBe('late');
  expect(lateIn.daily.late_minutes).toBe(15);
  await app(staff, 'POST', '/hr/attendance/clock-out', { source: 'import', at: utcLocalTime(ids.lateDate, '16', '00'), attendance_mode: 'remote' });

  const mine = await app(staff, 'GET', `/hr/attendance/me?from=${ids.presentDate}&to=${ids.lateDate}`);
  const byDate = new Map((mine.daily ?? []).map((d: any) => [String(d.work_date).slice(0, 10), d]));
  expect(byDate.get(ids.presentDate)?.status).toBe('present');
  expect(byDate.get(ids.lateDate)?.status).toBe('late');
});

test('attendance: today (seeded approved leave) is counted as leave, even while clocked in', async () => {
  const todayKey = fmt(new Date());
  ids.todayKey = todayKey;

  const cin = await app(staff, 'POST', '/hr/attendance/clock-in', {
    source: 'import', at: localTime(todayKey, '09', '00'), attendance_mode: 'remote',
  });
  expect(cin.daily.status).toBe('leave');

  const status = await app(staff, 'GET', '/hr/attendance/status');
  expect(status.current_state.is_clocked_in).toBe(true);
  expect(status.current_state.can_clock_out).toBe(true);

  const cout = await app(staff, 'POST', '/hr/attendance/clock-out', {
    source: 'import', at: localTime(todayKey, '10', '00'), attendance_mode: 'remote',
  });
  expect(cout.daily.status).toBe('leave');

  const mine = await app(staff, 'GET', `/hr/attendance/me?from=${todayKey}&to=${todayKey}`);
  expect(mine.today.status).toBe('leave');
  expect(mine.current_state.is_clocked_in).toBe(false);
});

test('attendance: summary + records include present/late/leave days and profile the user (admin team view)', async () => {
  const todayKey = ids.todayKey;
  const rangeFrom = weekdaysForTests(new Date(), 4).at(-1); // earliest test weekday
  const summary = await app(admin, 'GET', `/hr/attendance/summary?from=${rangeFrom}&to=${todayKey}`);
  expect(summary.by_status.present).toBeGreaterThanOrEqual(2); // web + import present days
  expect(summary.by_status.late).toBeGreaterThanOrEqual(1);
  expect(summary.by_status.leave).toBeGreaterThanOrEqual(1);

  const records = await app(admin, 'GET', `/hr/attendance/records?from=${rangeFrom}&to=${todayKey}&user_id=${ids.staffUserId}&status=present`);
  const rows = records.items ?? records.data ?? records;
  expect(Array.isArray(rows)).toBe(true);
  expect(rows.some((r: any) => r.user_id === ids.staffUserId && r.profile?.email === STAFF_EMAIL)).toBe(true);
});

test('attendance: exceptions — missed_punch → exception_pending, resolve → absent', async () => {
  const before = weekdaysForTests(new Date(), 5);
  ids.absentDate = before[3];
  ids.exceptionDate = before[4];

  // field_assignment on a day with no entries → absent
  const field = await app(admin, 'POST', '/hr/attendance/exceptions', {
    user_id: ids.staffUserId,
    work_date: ids.absentDate,
    exception_type: 'field_assignment',
    reason: 'Field work all day (e2e)',
    attendance_mode: 'field',
  });
  ids.fieldExceptionId = field.id;

  const record = await app(admin, 'GET', `/hr/attendance/records/${ids.staffUserId}/${ids.absentDate}`);
  expect(record.daily.status).toBe('absent');

  // missed_punch → exception_pending
  const missed = await app(admin, 'POST', '/hr/attendance/exceptions', {
    user_id: ids.staffUserId,
    work_date: ids.exceptionDate,
    exception_type: 'missed_punch',
    reason: 'Forgot to clock in (e2e)',
  });
  ids.missedExceptionId = missed.id;

  const missedRecord = await app(admin, 'GET', `/hr/attendance/records/${ids.staffUserId}/${ids.exceptionDate}`);
  expect(missedRecord.daily.status).toBe('exception_pending');

  // resolve → recomputes to absent
  await app(admin, 'POST', `/hr/attendance/exceptions/${ids.missedExceptionId}/resolve`, { review_notes: 'Accepted' });
  const afterResolve = await app(admin, 'GET', `/hr/attendance/records/${ids.staffUserId}/${ids.exceptionDate}`);
  expect(afterResolve.daily.status).toBe('absent');

  // resolve the field exception too (clean state)
  await app(admin, 'POST', `/hr/attendance/exceptions/${ids.fieldExceptionId}/resolve`, { review_notes: 'Verified' });
});

test('attendance: correction clock_in fixes the late day (late → present)', async () => {
  const correction = await app(staff, 'POST', '/hr/attendance/corrections', {
    work_date: ids.lateDate,
    request_type: 'clock_in',
    reason: 'Arrived early, recorded late (e2e)',
    proposed_at: localTime(ids.lateDate, '09', '00'),
    proposed_mode: 'remote',
  });
  ids.correctionId = correction.id;
  expect(correction.status).toBe('pending');

  // admin lists the pending correction for the staff user
  const mine = await app(admin, 'GET', `/hr/attendance/corrections?user_id=${ids.staffUserId}`);
  const mineList = (mine.items ?? mine.data ?? []).filter((c: any) => c.id === correction.id);
  expect(mineList).toHaveLength(1);

  // admin approves → late day becomes present
  const approve = await app(admin, 'POST', `/hr/attendance/corrections/${correction.id}/approve`, {
    review_notes: 'Looks good',
  });
  expect(approve.daily.status).toBe('present');
  expect(approve.daily.late_minutes).toBe(0);

  const record = await app(admin, 'GET', `/hr/attendance/records/${ids.staffUserId}/${ids.lateDate}`);
  expect(record.daily.status).toBe('present');
});

test('leave: types, create request, review (approve + reject), balance', async () => {
  const types = await app(staff, 'GET', '/hr/leave/types');
  const codes = types.map((t: any) => t.code);
  expect(codes).toContain('annual');
  expect(codes).toContain('sick');

  // only an owner can create a leave type
  const staffDenied = await api(staff, 'POST', '/hr/leave/types', { code: 'paternity', name: 'Paternity', annual_entitlement_days: 10 });
  expect(staffDenied.status).toBe(400);

  const newType = await app(admin, 'POST', '/hr/leave/types', { code: 'bereavement', name: 'Bereavement', annual_entitlement_days: 5 });
  ids.leaveTypeId = newType.id;

  // staff requests annual leave in the future
  const request = await app(staff, 'POST', '/hr/leave/requests', {
    leave_type_id: types.find((t: any) => t.code === 'annual').id,
    start_date: '2026-10-05',
    end_date: '2026-10-09',
    reason: 'Personal holiday (e2e)',
  });
  ids.leaveRequestId = request.id;
  expect(request.status).toBe('pending');
  expect(request.days).toBe(5);

  // overlapping request is rejected
  const overlap = await api(staff, 'POST', '/hr/leave/requests', {
    leave_type_id: types.find((t: any) => t.code === 'annual').id,
    start_date: '2026-10-07',
    end_date: '2026-10-10',
    reason: 'Should conflict',
  });
  expect(overlap.status).toBe(400);

  // admin reviews → approved
  const approved = await app(admin, 'POST', `/hr/leave/requests/${ids.leaveRequestId}/review`, { status: 'approved', notes: 'Enjoy!' });
  expect(approved.status).toBe('approved');

  // second request → rejected
  const second = await app(staff, 'POST', '/hr/leave/requests', {
    leave_type_id: types.find((t: any) => t.code === 'annual').id,
    start_date: '2026-11-02',
    end_date: '2026-11-06',
    reason: 'Travel plans (e2e)',
  });
  await app(admin, 'POST', `/hr/leave/requests/${second.id}/review`, { status: 'rejected', notes: 'Busy period' });

  // staff sees both, with the latest first
  const mine = await app(staff, 'GET', '/hr/leave/mine');
  const mineById = new Map(mine.map((r: any) => [r.id, r]));
  expect(mineById.get(ids.leaveRequestId)?.status).toBe('approved');
  expect(mineById.get(second.id)?.status).toBe('rejected');
  expect(mineById.get(second.id)?.leaveType?.name).toBe('Annual Leave');

  // review queue (admin) shows the approved one when filtered
  const queue = await app(admin, 'GET', '/hr/leave/requests?status=approved');
  expect(queue.some((r: any) => r.id === ids.leaveRequestId)).toBe(true);

  // balance endpoint returns a shape
  const balance = await app(staff, 'GET', '/hr/leave/balance?year=2026');
  expect(typeof balance).toBe('object');

  // non-owner cannot review
  const staffReview = await api(staff, 'POST', `/hr/leave/requests/${second.id}/review`, { status: 'approved' });
  expect(staffReview.status).toBe(400);
});

test('notifications: leave + attendance events appear in-app and trigger email via mailpit', async () => {
  const notifs = await app(staff, 'GET', '/notifications');
  expect(Array.isArray(notifs)).toBe(true);
  const leaveNotifs = notifs.filter((n: any) => n.type === 'leave');
  expect(leaveNotifs.length).toBeGreaterThanOrEqual(2); // approved + rejected
  expect(leaveNotifs.some((n: any) => /approved/i.test(n.title))).toBe(true);

  const unread = await app(staff, 'GET', '/notifications/unread-count');
  expect(unread).toBeGreaterThan(0);

  await app(staff, 'PUT', '/notifications/mark-all-read');
  const unreadAfter = await app(staff, 'GET', '/notifications/unread-count');
  expect(unreadAfter).toBe(0);

  // mailpit delivered an email to the staff member about their leave
  await expect
    .poll(
      async () => {
        const res = await fetch(`${MAILPIT}/api/v1/messages`);
        const body: any = await res.json();
        return (body?.messages ?? []).some(
          (m: any) => (m.To ?? []).some((r: any) => r.Address === STAFF_EMAIL) && /Leave request/i.test(m.Subject ?? ''),
        );
      },
      { timeout: 15000, intervals: [500, 500, 1000, 1000, 2000] },
    )
    .toBe(true);
});

test('access control: staff blocked from admin/team surfaces', async () => {
  const records = await api(staff, 'GET', '/hr/attendance/records');
  expect(records.status).toBe(403);

  const summary = await api(staff, 'GET', '/hr/attendance/summary');
  expect(summary.status).toBe(403);

  const rbac = await api(staff, 'GET', '/admin/rbac/roles');
  expect(rbac.status).toBe(403);

  const users = await api(staff, 'GET', '/admin/users');
  expect(users.status).toBe(403);

  // unauthenticated request
  const anon = await api(await request.newContext({ baseURL: BASE }), 'GET', '/hr/attendance/me');
  expect(anon.status).toBe(401);
});