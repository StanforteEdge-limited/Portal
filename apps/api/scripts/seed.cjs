const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://stanforte:stanforte-dev@localhost:5455/stanforte?schema=public";

async function runSeed() {
  if (String(process.env.NODE_ENV || '').toLowerCase() === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error("Refusing to run seed script in production. Set ALLOW_PRODUCTION_SEED=true only if intentional.");
  }
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

      // 3.6 Seed Request Groups, Categories & Request Types
      const requestCatalog = [
        {
          group: { code: "FIN", name: "Finance & Payments", description: "Payment approvals, cash advances, reimbursements, and vendor settlements" },
          categories: [
            {
              code: "FIN-DISB",
              name: "Disbursements & Advances",
              description: "Direct payments, imprest, and staff reimbursements",
              sortOrder: 1,
              types: [
                {
                  name: "Payment Request",
                  codePrefix: "PAY",
                  description: "Standard payment request for operational costs, services, or project disbursements.",
                  workflowType: "payment",
                  handlerRoleLabel: "Finance Officer",
                  approvalLimit: 5000000,
                  flow: [
                    { mode: "relation", value: "requester_team_lead" },
                    { mode: "permission", value: "finance.manage" },
                  ],
                },
                {
                  name: "Cash Advance / Imprest",
                  codePrefix: "ADV",
                  description: "Request upfront cash advance subject to retirement with receipts.",
                  workflowType: "payment",
                  handlerRoleLabel: "Treasury Lead",
                  approvalLimit: 500000,
                  flow: [
                    { mode: "relation", value: "requester_team_lead" },
                    { mode: "permission", value: "finance.manage" },
                  ],
                },
                {
                  name: "Expense Reimbursement",
                  codePrefix: "REIMB",
                  description: "Claim reimbursement for pre-approved out-of-pocket business expenses.",
                  workflowType: "payment",
                  handlerRoleLabel: "Accounts Payable",
                  approvalLimit: 1000000,
                  flow: [
                    { mode: "relation", value: "requester_team_lead" },
                    { mode: "permission", value: "finance.manage" },
                  ],
                },
                {
                  name: "Vendor Invoice Settlement",
                  codePrefix: "VEND",
                  description: "Settle verified supplier and contractor invoices with supporting PO/GRN.",
                  workflowType: "payment",
                  handlerRoleLabel: "Senior Accountant",
                  approvalLimit: 10000000,
                  flow: [
                    { mode: "permission", value: "procurement.manage" },
                    { mode: "permission", value: "finance.manage" },
                  ],
                },
              ],
            },
          ],
        },
        {
          group: { code: "HR", name: "People & HR", description: "Leave applications, staff loans, and learning sponsorships" },
          categories: [
            {
              code: "HR-LEAVE",
              name: "Leave & Time Off",
              description: "Annual, sick, and compassionate leave requests",
              sortOrder: 2,
              types: [
                {
                  name: "Annual Leave Request",
                  codePrefix: "ALV",
                  description: "Request paid annual vacation days with relief officer handover.",
                  workflowType: "leave",
                  handlerRoleLabel: "HR Business Partner",
                  approvalLimit: null,
                  flow: [
                    { mode: "relation", value: "requester_team_lead" },
                    { mode: "permission", value: "requests.approve" },
                  ],
                },
                {
                  name: "Sick / Medical Leave",
                  codePrefix: "SLV",
                  description: "Notify HR and line manager of medical absence with optional doctor's note.",
                  workflowType: "leave",
                  handlerRoleLabel: "HR Business Partner",
                  approvalLimit: null,
                  flow: [{ mode: "relation", value: "requester_team_lead" }],
                },
              ],
            },
            {
              code: "HR-LOAN",
              name: "Staff Welfare & Loans",
              description: "Salary advances, staff loans, and professional development funding",
              sortOrder: 3,
              types: [
                {
                  name: "Staff Salary Advance / Loan",
                  codePrefix: "LOAN",
                  description: "Apply for an interest-free or payroll-deducted staff loan.",
                  workflowType: "loan",
                  handlerRoleLabel: "Payroll & Benefits Lead",
                  approvalLimit: 2000000,
                  flow: [
                    { mode: "permission", value: "payroll.manage" },
                    { mode: "permission", value: "finance.manage" },
                  ],
                },
                {
                  name: "Training & Certification Sponsorship",
                  codePrefix: "TRN",
                  description: "Request company sponsorship for courses, workshops, or exams.",
                  workflowType: "payment",
                  handlerRoleLabel: "People Operations",
                  approvalLimit: 750000,
                  flow: [
                    { mode: "relation", value: "requester_team_lead" },
                    { mode: "permission", value: "requests.approve" },
                  ],
                },
              ],
            },
          ],
        },
        {
          group: { code: "PROC", name: "Procurement & Assets", description: "Hardware purchases, supplies, and asset requisitions" },
          categories: [
            {
              code: "PROC-REQ",
              name: "Purchase Requisitions",
              description: "Office supplies, laptops, furniture, and operational equipment",
              sortOrder: 4,
              types: [
                {
                  name: "Equipment & Hardware Purchase",
                  codePrefix: "EQP",
                  description: "Requisition laptops, monitors, or specialized technical equipment.",
                  workflowType: "payment",
                  handlerRoleLabel: "Procurement Officer",
                  approvalLimit: 3000000,
                  flow: [
                    { mode: "relation", value: "requester_team_lead" },
                    { mode: "permission", value: "procurement.manage" },
                  ],
                },
                {
                  name: "Office Supplies & Consumables",
                  codePrefix: "SUP",
                  description: "Request stationery, pantry items, or routine office consumables.",
                  workflowType: "other",
                  handlerRoleLabel: "Admin & Facilities",
                  approvalLimit: 250000,
                  flow: [{ mode: "permission", value: "procurement.manage" }],
                },
              ],
            },
          ],
        },
        {
          group: { code: "OPS", name: "IT & General Operations", description: "Software licenses, access requests, and travel authorizations" },
          categories: [
            {
              code: "OPS-IT",
              name: "IT & Workspace Support",
              description: "Tool access, software subscriptions, and travel logistics",
              sortOrder: 5,
              types: [
                {
                  name: "IT Access & Software License",
                  codePrefix: "ITS",
                  description: "Request new SaaS seats, VPN access, or repository permissions.",
                  workflowType: "other",
                  handlerRoleLabel: "IT Support Lead",
                  approvalLimit: null,
                  flow: [
                    { mode: "relation", value: "requester_team_lead" },
                    { mode: "permission", value: "requests.approve" },
                  ],
                },
                {
                  name: "Travel & Logistics Authorization",
                  codePrefix: "TRV",
                  description: "Pre-approve flights, accommodation, and per-diem for official travel.",
                  workflowType: "payment",
                  handlerRoleLabel: "Operations Manager",
                  approvalLimit: 1500000,
                  flow: [
                    { mode: "relation", value: "requester_team_lead" },
                    { mode: "permission", value: "finance.manage" },
                  ],
                },
              ],
            },
          ],
        },
      ];

      let seededTypeCount = 0;
      for (const entry of requestCatalog) {
        const gCode = `${ws.orgCode}-${entry.group.code}`;
        let groupRes = await client.query(
          "SELECT id FROM sta_request_groups WHERE tenant_id = $1 AND code = $2 LIMIT 1",
          [tenantId, gCode]
        );
        let groupId;
        if (groupRes.rows.length > 0) {
          groupId = groupRes.rows[0].id;
        } else {
          const ins = await client.query(
            `INSERT INTO sta_request_groups (tenant_id, organization_id, name, code, description, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, true, $6, $7) RETURNING id`,
            [tenantId, orgId, entry.group.name, gCode, entry.group.description, now, now]
          );
          groupId = ins.rows[0].id;
        }

        for (const cat of entry.categories) {
          const cCode = `${ws.orgCode}-${cat.code}`;
          let catRes = await client.query(
            "SELECT id FROM sta_request_categories WHERE group_id = $1 AND code = $2 LIMIT 1",
            [groupId, cCode]
          );
          let categoryId;
          if (catRes.rows.length > 0) {
            categoryId = catRes.rows[0].id;
          } else {
            const ins = await client.query(
              `INSERT INTO sta_request_categories (group_id, name, code, description, sort_order, is_active, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, true, $6, $7) RETURNING id`,
              [groupId, cat.name, cCode, cat.description, cat.sortOrder, now, now]
            );
            categoryId = ins.rows[0].id;
          }

          for (const rt of cat.types) {
            const existingType = await client.query(
              "SELECT id FROM sta_request_types WHERE category_id = $1 AND code_prefix = $2 LIMIT 1",
              [categoryId, rt.codePrefix]
            );
            const approvalFlowJson = JSON.stringify({ flow: rt.flow });
            if (existingType.rows.length === 0) {
              await client.query(
                `INSERT INTO sta_request_types (
                   category_id, name, code_prefix, description,
                   workflow_type, handler_role_label, approval_limit,
                   approval_flow_json, form_schema, taxonomy_keys,
                   visible_to_roles, sequence_counter, is_active, created_at, updated_at
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, true, $9, $10)`,
                [
                  categoryId,
                  rt.name,
                  rt.codePrefix,
                  rt.description,
                  rt.workflowType,
                  rt.handlerRoleLabel,
                  rt.approvalLimit,
                  approvalFlowJson,
                  now,
                  now,
                ]
              );
              seededTypeCount++;
            }
          }
        }
      }
      console.log(`   Seeded ${seededTypeCount} new Request Types for ${ws.name}`);

      // Extra Request Categories (empty-ready categories under existing groups)
      const extraCategories = [
        { groupCode: "FIN", code: "FIN-TAX", name: "Tax & Statutory Remittances", description: "WHT, VAT, PAYE, and pension remittance filings", sortOrder: 6 },
        { groupCode: "PROC", code: "PROC-VEND", name: "Vendor Onboarding & Contracts", description: "New supplier vetting, SLAs, and contract renewals", sortOrder: 7 },
        { groupCode: "OPS", code: "OPS-FAC", name: "Facilities & Workspace Admin", description: "Office maintenance, seating, and building access", sortOrder: 8 },
      ];
      for (const ec of extraCategories) {
        const gRes = await client.query(
          "SELECT id FROM sta_request_groups WHERE tenant_id = $1 AND code = $2 LIMIT 1",
          [tenantId, `${ws.orgCode}-${ec.groupCode}`]
        );
        if (gRes.rows.length > 0) {
          const gId = gRes.rows[0].id;
          const cCode = `${ws.orgCode}-${ec.code}`;
          const cExists = await client.query(
            "SELECT id FROM sta_request_categories WHERE group_id = $1 AND code = $2 LIMIT 1",
            [gId, cCode]
          );
          if (cExists.rows.length === 0) {
            await client.query(
              `INSERT INTO sta_request_categories (group_id, name, code, description, sort_order, is_active, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, true, $6, $7)`,
              [gId, ec.name, cCode, ec.description, ec.sortOrder, now, now]
            );
          }
        }
      }

      // Resolve owner profile id for created_by / updated_by audit columns
      const ownerRes = await client.query(
        "SELECT profile_id FROM sta_tenant_memberships WHERE tenant_id = $1 AND is_owner = true LIMIT 1",
        [tenantId]
      );
      const ownerProfileId = ownerRes.rows[0]?.profile_id ?? null;

      // 3.7 Seed Departments (sta_departments)
      const deptCatalog = [
        { code: "EXEC", name: "Executive Leadership", description: "Company leadership and strategic governance" },
        { code: "ENG", name: "Engineering", description: "Product engineering, infrastructure, and QA" },
        { code: "HR", name: "People Operations (HR)", description: "Talent, payroll, compliance, and workplace culture" },
        { code: "FIN", name: "Finance & Treasury", description: "Accounting, budgets, disbursements, and audit" },
        { code: "PROC", name: "Procurement & Operations", description: "Vendor management, logistics, and facilities" },
        { code: "PROD", name: "Product & Design", description: "Product management, UX research, and design" },
      ];
      let deptCount = 0;
      for (const d of deptCatalog) {
        const dCode = `${ws.orgCode}-${d.code}`;
        const dExists = await client.query(
          "SELECT id FROM sta_departments WHERE tenant_id = $1 AND code = $2 LIMIT 1",
          [tenantId, dCode]
        );
        if (dExists.rows.length === 0) {
          await client.query(
            `INSERT INTO sta_departments (tenant_id, organization_id, name, code, description, is_active, created_by, updated_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, true, $6, $6, $7, $8)`,
            [tenantId, orgId, d.name, dCode, d.description, ownerProfileId, now, now]
          );
          deptCount++;
        }
      }

      // 3.8 Seed Leave Types (sta_leave_types)
      const leaveCatalog = [
        { code: "ANNUAL", name: "Annual Leave", days: 21 },
        { code: "SICK", name: "Sick / Medical Leave", days: 10 },
        { code: "MATERNITY", name: "Maternity Leave", days: 90 },
        { code: "PATERNITY", name: "Paternity Leave", days: 14 },
        { code: "COMPASSIONATE", name: "Compassionate Leave", days: 5 },
        { code: "STUDY", name: "Study / Exam Leave", days: 5 },
      ];
      let leaveCount = 0;
      for (const lt of leaveCatalog) {
        const ltCode = `${ws.orgCode}-${lt.code}`;
        const ltExists = await client.query(
          "SELECT id FROM sta_leave_types WHERE tenant_id = $1 AND code = $2 LIMIT 1",
          [tenantId, ltCode]
        );
        if (ltExists.rows.length === 0) {
          await client.query(
            `INSERT INTO sta_leave_types (tenant_id, code, name, annual_entitlement_days, requires_approval, is_active, metadata, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 1, 1, '{}'::jsonb, $5, $6)`,
            [tenantId, ltCode, lt.name, lt.days, now, now]
          );
          leaveCount++;
        }
      }

      // 3.9 Seed Taxonomies & Terms (sta_taxonomies + sta_taxonomy_terms)
      const taxonomyCatalog = [
        {
          key: "expense_category",
          name: "Expense Categories",
          description: "Standardized expense classifications for payment requests and budgets",
          module: "finance",
          renderType: "select",
          terms: [
            { value: "travel", label: "Travel & Lodging" },
            { value: "software", label: "Software & Subscriptions" },
            { value: "office_supplies", label: "Office Supplies" },
            { value: "professional_services", label: "Professional Services" },
            { value: "utilities", label: "Utilities & Internet" },
            { value: "marketing", label: "Marketing & Events" },
            { value: "equipment", label: "Equipment & Maintenance" },
          ],
        },
        {
          key: "cost_center",
          name: "Cost Centers",
          description: "Departmental cost allocation units",
          module: "finance",
          renderType: "select",
          terms: [
            { value: "hq", label: "Corporate HQ" },
            { value: "engineering", label: "Engineering & R&D" },
            { value: "sales", label: "Sales & Growth" },
            { value: "people", label: "People & Admin" },
            { value: "operations", label: "Operations" },
          ],
        },
        {
          key: "priority_level",
          name: "Request Priority",
          description: "Urgency classification for internal requests",
          module: "requests",
          renderType: "radio",
          terms: [
            { value: "low", label: "Low" },
            { value: "normal", label: "Normal" },
            { value: "high", label: "High" },
            { value: "urgent", label: "Urgent" },
          ],
        },
        {
          key: "document_topic",
          name: "Document Topics",
          description: "Knowledge hub and policy tags",
          module: "documents",
          renderType: "multiselect",
          terms: [
            { value: "compliance", label: "Compliance" },
            { value: "governance", label: "Governance" },
            { value: "hr_policy", label: "HR Policy" },
            { value: "security", label: "Security" },
            { value: "onboarding", label: "Onboarding" },
            { value: "finance_sop", label: "Finance SOP" },
          ],
        },
      ];
      let taxCount = 0;
      let termCount = 0;
      for (const tx of taxonomyCatalog) {
        const txKey = `${ws.slug}_${tx.key}`;
        let txRes = await client.query(
          "SELECT id FROM sta_taxonomies WHERE tenant_id = $1 AND key = $2 LIMIT 1",
          [tenantId, txKey]
        );
        let taxonomyId;
        if (txRes.rows.length > 0) {
          taxonomyId = txRes.rows[0].id;
        } else {
          const ins = await client.query(
            `INSERT INTO sta_taxonomies (tenant_id, key, name, description, module, render_type, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8) RETURNING id`,
            [tenantId, txKey, tx.name, tx.description, tx.module, tx.renderType, now, now]
          );
          taxonomyId = ins.rows[0].id;
          taxCount++;
        }

        for (let i = 0; i < tx.terms.length; i++) {
          const term = tx.terms[i];
          const termExists = await client.query(
            "SELECT id FROM sta_taxonomy_terms WHERE taxonomy_id = $1 AND value = $2 LIMIT 1",
            [taxonomyId, term.value]
          );
          if (termExists.rows.length === 0) {
            await client.query(
              `INSERT INTO sta_taxonomy_terms (tenant_id, taxonomy_id, value, label, sort_order, is_active, metadata, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, true, '{}'::jsonb, $6, $7)`,
              [tenantId, taxonomyId, term.value, term.label, i + 1, now, now]
            );
            termCount++;
          }
        }
      }

      // 3.10 Seed Statutory Deduction Types (sta_finance_deduction_types)
      if (ownerProfileId) {
        const deductionCatalog = [
          { code: "WHT-5", name: "Withholding Tax (5% - Goods & Contracts)", rate: 5, appliesTo: "vendor" },
          { code: "WHT-10", name: "Withholding Tax (10% - Professional Services)", rate: 10, appliesTo: "vendor" },
          { code: "VAT-7.5", name: "Value Added Tax (7.5%)", rate: 7.5, appliesTo: "vendor" },
          { code: "PENSION-8", name: "Contributory Pension (8% Employee)", rate: 8, appliesTo: "staff" },
          { code: "NHF-2.5", name: "National Housing Fund (2.5%)", rate: 2.5, appliesTo: "staff" },
        ];
        for (const ded of deductionCatalog) {
          const dCode = `${ws.orgCode}-${ded.code}`;
          const exists = await client.query(
            "SELECT id FROM sta_finance_deduction_types WHERE organization_id = $1 AND code = $2 LIMIT 1",
            [orgId, dCode]
          );
          if (exists.rows.length === 0) {
            await client.query(
              `INSERT INTO sta_finance_deduction_types (name, code, rate, applies_to, is_active, organization_id, created_by, updated_by, created_at, updated_at)
               VALUES ($1, $2, $3, $4, true, $5, $6, $6, $7, $8)`,
              [ded.name, dCode, ded.rate, ded.appliesTo, orgId, ownerProfileId, now, now]
            );
          }
        }
      }

      console.log(`   Seeded Catalogs for ${ws.name}: +${deptCount} depts, +${leaveCount} leave types, +${taxCount} taxonomies (+${termCount} terms)`);
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
