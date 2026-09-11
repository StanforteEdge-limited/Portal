/**
 * Seed HR attendance fixtures: attendance policy, office location,
 * leave types, and a "legacy" approved leave request (sta_request_instances)
 * so the attendance engine can mark leave days. Idempotent.
 */
const { Pool } = require('pg');
const crypto = require('node:crypto');
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function dateKey(offsetDays = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tenant = await client.query(`SELECT id FROM sta_tenants WHERE slug = $1`, ['stanforte-demo']);
    if (!tenant.rows.length) throw new Error('Tenant not found - run seed:first-user first');
    const tenantId = tenant.rows[0].id;

    const org = await client.query(`SELECT id FROM sta_organizations WHERE code = $1`, ['STANFORTE']);
    if (!org.rows.length) throw new Error('Organization not found - run seed:first-user first');
    const orgId = org.rows[0].id;

    const staff = await client.query(`SELECT id FROM sta_profiles WHERE email = $1`, ['staff@stanforteedge.com']);
    if (!staff.rows.length) throw new Error('Staff profile not found - run seed:first-user first');
    const staffId = staff.rows[0].id;

    // ── Attendance schedule policy ──────────────────────────────────────────
    await client.query(
      `INSERT INTO sta_policies
        (module, policy_key, scope_type, scope_id, priority, config_json, is_active, created_at, updated_at)
       VALUES ('attendance', 'schedule', 'global', NULL, 100, $1, true, now(), now())
       ON CONFLICT DO NOTHING`,
      [
        JSON.stringify({
          start_time: '09:00',
          end_time: '17:00',
          grace_minutes: 15,
          max_future_minutes: 5,
          max_past_days: 7,
          allow_multiple_open_sessions: false,
          earliest_clock_in_minutes_before_start: 240,
          latest_clock_out_minutes_after_end: 720,
          onsite_weekdays: [1, 5],
          remote_weekdays: [2, 3, 4],
          required_extra_onsite_day_count: 1,
          enforce_expected_mode_clock_in: false,
          enforce_clock_out_match_clock_in_mode: true
        }),
      ]
    );

    // ── Office location + org link ──────────────────────────────────────────
    let loc = await client.query(
      `SELECT id FROM sta_office_locations WHERE name = $1`,
      ['Ikeja HQ']
    );
    if (!loc.rows.length) {
      loc = await client.query(
        `INSERT INTO sta_office_locations (name, address, latitude, longitude, radius_meters, is_active, created_at, updated_at)
         VALUES ($1, $2, 6.5244, 3.3792, 150, true, now(), now()) RETURNING id`,
        ['Ikeja HQ', '42 Adeniyi Jones, Ikeja, Lagos']
      );
    }
    await client.query(
      `INSERT INTO sta_organization_office_locations (tenant_id, organization_id, office_location_id, is_primary, created_at)
       VALUES ($1, $2, $3, true, now()) ON CONFLICT DO NOTHING`,
      [tenantId, orgId, loc.rows[0].id]
    );

    // ── Leave types ─────────────────────────────────────────────────────────
    const leaveTypes = [
      { code: 'annual', name: 'Annual Leave', days: 20 },
      { code: 'sick', name: 'Sick Leave', days: 12 },
      { code: 'study', name: 'Study Leave', days: 10 },
    ];
    for (const lt of leaveTypes) {
      await client.query(
        `INSERT INTO sta_leave_types
          (tenant_id, code, name, annual_entitlement_days, requires_approval, is_active, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 1, 1, '{}', now(), now())
         ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name`,
        [tenantId, lt.code, lt.name, lt.days]
      );
    }

    // ── Legacy approved leave (feeds attendance isOnApprovedLeave) ──────────
    const leaveStart = dateKey(-1);
    const leaveEnd = dateKey(6);
    await client.query(
      `INSERT INTO sta_request_groups (id, tenant_id, organization_id, name, code, description, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'People', 'PEOPLE', 'People and HR requests', true, now(), now())
       ON CONFLICT (code) DO NOTHING`,
      [tenantId, orgId]
    );
    const group = await client.query(`SELECT id FROM sta_request_groups WHERE code = 'PEOPLE'`);

    await client.query(
      `INSERT INTO sta_request_categories (id, group_id, name, code, description, sort_order, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'Leave', 'LEAVE', 'Leave requests', 1, true, now(), now())
       ON CONFLICT (code) DO NOTHING`,
      [group.rows[0].id]
    );
    const category = await client.query(`SELECT id FROM sta_request_categories WHERE code = 'LEAVE'`);

    await client.query(
      `INSERT INTO sta_request_types
        (id, category_id, name, code_prefix, taxonomy_keys, description, sequence_counter, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'Leave Request', 'LV', '["leave"]', 'Approved staff leave', 0, true, now(), now())
       ON CONFLICT (category_id, code_prefix) DO NOTHING`,
      [category.rows[0].id]
    );
    const reqType = await client.query(
      `SELECT id FROM sta_request_types WHERE category_id = $1 AND code_prefix = 'LV'`,
      [category.rows[0].id]
    );

    await client.query(
      `INSERT INTO sta_request_instances
        (tenant_id, request_type_id, group_id, organization_id, created_by, status, data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'approved', $6, now(), now())`,
      [
        tenantId,
        reqType.rows[0].id,
        group.rows[0].id,
        orgId,
        staffId,
        JSON.stringify({
          leave_type_key: 'annual',
          leave_type: 'annual',
          start_date: leaveStart,
          end_date: leaveEnd,
          days: 5,
          reason: 'Seeded approved leave for attendance verification',
        }),
      ]
    );

    console.log(`Attendance policy: global schedule 09:00-17:00`);
    console.log(`Office location:  Ikeja HQ (id=${loc.rows[0].id})`);
    console.log(`Leave types:      ${leaveTypes.map((l) => l.code).join(', ')}`);
    console.log(`Approved leave:   ${leaveStart} .. ${leaveEnd} (staff id=${staffId})`);

    await client.query('COMMIT');
    console.log('HR/leave seed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('HR/leave seed failed:', err.message);
  process.exit(1);
});