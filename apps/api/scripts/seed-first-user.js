/**
 * Seed a demo tenant, organization, an owner-level admin, and a staff member.
 * Also wires up all tenant/organization/membership relationships the login
 * flow requires. Idempotent.
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ADMIN_EMAIL = 'admin@stanforteedge.com';
const STAFF_EMAIL = 'staff@stanforteedge.com';
const PASSWORD = 'ChangeMe123!';

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Tenant
    let tenant = await client.query(`SELECT * FROM sta_tenants WHERE slug = $1`, ['stanforte-demo']);
    if (!tenant.rows.length) {
      tenant = await client.query(
        `INSERT INTO sta_tenants (name, slug, status, plan, metadata, created_at, updated_at)
         VALUES ($1, $2, 'active', 'trial', '{}', now(), now()) RETURNING *`,
        ['Stanforte Edge Demo', 'stanforte-demo']
      );
    }
    const tenantId = tenant.rows[0].id;

    // Organization
    let org = await client.query(`SELECT * FROM sta_organizations WHERE code = $1`, ['STANFORTE']);
    if (!org.rows.length) {
      org = await client.query(
        `INSERT INTO sta_organizations (tenant_id, name, code, organization_type, is_active, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, 'venture', true, '{}', now(), now()) RETURNING *`,
        [tenantId, 'StanforteEdge Nigeria Ltd', 'STANFORTE']
      );
    }
    const orgId = org.rows[0].id;

    // Tenant <-> organization
    await client.query(
      `INSERT INTO sta_tenant_organizations (tenant_id, organization_id, created_at)
       VALUES ($1, $2, now()) ON CONFLICT DO NOTHING`,
      [tenantId, orgId]
    );

    const upsertProfile = async ({ email, firstName, lastName, type, isOwner, roleSlug }) => {
      let profile = await client.query(`SELECT * FROM sta_profiles WHERE email = $1`, [email]);
      if (!profile.rows.length) {
        profile = await client.query(
          `INSERT INTO sta_profiles
            (email, password_hash, type, status, first_name, last_name, primary_organization_id, created_at, updated_at)
           VALUES ($1, $2, $3, 'active', $4, $5, $6, now(), now())
           ON CONFLICT (email) DO NOTHING
           RETURNING *`,
          [email, passwordHash, type, firstName, lastName, orgId]
        );
        if (!profile.rows.length) {
          profile = await client.query(`SELECT * FROM sta_profiles WHERE email = $1`, [email]);
        }
      } else {
        await client.query(
          `UPDATE sta_profiles SET primary_organization_id = $2, status = 'active' WHERE id = $1`,
          [profile.rows[0].id, orgId]
        );
      }
      const profileId = profile.rows[0].id;

      // Profile <-> organization membership
      await client.query(
        `INSERT INTO sta_profile_organizations (tenant_id, profile_id, organization_id, is_primary, start_date, created_at)
         VALUES ($1, $2, $3, true, CURRENT_DATE, now())
         ON CONFLICT (profile_id, organization_id) DO UPDATE SET is_primary = true`,
        [tenantId, profileId, orgId]
      );

      // Tenant membership
      await client.query(
        `INSERT INTO sta_tenant_memberships (tenant_id, profile_id, status, is_owner, joined_at, created_at)
         VALUES ($1, $2, 'active', $3, now(), now())
         ON CONFLICT (tenant_id, profile_id) DO UPDATE SET status = 'active', is_owner = $3`,
        [tenantId, profileId, isOwner]
      );

      // Role assignment
      const role = await client.query(`SELECT id FROM sta_roles WHERE slug = $1`, [roleSlug]);
      if (role.rows.length) {
        await client.query(
          `INSERT INTO sta_user_roles (tenant_id, profile_id, role_id, organization_id, is_primary_role, assigned_at, created_at)
           VALUES ($1, $2, $3, $4, true, now(), now())
           ON CONFLICT (profile_id, role_id, organization_id) DO UPDATE SET is_primary_role = true, tenant_id = $1`,
          [tenantId, profileId, role.rows[0].id, orgId]
        );
      }

      return profileId;
    };

    const adminId = await upsertProfile({
      email: ADMIN_EMAIL,
      firstName: 'System',
      lastName: 'Administrator',
      type: 'admin',
      isOwner: true,
      roleSlug: 'administrator',
    });

    const staffId = await upsertProfile({
      email: STAFF_EMAIL,
      firstName: 'Ada',
      lastName: 'Okafor',
      type: 'staff',
      isOwner: false,
      roleSlug: 'staff',
    });

    // Employee profile for staff (drives attendance mode expectations)
    await client.query(
      `INSERT INTO sta_employee_profiles
        (tenant_id, user_id, employee_code, job_title, employment_type, employment_status, hire_date, work_mode, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'full_time', 'active', CURRENT_DATE, 'onsite', $2, now(), now())
       ON CONFLICT (user_id) DO UPDATE SET work_mode = 'onsite', employment_status = 'active'`,
      [tenantId, staffId, 'STF-0001', 'Software Engineer']
    );

    console.log(`Tenant:    id=${tenantId} slug=stanforte-demo`);
    console.log(`Org:       id=${orgId} code=STANFORTE`);
    console.log(`Admin:     id=${adminId} ${ADMIN_EMAIL} (owner)`);
    console.log(`Staff:     id=${staffId} ${STAFF_EMAIL}`);

    await client.query('COMMIT');
    console.log('First-user seed complete. Login password for both accounts: ChangeMe123!');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('First-user seed failed:', err.message);
  process.exit(1);
});