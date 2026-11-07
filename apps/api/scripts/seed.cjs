const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://stanforte:stanforte-dev@localhost:5455/stanforte?schema=public";

async function runSeed() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log(" Connected to database:", connectionString.replace(/:[^:@]+@/, ":****@"));

  try {
    await client.query("BEGIN");

    const now = new Date();
    const defaultPassword = "Password123!";
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    // 1. Ensure Global Permissions
    const permissions = [
      { slug: "*", name: "Super Administrator Wildcard", module: "system" },
      { slug: "users.manage", name: "Manage Users & Accounts", module: "identity" },
      { slug: "roles.manage", name: "Manage Roles & RBAC", module: "identity" },
      { slug: "tenancy:read", name: "Read Tenant Configurations", module: "tenancy" },
      { slug: "tenancy:write", name: "Update Tenant Configurations", module: "tenancy" },
      { slug: "attendance.manage", name: "View and Manage Attendance", module: "hr" },
      { slug: "payroll.manage", name: "Run and Authorize Payroll", module: "payroll" },
      { slug: "procurement.manage", name: "Procurement Approvals", module: "procurement" },
      { slug: "finance.manage", name: "Financial Ledger and Budgets", module: "finance" },
      { slug: "requests.manage", name: "Submit Internal Requests", module: "requests" },
      { slug: "requests.approve", name: "Approve Multi-Tier Requests", module: "requests" },
    ];

    const permMap = new Map();
    for (const p of permissions) {
      const existing = await client.query(
        "SELECT id FROM sta_permissions WHERE slug = $1 AND tenant_id IS NULL",
        [p.slug]
      );
      let permId;
      if (existing.rows.length > 0) {
        permId = existing.rows[0].id;
      } else {
        const insert = await client.query(
          `INSERT INTO sta_permissions (name, slug, module, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [p.name, p.slug, p.module, now, now]
        );
        permId = insert.rows[0].id;
      }
      permMap.set(p.slug, permId);
    }

    // 2. Ensure Global System Roles
    const roles = [
      { slug: "administrator", name: "Administrator", desc: "Full administrative access" },
      { slug: "owner", name: "Tenant Owner", desc: "Primary organization owner" },
      { slug: "manager", name: "Department Manager", desc: "Approvals & department supervision" },
      { slug: "employee", name: "Staff Member", desc: "Standard workforce portal access" },
    ];

    const roleMap = new Map();
    for (const r of roles) {
      const existing = await client.query(
        "SELECT id FROM sta_roles WHERE slug = $1 AND tenant_id IS NULL",
        [r.slug]
      );
      let roleId;
      if (existing.rows.length > 0) {
        roleId = existing.rows[0].id;
      } else {
        const insert = await client.query(
          `INSERT INTO sta_roles (name, slug, description, is_system, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, true, true, $4, $5) RETURNING id`,
          [r.name, r.slug, r.desc, now, now]
        );
        roleId = insert.rows[0].id;
      }
      roleMap.set(r.slug, roleId);
    }

    // Link all permissions to administrator and owner
    for (const [permSlug, permId] of permMap.entries()) {
      for (const roleSlug of ["administrator", "owner"]) {
        const roleId = roleMap.get(roleSlug);
        await client.query(
          `INSERT INTO sta_role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [roleId, permId]
        );
      }
    }

    // 3. Define Workspaces to Seed
    const workspaces = [
      {
        slug: "acme",
        name: "Acme Nigeria Ltd",
        orgCode: "ACME",
        plan: "growth",
        departments: ["Executive Leadership", "Engineering", "People Operations (HR)", "Finance"],
        users: [
          {
            email: "admin@acme.com",
            username: "daniel_owonikoko",
            firstName: "Daniel",
            lastName: "Owonikoko",
            type: "admin",
            roles: ["administrator", "owner"],
            jobTitle: "Managing Director & CEO",
            employeeCode: "ACM-001",
            isOwner: true,
          },
          {
            email: "manager@acme.com",
            username: "folake_adeleke",
            firstName: "Folake",
            lastName: "Adeleke",
            type: "employee",
            roles: ["manager"],
            jobTitle: "Head of People Operations",
            employeeCode: "ACM-002",
            isOwner: false,
          },
          {
            email: "employee@acme.com",
            username: "chidi_eze",
            firstName: "Chidi",
            lastName: "Eze",
            type: "employee",
            roles: ["employee"],
            jobTitle: "Senior Software Engineer",
            employeeCode: "ACM-003",
            isOwner: false,
          },
        ],
      },
      {
        slug: "stanforte",
        name: "Stanforte Global",
        orgCode: "STANFORTE",
        plan: "enterprise",
        departments: ["Operations", "Product Management", "Consulting"],
        users: [
          {
            email: "admin@stanforte.com",
            username: "sarah_connor",
            firstName: "Sarah",
            lastName: "Connor",
            type: "admin",
            roles: ["administrator", "owner"],
            jobTitle: "Chief Operating Officer",
            employeeCode: "SF-001",
            isOwner: true,
          },
          {
            email: "staff@stanforte.com",
            username: "john_doe",
            firstName: "John",
            lastName: "Doe",
            type: "employee",
            roles: ["employee"],
            jobTitle: "Product Specialist",
            employeeCode: "SF-002",
            isOwner: false,
          },
        ],
      },
    ];

    for (const ws of workspaces) {
      console.log(`\n🔹 Seeding Workspace: ${ws.name} (subdomain: ${ws.slug})`);

      // 3.1 Tenant
      let tenantRes = await client.query("SELECT id FROM sta_tenants WHERE slug = $1", [ws.slug]);
      let tenantId;
      if (tenantRes.rows.length > 0) {
        tenantId = tenantRes.rows[0].id;
        await client.query("UPDATE sta_tenants SET name = $1, plan = $2 WHERE id = $3", [
          ws.name,
          ws.plan,
          tenantId,
        ]);
      } else {
        tenantRes = await client.query(
          `INSERT INTO sta_tenants (name, slug, status, plan, created_at, updated_at)
           VALUES ($1, $2, 'active', $3, $4, $5) RETURNING id`,
          [ws.name, ws.slug, ws.plan, now, now]
        );
        tenantId = tenantRes.rows[0].id;
      }

      // 3.2 Organization
      let orgRes = await client.query("SELECT id FROM sta_organizations WHERE code = $1", [
        ws.orgCode,
      ]);
      let orgId;
      if (orgRes.rows.length > 0) {
        orgId = orgRes.rows[0].id;
        await client.query(
          "UPDATE sta_organizations SET name = $1, tenant_id = $2, is_active = true WHERE id = $3",
          [ws.name, tenantId, orgId]
        );
      } else {
        orgRes = await client.query(
          `INSERT INTO sta_organizations (name, code, tenant_id, organization_type, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, 'venture', true, $4, $5) RETURNING id`,
          [ws.name, ws.orgCode, tenantId, now, now]
        );
        orgId = orgRes.rows[0].id;
      }

      // 3.3 Link Tenant & Organization
      await client.query(
        `INSERT INTO sta_tenant_organizations (tenant_id, organization_id, created_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (organization_id)
         DO UPDATE SET tenant_id = $1`,
        [tenantId, orgId, now]
      );
      await client.query("UPDATE sta_organizations SET tenant_id = $1 WHERE id = $2", [tenantId, orgId]);

      // 3.4 Seed Groups / Departments
      for (const dept of ws.departments) {
        await client.query(
          `INSERT INTO sta_groups (tenant_id, name, type, is_active, organization_id, created_at, updated_at)
           VALUES ($1, $2, 'department', true, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [tenantId, dept, orgId, now, now]
        );
      }

      // 3.5 Seed Users
      for (const u of ws.users) {
        let profileRes = await client.query("SELECT id FROM sta_profiles WHERE email = $1", [
          u.email,
        ]);
        let profileId;
        if (profileRes.rows.length > 0) {
          profileId = profileRes.rows[0].id;
          await client.query(
            `UPDATE sta_profiles
             SET password_hash = $1,
                 status = 'active',
                 type = $2,
                 first_name = $3,
                 last_name = $4,
                 primary_organization_id = $5,
                 failed_login_attempts = 0,
                 lockout_until = NULL,
                 updated_at = $6
             WHERE id = $7`,
            [passwordHash, u.type, u.firstName, u.lastName, orgId, now, profileId]
          );
        } else {
          profileRes = await client.query(
            `INSERT INTO sta_profiles (
               email, username, password_hash, type, status,
               first_name, last_name, primary_organization_id, failed_login_attempts,
               created_at, updated_at
             ) VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, 0, $8, $9)
             RETURNING id`,
            [
              u.email,
              u.username,
              passwordHash,
              u.type,
              u.firstName,
              u.lastName,
              orgId,
              now,
              now,
            ]
          );
          profileId = profileRes.rows[0].id;
        }

        // Link profile to organization
        await client.query(
          `INSERT INTO sta_profile_organizations (tenant_id, profile_id, organization_id, is_primary, created_at)
           VALUES ($1, $2, $3, true, $4)
           ON CONFLICT DO NOTHING`,
          [tenantId, profileId, orgId, now]
        );
        await client.query(
          "UPDATE sta_profile_organizations SET tenant_id = $1 WHERE profile_id = $2 AND organization_id = $3",
          [tenantId, profileId, orgId]
        );

        // Tenant Membership
        await client.query(
          `INSERT INTO sta_tenant_memberships (tenant_id, profile_id, status, is_owner, joined_at, created_at)
           VALUES ($1, $2, 'active', $3, $4, $5)
           ON CONFLICT (tenant_id, profile_id)
           DO UPDATE SET status = 'active', is_owner = $3`,
          [tenantId, profileId, u.isOwner, now, now]
        );

        // Assign Roles
        for (const roleSlug of u.roles) {
          const roleId = roleMap.get(roleSlug);
          if (roleId) {
            await client.query(
              `INSERT INTO sta_user_roles (profile_id, role_id, tenant_id, is_primary_role)
               VALUES ($1, $2, $3, true)
               ON CONFLICT DO NOTHING`,
              [profileId, roleId, tenantId]
            );
          }
        }

        // Employee Profile
        await client.query(
          `INSERT INTO sta_employee_profiles (
             tenant_id, user_id, employee_code, job_title,
             employment_type, employment_status, work_mode, hire_date,
             created_at, updated_at
           ) VALUES ($1, $2, $3, $4, 'full_time', 'active', 'hybrid', $5, $6, $7)
           ON CONFLICT (user_id)
           DO UPDATE SET job_title = $4, employment_status = 'active', work_mode = 'hybrid'`,
          [tenantId, profileId, u.employeeCode, u.jobTitle, "2024-01-15", now, now]
        );

        console.log(`   Created User: ${u.email} | Role: ${u.roles.join(", ")} | Status: active`);
      }
    }

    // 4. Also update existing default accounts if present
    const legacyEmails = ["admin@stanforteedge.com", "staff@stanforteedge.com"];
    for (const legacyEmail of legacyEmails) {
      const res = await client.query("SELECT id FROM sta_profiles WHERE email = $1", [legacyEmail]);
      if (res.rows.length > 0) {
        await client.query(
          `UPDATE sta_profiles
           SET password_hash = $1, status = 'active', failed_login_attempts = 0, lockout_until = NULL
           WHERE id = $2`,
          [passwordHash, res.rows[0].id]
        );
        console.log(` Updated password for legacy account: ${legacyEmail}`);
      }
    }

    await client.query("COMMIT");
    console.log("\n Database Seeding Completed Successfully!\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding Error:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeed();
