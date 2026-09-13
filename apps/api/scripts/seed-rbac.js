/**
 * Seed RBAC roles, permissions, and role-to-permission mappings.
 * Idempotent: safe to run multiple times.
 */
const { Pool } = require('pg');
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ROLES = [
  { name: 'Administrator', slug: 'administrator', description: 'Full system access. Owner level.' },
  { name: 'HR Manager', slug: 'hr_manager', description: 'Manages HR records, attendance review, leave.' },
  { name: 'Manager', slug: 'manager', description: 'Reviews team attendance and leave requests.' },
  { name: 'Staff', slug: 'staff', description: 'Regular staff member.' },
];

const PERMISSIONS = [
  { slug: 'attendance.clock', name: 'Clock In/Out', module: 'attendance' },
  { slug: 'attendance.view_self', name: 'View Own Attendance', module: 'attendance' },
  { slug: 'attendance.view_team', name: 'View Team Attendance', module: 'attendance' },
  { slug: 'attendance.manage', name: 'Manage Attendance Settings', module: 'attendance' },
  { slug: 'attendance.approve', name: 'Approve Attendance Corrections', module: 'attendance' },
  { slug: 'attendance.correct', name: 'Resolve Attendance Exceptions', module: 'attendance' },
  { slug: 'hr.review', name: 'HR Review', module: 'hr' },
  { slug: 'requests.view', name: 'View Requests', module: 'requests' },
  { slug: 'requests.approve', name: 'Approve Requests', module: 'requests' },
  { slug: 'users.view', name: 'View Users', module: 'users' },
  { slug: 'users.manage', name: 'Manage Users', module: 'users' },
  { slug: 'tasks.view', name: 'View Tasks', module: 'tasks' },
  { slug: 'tasks.manage', name: 'Manage Tasks', module: 'tasks' },
  { slug: 'tasks.approve', name: 'Approve Task Logs', module: 'tasks' },
];

const ROLE_PERMS = {
  administrator: '*',
  hr_manager: ['attendance.*', 'hr.*', 'requests.view', 'requests.approve', 'users.view', 'tasks.view', 'tasks.manage', 'tasks.approve'],
  manager: ['attendance.view_team', 'attendance.approve', 'attendance.correct', 'requests.view', 'requests.approve', 'tasks.view', 'tasks.manage', 'tasks.approve'],
  staff: ['attendance.clock', 'attendance.view_self', 'tasks.view'],
};

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const now = new Date().toISOString();

    for (const role of ROLES) {
      await client.query(
        `INSERT INTO sta_roles (name, description, slug, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, true, $4, $4)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
        [role.name, role.description, role.slug, now]
      );
    }

    for (const perm of PERMISSIONS) {
      await client.query(
        `INSERT INTO sta_permissions (name, description, slug, module, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $5)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, module = EXCLUDED.module`,
        [perm.name, null, perm.slug, perm.module, now]
      );
    }

    // '@' is a wildcard pattern marker; expand it to all seeded slack-like slugs.
    for (const [roleSlug, perms] of Object.entries(ROLE_PERMS)) {
      const roleId = (await client.query(`SELECT id FROM sta_roles WHERE slug = $1`, [roleSlug])).rows[0]?.id;
      if (!roleId) continue;
      const permissionRows = (
        await client.query(`SELECT id, slug FROM sta_permissions`)
      ).rows;

      const expanded =
        perms === '*'
          ? permissionRows.map((p) => p.slug)
          : perms.flatMap((pattern) =>
              pattern.endsWith('.*')
                ? permissionRows.filter((p) => p.slug.startsWith(pattern.slice(0, -1))).map((p) => p.slug)
                : [pattern]
            );

      for (const slug of expanded) {
        const permission = permissionRows.find((p) => p.slug === slug);
        if (!permission) {
          console.warn(`  [skip] unknown permission "${slug}" for role ${roleSlug}`);
          continue;
        }
        await client.query(
          `INSERT INTO sta_role_permissions (role_id, permission_id, assigned_at)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [roleId, permission.id, now]
        );
      }
      console.log(`  role ${roleSlug}: ${expanded.length} permissions`);
    }

    await client.query('COMMIT');
    console.log('RBAC seed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('RBAC seed failed:', err.message);
  process.exit(1);
});