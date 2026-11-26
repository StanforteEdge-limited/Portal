const { Client } = require("pg");
const crypto = require("crypto");

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://stanforte:stanforte-dev@localhost:5455/stanforte?schema=public";

async function seedPayrollAndVouchers() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to Postgres for Payroll & Payment Vouchers seeding...");

  try {
    await client.query("BEGIN");
    const now = new Date();

    const tenantRes = await client.query(
      `SELECT id FROM sta_tenants WHERE slug = 'acme' LIMIT 1`,
    );
    const tenantId = tenantRes.rows[0]?.id;
    if (!tenantId) throw new Error("Tenant 'acme' not found");

    const orgRes = await client.query(
      `SELECT id FROM sta_organizations WHERE tenant_id = $1 ORDER BY id ASC LIMIT 1`,
      [tenantId],
    );
    const orgId = orgRes.rows[0]?.id ?? null;

    const bankRes = await client.query(
      `SELECT id, name FROM sta_finance_accounts WHERE tenant_id = $1 ORDER BY created_at ASC`,
      [tenantId],
    );
    const opsAccountId = bankRes.rows[0]?.id ?? null;
    const payrollAccountId = bankRes.rows[1]?.id ?? opsAccountId;

    const chartRes = await client.query(
      `SELECT id, code, name FROM sta_finance_chart_accounts ORDER BY code ASC LIMIT 5`,
    );
    const expenseChartId = chartRes.rows[0]?.id ?? null;

    const profilesRes = await client.query(
      `SELECT id, email, first_name, last_name FROM sta_profiles WHERE email LIKE '%@acme.com' ORDER BY id ASC`,
    );
    const profiles = profilesRes.rows;
    const adminId = profiles.find((p) => p.email === "admin@acme.com")?.id ?? profiles[0]?.id;
    const managerId = profiles.find((p) => p.email === "manager@acme.com")?.id ?? adminId;

    // 1. Seed Payroll Components (idempotent by code)
    const components = [
      { code: "BASIC", name: "Basic Salary", type: "earning", calc: "fixed", taxable: true, net: true, statutory: false, order: 1 },
      { code: "HOUSING", name: "Housing Allowance", type: "earning", calc: "fixed", taxable: true, net: true, statutory: false, order: 2 },
      { code: "TRANSPORT", name: "Transport Allowance", type: "earning", calc: "fixed", taxable: true, net: true, statutory: false, order: 3 },
      { code: "PAYE", name: "PAYE Income Tax", type: "deduction", calc: "formula", taxable: false, net: true, statutory: true, order: 4 },
      { code: "PENSION_EMP", name: "Employee Pension (8%)", type: "deduction", calc: "percentage", taxable: false, net: true, statutory: true, order: 5 },
      { code: "NHF", name: "National Housing Fund (2.5%)", type: "deduction", calc: "percentage", taxable: false, net: true, statutory: true, order: 6 },
    ];

    for (const c of components) {
      const exists = await client.query(
        `SELECT id FROM sta_payroll_components WHERE code = $1 LIMIT 1`,
        [c.code],
      );
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO sta_payroll_components
           (id, chart_account_id, code, name, component_type, calculation_type, paid_by, employer_share_percent, is_taxable, affects_net_pay, is_statutory, is_active, sort_order, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'employee', 0, $7, $8, $9, true, $10, '{}'::jsonb, $11, $11)`,
          [crypto.randomUUID(), expenseChartId, c.code, c.name, c.type, c.calc, c.taxable, c.net, c.statutory, c.order, now],
        );
      }
    }

    // 2. Seed Payroll Workers & Salary Profiles for Acme staff
    const salarySpecs = [
      { email: "admin@acme.com", code: "ACM-001", gross: 1200000, deductions: 281000, bank: "Access Bank", acct: "0029384721", tin: "TIN-10492811" },
      { email: "manager@acme.com", code: "ACM-002", gross: 850000, deductions: 195500, bank: "Zenith Bank", acct: "1012938492", tin: "TIN-10492812" },
      { email: "employee@acme.com", code: "ACM-003", gross: 650000, deductions: 149500, bank: "GTBank", acct: "0123984712", tin: "TIN-10492813" },
    ];

    const workers = [];
    for (const spec of salarySpecs) {
      const prof = profiles.find((p) => p.email === spec.email);
      if (!prof) continue;
      const fullName = `${prof.first_name || ""} ${prof.last_name || ""}`.trim() || spec.email;

      const existing = await client.query(
        `SELECT id FROM sta_payroll_workers WHERE tenant_id = $1 AND email = $2 LIMIT 1`,
        [tenantId, spec.email],
      );

      let workerId;
      if (existing.rows.length > 0) {
        workerId = existing.rows[0].id;
      } else {
        workerId = crypto.randomUUID();
        await client.query(
          `INSERT INTO sta_payroll_workers
           (id, tenant_id, profile_id, organization_id, worker_type, pay_basis, allocation_mode, standard_hours_per_day, full_name, email, staff_code, currency, status, bank_name, bank_account_name, bank_account_number, tax_identifier, pension_identifier, start_date, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'employee', 'monthly', 'fixed', 8, $5, $6, $7, 'NGN', 'active', $8, $5, $9, $10, $11, '2024-01-15', '{}'::jsonb, $12, $12)`,
          [workerId, tenantId, prof.id, orgId, fullName, spec.email, spec.code, spec.bank, spec.acct, spec.tin, `PEN-${spec.code}`, now],
        );

        await client.query(
          `INSERT INTO sta_payroll_worker_profiles
           (id, worker_id, pay_frequency, base_amount, payment_mode, effective_from, metadata, created_at, updated_at)
           VALUES ($1, $2, 'monthly', $3, 'bank_transfer', '2026-01-01', '{}'::jsonb, $4, $4)`,
          [crypto.randomUUID(), workerId, spec.gross, now],
        );
      }
      workers.push({ workerId, ...spec, fullName });
    }

    // 3. Seed 3 Monthly Payroll Runs (Paid Oct, Approved Nov for Authorization, Under Review Dec for Finance)
    const runs = [
      {
        name: "Payroll October 2026",
        year: 2026,
        month: 10,
        start: "2026-10-01",
        end: "2026-10-31",
        status: "paid",
        notes: "October 2026 statutory payroll disbursed via Zenith Payroll Account.",
        paidAt: new Date("2026-10-28T14:30:00Z"),
        authorizedAt: new Date("2026-10-27T11:00:00Z"),
        itemStatus: "paid",
      },
      {
        name: "Payroll November 2026",
        year: 2026,
        month: 11,
        start: "2026-11-01",
        end: "2026-11-30",
        status: "approved",
        notes: "Finance verified PAYE, PenCom, and NHF deductions. Ready for executive authorization.",
        paidAt: null,
        authorizedAt: null,
        itemStatus: "pending",
      },
      {
        name: "Payroll December 2026",
        year: 2026,
        month: 12,
        start: "2026-12-01",
        end: "2026-12-31",
        status: "under_review",
        notes: "Submitted by HR with year-end attendance reconciliation for Finance review.",
        paidAt: null,
        authorizedAt: null,
        itemStatus: "pending",
      },
    ];

    for (const r of runs) {
      const existingRun = await client.query(
        `SELECT id FROM sta_payroll_runs WHERE tenant_id = $1 AND year = $2 AND month = $3 LIMIT 1`,
        [tenantId, r.year, r.month],
      );
      if (existingRun.rows.length > 0) continue;

      const runId = crypto.randomUUID();
      await client.query(
        `INSERT INTO sta_payroll_runs
         (id, tenant_id, organization_id, paid_from_account_id, name, year, month, period_start, period_end, status, currency, notes, prepared_by, reviewed_by, approved_by, authorized_at, authorized_by, paid_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'NGN', $11, $12, $13, $14, $15, $16, $17, $18, $18)`,
        [
          runId,
          tenantId,
          orgId,
          payrollAccountId,
          r.name,
          r.year,
          r.month,
          r.start,
          r.end,
          r.status,
          r.notes,
          managerId,
          r.status === "under_review" ? null : adminId,
          r.status === "approved" || r.status === "paid" ? adminId : null,
          r.authorizedAt,
          r.authorizedAt ? adminId : null,
          r.paidAt,
          now,
        ],
      );

      for (const w of workers) {
        const net = w.gross - w.deductions;
        await client.query(
          `INSERT INTO sta_payroll_run_items
           (id, run_id, worker_id, organization_id, worker_type, pay_basis, allocation_source, gross_pay, total_deductions, employer_cost_total, computed_net_pay, actual_net_pay, net_adjustment_amount, net_pay, payment_status, payment_reference, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'employee', 'monthly', 'worker_default', $5, $6, $7, $8, $8, 0, $8, $9, $10, '{}'::jsonb, $11, $11)`,
          [
            crypto.randomUUID(),
            runId,
            w.workerId,
            orgId,
            w.gross,
            w.deductions,
            Math.round(w.gross * 0.1),
            net,
            r.itemStatus,
            r.itemStatus === "paid" ? `PAY-${r.year}${String(r.month).padStart(2, "0")}-${w.code}` : null,
            now,
          ],
        );
      }
    }

    // 4. Seed 4 Payment Vouchers linked to Acme Request Instances
    const reqTypeRes = await client.query(
      `SELECT id FROM sta_request_types ORDER BY id ASC LIMIT 1`,
    );
    const requestTypeId = reqTypeRes.rows[0]?.id ?? null;

    let reqGroupRes = await client.query(
      `SELECT id FROM sta_request_groups ORDER BY id ASC LIMIT 1`,
    );
    let requestGroupId = reqGroupRes.rows[0]?.id ?? null;
    if (!requestGroupId && adminId) {
      const grpIns = await client.query(
        `INSERT INTO sta_request_groups (id, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $3) RETURNING id`,
        [crypto.randomUUID(), adminId, now],
      );
      requestGroupId = grpIns.rows[0].id;
    }

    const vouchers = [
      {
        pv: "PV-2026-001",
        title: "Victoria Island Office Generator Servicing",
        amount: 420000,
        retiredAmount: 420000,
        status: "confirmed",
        method: "bank_transfer",
        ref: "GTB-TRF-992841",
        note: "Vendor invoice and servicing report verified by Finance.",
        daysAgo: 12,
      },
      {
        pv: "PV-2026-002",
        title: "Abuja Branch Travel & Logistics Advance",
        amount: 185000,
        retiredAmount: 0,
        status: "pending",
        method: "bank_transfer",
        ref: "GTB-TRF-993104",
        note: "Awaiting boarding passes and hotel receipts from travel team.",
        daysAgo: 4,
      },
      {
        pv: "PV-2026-003",
        title: "Q4 Cloud Infrastructure & Security Audit",
        amount: 650000,
        retiredAmount: 650000,
        status: "retired",
        method: "bank_transfer",
        ref: "GTB-TRF-993290",
        note: "Receipts uploaded; pending final audit confirmation.",
        daysAgo: 7,
      },
      {
        pv: "PV-2026-004",
        title: "Staff Onboarding Kits & Office Supplies",
        amount: 240000,
        retiredAmount: 150000,
        status: "partial",
        method: "bank_transfer",
        ref: "GTB-TRF-993412",
        note: "Partial receipts submitted; balance of NGN 90,000 pending vendor invoice.",
        daysAgo: 2,
      },
    ];

    for (const v of vouchers) {
      const exPv = await client.query(
        `SELECT id FROM sta_finance_payment_vouchers WHERE voucher_number = $1 LIMIT 1`,
        [v.pv],
      );
      if (exPv.rows.length > 0) continue;

      let reqId = null;
      if (requestTypeId && requestGroupId) {
        const reqIns = await client.query(
          `INSERT INTO sta_request_instances
           (tenant_id, request_type_id, group_id, organization_id, created_by, status, data, current_approval_step, total_amount, currency, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'disbursed', $6::jsonb, 2, $7, 'NGN', $8, $8)
           RETURNING id`,
          [
            tenantId,
            requestTypeId,
            requestGroupId,
            orgId,
            adminId,
            JSON.stringify({ title: v.title, purpose: v.note, voucher_number: v.pv }),
            v.amount,
            now,
          ],
        );
        reqId = reqIns.rows[0].id;
      }

      const disbursedAt = new Date(now.getTime() - v.daysAgo * 86400000);
      const retiredAt = v.retiredAmount > 0 ? new Date(disbursedAt.getTime() + 86400000) : null;
      const verifiedAt = v.status === "confirmed" ? new Date(disbursedAt.getTime() + 2 * 86400000) : null;

      await client.query(
        `INSERT INTO sta_finance_payment_vouchers
         (id, request_id, paid_from_account_id, expense_account_id, voucher_number, amount, retired_amount, retirement_status, method, transaction_ref, note, disbursed_at, retired_at, verified_at, metadata, gross_amount, net_amount, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $6, $6, $12, $16)`,
        [
          crypto.randomUUID(),
          reqId,
          opsAccountId,
          expenseChartId,
          v.pv,
          v.amount,
          v.retiredAmount,
          v.status,
          v.method,
          v.ref,
          v.note,
          disbursedAt,
          retiredAt,
          verifiedAt,
          JSON.stringify({ title: v.title }),
          now,
        ],
      );
    }

    await client.query("COMMIT");
    console.log("Seeded 6 payroll components, 3 worker salary profiles, 3 monthly payroll runs (Oct/Nov/Dec 2026), and 4 payment vouchers (PV-2026-001..004).");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to seed payroll & vouchers:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedPayrollAndVouchers();
