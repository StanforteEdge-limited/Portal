const { Client } = require("pg");

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://stanforte:stanforte-dev@localhost:5455/stanforte?schema=public";

async function seedDemoData() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to Postgres for demo data seeding...");

  try {
    await client.query("BEGIN");
    const now = new Date();

    // 1. Fix Acme tenant name if empty
    await client.query(
      `UPDATE sta_tenants SET name = 'Acme Nigeria Ltd', plan = 'growth' WHERE slug = 'acme' AND (name IS NULL OR trim(name) = '')`
    );

    const acmeTenantRes = await client.query(`SELECT id FROM sta_tenants WHERE slug = 'acme' LIMIT 1`);
    const stanforteTenantRes = await client.query(`SELECT id FROM sta_tenants WHERE slug = 'stanforte' LIMIT 1`);
    const acmeTenantId = acmeTenantRes.rows[0]?.id;
    const stanforteTenantId = stanforteTenantRes.rows[0]?.id;

    const adminRes = await client.query(`SELECT id FROM sta_profiles WHERE email = 'admin@acme.com' LIMIT 1`);
    const empRes = await client.query(`SELECT id FROM sta_profiles WHERE email = 'employee@acme.com' LIMIT 1`);
    const adminId = adminRes.rows[0]?.id;
    const empId = empRes.rows[0]?.id;

    const orgRes = await client.query(
      `SELECT id FROM sta_organizations WHERE tenant_id = $1 ORDER BY id ASC LIMIT 1`,
      [acmeTenantId]
    );
    const acmeOrgId = orgRes.rows[0]?.id ?? null;

    if (!acmeTenantId || !adminId) {
      throw new Error("Core seeded tenant (acme) or admin@acme.com not found. Run seed.cjs first.");
    }

    // 2. Seed Subscription Plans & Paystack Prices
    const plans = [
      {
        code: "starter",
        name: "Starter",
        description: "Core staff records, directory, and leave tracking for up to 15 employees",
        amountMinor: 0,
        features: ["15_seats", "directory", "leave", "attendance"],
        limits: { max_employees: 15 },
      },
      {
        code: "growth",
        name: "Growth",
        description: "Automated Nigerian payroll, multi-tier approvals, procurement, and budgets for up to 100 employees",
        amountMinor: 3500000, // NGN 35,000.00 in kobo
        features: ["100_seats", "payroll", "approvals", "procurement", "budgets", "finance"],
        limits: { max_employees: 100 },
      },
      {
        code: "enterprise",
        name: "Enterprise",
        description: "Unlimited multi-entity operations, custom SLA, and dedicated support",
        amountMinor: 15000000, // NGN 150,000.00 in kobo
        features: ["unlimited_seats", "multi_entity", "custom_sla", "payroll", "finance", "api_sync"],
        limits: { max_employees: 10000 },
      },
    ];

    const planIds = {};
    for (const p of plans) {
      const existing = await client.query(`SELECT id FROM sta_subscription_plans WHERE code = $1`, [p.code]);
      let planId;
      if (existing.rows.length > 0) {
        planId = existing.rows[0].id;
      } else {
        const ins = await client.query(
          `INSERT INTO sta_subscription_plans (code, name, description, features, limits, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, true, $6, $6) RETURNING id`,
          [p.code, p.name, p.description, JSON.stringify(p.features), JSON.stringify(p.limits), now]
        );
        planId = ins.rows[0].id;
      }
      planIds[p.code] = planId;

      const priceExists = await client.query(
        `SELECT id FROM sta_subscription_plan_prices WHERE plan_id = $1 AND provider = 'paystack'`,
        [planId]
      );
      if (priceExists.rows.length === 0) {
        await client.query(
          `INSERT INTO sta_subscription_plan_prices (plan_id, provider, amount_minor, currency, interval, is_active, created_at, updated_at)
           VALUES ($1, 'paystack', $2, 'NGN', 'monthly', true, $3, $3)`,
          [planId, p.amountMinor, now]
        );
      }
    }

    // Active subscriptions for Acme & Stanforte
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    for (const [tId, pCode] of [
      [acmeTenantId, "growth"],
      [stanforteTenantId, "enterprise"],
    ]) {
      if (!tId) continue;
      const subEx = await client.query(`SELECT id FROM sta_tenant_subscriptions WHERE tenant_id = $1`, [tId]);
      if (subEx.rows.length === 0) {
        await client.query(
          `INSERT INTO sta_tenant_subscriptions (tenant_id, plan_id, status, starts_at, current_period_start, current_period_end, cancel_at_period_end, provider, created_at, updated_at)
           VALUES ($1, $2, 'active', $3, $3, $4, false, 'paystack', $3, $3)`,
          [tId, planIds[pCode], now, periodEnd]
        );
      }
    }

    // 3. Finance Bank & Cash Accounts
    const accCount = await client.query(`SELECT count(*)::int AS c FROM sta_finance_accounts WHERE tenant_id = $1`, [acmeTenantId]);
    let primaryAccountId = null;
    if (accCount.rows[0].c === 0) {
      const a1 = await client.query(
        `INSERT INTO sta_finance_accounts (tenant_id, organization_id, name, code, account_type, bank_name, account_name, account_number, currency, opening_balance, is_active, created_by, created_at, updated_at)
         VALUES
           ($1, $2, 'GTBank Operations Account', 'BNK-001', 'bank', 'Guaranty Trust Bank', 'Acme Nigeria Ltd', '0123456789', 'NGN', 45200000, true, $3, $4, $4),
           ($1, $2, 'Zenith Payroll & Statutory Account', 'BNK-002', 'bank', 'Zenith Bank Plc', 'Acme Nigeria Ltd - Payroll', '1019283746', 'NGN', 18500000, true, $3, $4, $4),
           ($1, $2, 'Lagos HQ Petty Cash', 'CSH-001', 'cash', 'Cash Vault', 'Acme Petty Cash', 'PETTY-01', 'NGN', 750000, true, $3, $4, $4)
         RETURNING id`,
        [acmeTenantId, acmeOrgId, adminId, now]
      );
      primaryAccountId = a1.rows[0].id;
    } else {
      const a1 = await client.query(`SELECT id FROM sta_finance_accounts WHERE tenant_id = $1 LIMIT 1`, [acmeTenantId]);
      primaryAccountId = a1.rows[0]?.id;
    }

    // 4. Finance Contacts (Vendors & Customers)
    const contactCount = await client.query(`SELECT count(*)::int AS c FROM sta_finance_contacts`);
    let vendorContactId = null;
    if (contactCount.rows[0].c === 0) {
      const cRes = await client.query(
        `INSERT INTO sta_finance_contacts (organization_id, contact_type, name, company_name, email, phone, address, is_active, payment_terms, opening_balance, created_by, created_at, updated_at)
         VALUES
           ($1, 'vendor', 'MainOne Connectivity Ltd', 'MainOne Cable Company', 'billing@mainone.net', '+234 800 624 6663', 'Victoria Island, Lagos', true, 30, 0, $2, $3, $3),
           ($1, 'vendor', 'Eko Office Solutions', 'Eko Office Supplies Ltd', 'sales@ekooffice.ng', '+234 803 555 0192', 'Ikeja, Lagos', true, 15, 0, $2, $3, $3),
           ($1, 'customer', 'Sterling Enterprise Partners', 'Sterling Enterprise Ltd', 'accounts@sterlingpartners.ng', '+234 809 444 2100', 'Ikoyi, Lagos', true, 30, 0, $2, $3, $3),
           ($1, 'customer', 'Atlantic Logistics Group', 'Atlantic Logistics Nigeria', 'finance@atlanticlogistics.ng', '+234 802 777 8811', 'Apapa, Lagos', true, 30, 0, $2, $3, $3)
         RETURNING id`,
        [acmeOrgId, adminId, now]
      );
      vendorContactId = cRes.rows[0].id;
    } else {
      const cRes = await client.query(`SELECT id FROM sta_finance_contacts LIMIT 1`);
      vendorContactId = cRes.rows[0]?.id;
    }

    // 5. Finance Budgets
    const budgetCount = await client.query(`SELECT count(*)::int AS c FROM sta_finance_budgets WHERE tenant_id = $1`, [acmeTenantId]);
    if (budgetCount.rows[0].c === 0) {
      await client.query(
        `INSERT INTO sta_finance_budgets (tenant_id, organization_id, name, scope_type, budget_type, period_type, fiscal_year, currency, exchange_rate, start_date, end_date, status, total_budget, notes, created_by, approved_by, approved_at, created_at, updated_at)
         VALUES
           ($1, $2, 'FY2026 Corporate Operations Budget', 'organization', 'operating', 'annual', 2026, 'NGN', 1, '2026-01-01', '2026-12-31', 'approved', 120000000, 'Board-approved annual operating budget', $3, $3, $4, $4, $4),
           ($1, $2, 'Q4 2026 Engineering & Cloud Budget', 'department', 'operating', 'quarterly', 2026, 'NGN', 1, '2026-10-01', '2026-12-31', 'approved', 28500000, 'Cloud infrastructure and software tooling', $3, $3, $4, $4, $4)`,
        [acmeTenantId, acmeOrgId, adminId, now]
      );
    }

    // 6. Finance Expenses
    const expCount = await client.query(`SELECT count(*)::int AS c FROM sta_finance_expenses WHERE tenant_id = $1`, [acmeTenantId]);
    if (expCount.rows[0].c === 0 && primaryAccountId) {
      await client.query(
        `INSERT INTO sta_finance_expenses (tenant_id, expense_number, contact_id, account_id, organization_id, expense_date, category, description, amount, currency, tax_amount, total_amount, reference, status, created_by, created_at, updated_at)
         VALUES
           ($1, 'EXP-2026-001', $2, $3, $4, '2026-11-10', 'IT & Connectivity', 'Dedicated Fiber Internet & Cloud Hosting (Nov 2026)', 1450000, 'NGN', 108750, 1558750, 'MO-INV-9921', 'posted', $5, $6, $6),
           ($1, 'EXP-2026-002', $2, $3, $4, '2026-11-18', 'Office Equipment', 'Ergonomic Workstations & 4K Monitors for Engineering', 2850000, 'NGN', 213750, 3063750, 'EOS-INV-4412', 'posted', $5, $6, $6)`,
        [acmeTenantId, vendorContactId, primaryAccountId, acmeOrgId, adminId, now]
      );
    }

    // 7. Finance Products & Services Items
    const itemCount = await client.query(`SELECT count(*)::int AS c FROM sta_finance_items`);
    if (itemCount.rows[0].c === 0) {
      await client.query(
        `INSERT INTO sta_finance_items (name, code, description, item_type, unit, unit_price, cost_price, currency, organization_id, is_active, created_by, created_at, updated_at)
         VALUES
           ('Enterprise Operations Retainer', 'SVC-001', 'Monthly advisory and managed portal operations', 'service', 'month', 2500000, 900000, 'NGN', $1, true, $2, $3, $3),
           ('Statutory Payroll Setup Package', 'SVC-002', 'One-time PAYE, PenCom & NHF payroll configuration', 'service', 'package', 1200000, 350000, 'NGN', $1, true, $2, $3, $3)`,
        [acmeOrgId, adminId, now]
      );
    }

    // 8. Fixed Assets
    const assetCount = await client.query(`SELECT count(*)::int AS c FROM sta_finance_assets`);
    if (assetCount.rows[0].c === 0) {
      await client.query(
        `INSERT INTO sta_finance_assets (asset_id, organization_id, asset_description, category, serial_tag_no, location_project, assigned_to_user_id, purchase_date, supplier, purchase_cost, useful_life_years, salvage_value, condition, status, created_by, created_at, updated_at)
         VALUES
           ('AST-2026-001', $1, 'MacBook Pro 16-inch M3 Max (64GB)', 'IT Equipment', 'SN-MBP-88412', 'Lagos HQ - Engineering', $2, '2026-03-15', 'Slot Systems Nigeria', 3400000, 4, 400000, 'excellent', 'active', $3, $4, $4),
           ('AST-2026-002', $1, 'Mikano 60kVA Soundproof Generator', 'Power & Facilities', 'SN-MKN-22019', 'Ikeja HQ Facility', $3, '2026-01-20', 'Mikano International', 14500000, 10, 1500000, 'good', 'active', $3, $4, $4)`,
        [acmeOrgId, empId || adminId, adminId, now]
      );
    }

    // 9. Projects
    const projCount = await client.query(`SELECT count(*)::int AS c FROM sta_projects WHERE tenant_id = $1`, [acmeTenantId]);
    if (projCount.rows[0].c === 0) {
      await client.query(
        `INSERT INTO sta_projects (tenant_id, organization_id, name, description, is_active, created_by, created_at, updated_at)
         VALUES
           ($1, $2, 'Stanforte Portal Enterprise Rollout', 'Organization-wide deployment of HR, Finance, and Approvals workflows', true, $3, $4, $4),
           ($1, $2, 'Q4 Statutory Payroll & Tax Automation', 'Automated PAYE, PenCom, and NHF schedule generation and bank disbursement', true, $3, $4, $4),
           ($1, $2, 'Lagos HQ Infrastructure Upgrade', 'Office expansion, fiber redundancy, and biometric access terminals', true, $3, $4, $4)`,
        [acmeTenantId, acmeOrgId, adminId, now]
      );
    }

    // 10. Policies
    const polCount = await client.query(`SELECT count(*)::int AS c FROM sta_policies WHERE tenant_id = $1`, [acmeTenantId]);
    if (polCount.rows[0].c === 0) {
      await client.query(
        `INSERT INTO sta_policies (tenant_id, module, policy_key, scope_type, priority, config_json, effective_from, is_active, require_acknowledgement, created_by, created_at, updated_at)
         VALUES
           ($1, 'hr', 'employee_code_of_conduct', 'tenant', 10, '{"title":"Employee Code of Conduct & Ethics","summary":"Workplace ethics, confidentiality, and professional standards for all Acme Nigeria Ltd staff."}'::jsonb, $3, true, true, $2, $3, $3),
           ($1, 'finance', 'expense_approval_policy', 'tenant', 20, '{"title":"Expense & Procurement Approval Policy","summary":"Multi-tier approval thresholds for operational disbursements and vendor purchase orders."}'::jsonb, $3, true, true, $2, $3, $3),
           ($1, 'attendance', 'hybrid_work_policy', 'tenant', 30, '{"title":"Hybrid Work & Attendance Policy","summary":"Standard work hours (08:30 - 17:00 WAT), geofenced onsite check-in, and remote work guidelines."}'::jsonb, $3, true, false, $2, $3, $3)`,
        [acmeTenantId, adminId, now]
      );
    }

    // 11. Leave Types & Sample Leave Requests for Acme
    const ltCount = await client.query(`SELECT count(*)::int AS c FROM sta_leave_types WHERE tenant_id = $1`, [acmeTenantId]);
    let annualLeaveTypeId = null;
    if (ltCount.rows[0].c === 0) {
      const ltRes = await client.query(
        `INSERT INTO sta_leave_types (tenant_id, code, name, annual_entitlement_days, requires_approval, is_active, created_at, updated_at)
         VALUES
           ($1, 'annual', 'Annual Leave', 20, 1, 1, $2, $2),
           ($1, 'sick', 'Sick Leave', 10, 1, 1, $2, $2),
           ($1, 'casual', 'Casual Leave', 5, 1, 1, $2, $2)
         RETURNING id, code`,
        [acmeTenantId, now]
      );
      annualLeaveTypeId = ltRes.rows.find((r) => r.code === "annual")?.id;
    } else {
      const ltRes = await client.query(`SELECT id FROM sta_leave_types WHERE tenant_id = $1 AND code = 'annual' LIMIT 1`, [acmeTenantId]);
      annualLeaveTypeId = ltRes.rows[0]?.id;
    }

    if (annualLeaveTypeId && empId) {
      const lrCount = await client.query(`SELECT count(*)::int AS c FROM sta_leave_requests WHERE tenant_id = $1`, [acmeTenantId]);
      if (lrCount.rows[0].c === 0) {
        await client.query(
          `INSERT INTO sta_leave_requests (tenant_id, user_id, leave_type_id, start_date, end_date, days, reason, status, reviewed_by, reviewed_at, review_notes, created_at, updated_at)
           VALUES
             ($1, $2, $3, '2026-12-14', '2026-12-18', 5, 'End-of-year family holiday', 'pending', NULL, NULL, NULL, $5, $5),
             ($1, $2, $3, '2026-10-12', '2026-10-14', 3, 'Personal travel', 'approved', $4, $5, 'Approved — enjoy your break', $5, $5)`,
          [acmeTenantId, empId, annualLeaveTypeId, adminId, now]
        );
      }
    }

    await client.query("COMMIT");
    console.log("Demo data seeded successfully across all modules!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to seed demo data:", err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

seedDemoData();
