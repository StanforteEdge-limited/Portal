const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://stanforte:stanforte-dev@localhost:5455/stanforte?schema=public";

async function setupCeoAndSupportTables() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to Postgres to create CEO & Support tables...");

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS sta_platform_admins (
        id BIGSERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        title VARCHAR(150) NOT NULL DEFAULT 'Chief Executive Officer',
        is_active BOOLEAN NOT NULL DEFAULT true,
        failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        lockout_until TIMESTAMP NULL,
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sta_platform_deployments (
        id BIGSERIAL PRIMARY KEY,
        version VARCHAR(64) NOT NULL,
        commit_sha VARCHAR(64) NOT NULL,
        environment VARCHAR(32) NOT NULL DEFAULT 'production',
        status VARCHAR(32) NOT NULL DEFAULT 'succeeded',
        deployed_by VARCHAR(150) NOT NULL,
        duration_seconds INTEGER NOT NULL DEFAULT 42,
        notes TEXT,
        deployed_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sta_support_inquiries (
        id BIGSERIAL PRIMARY KEY,
        reference VARCHAR(32) NOT NULL UNIQUE,
        name VARCHAR(200) NOT NULL,
        email VARCHAR(255) NOT NULL,
        organization VARCHAR(200),
        category VARCHAR(50) NOT NULL DEFAULT 'support',
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'open',
        admin_notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Seed dedicated CEO credentials (idempotent)
    const ceoEmail = "ceo@stanforteedge.com";
    const ceoHash = bcrypt.hashSync("CeoPortal2026!", 12);
    await client.query(
      `INSERT INTO sta_platform_admins (email, password_hash, full_name, title, is_active)
       VALUES ($1, $2, 'Executive Director', 'Chief Executive Officer', true)
       ON CONFLICT (email) DO NOTHING`,
      [ceoEmail, ceoHash],
    );

    // Seed deployment history if empty
    const depCount = await client.query(`SELECT count(*)::int AS c FROM sta_platform_deployments`);
    if (depCount.rows[0].c === 0) {
      await client.query(`
        INSERT INTO sta_platform_deployments (version, commit_sha, environment, status, deployed_by, duration_seconds, notes, deployed_at)
        VALUES
          ('v2.4.0', 'c1ed8037', 'production', 'succeeded', 'GitHub Actions CI/CD', 48, 'Security hardening (JWT HS256, timing-safe auth, disposable email blocklist) + Finance & Billing routes', NOW() - INTERVAL '2 hours'),
          ('v2.3.8', 'fe6d8b5d', 'production', 'succeeded', 'GitHub Actions CI/CD', 44, 'Project resource management, Payroll authorization, and multi-tenant isolation guardrails', NOW() - INTERVAL '2 days'),
          ('v2.3.5', '30a75059', 'staging', 'succeeded', 'Release Pipeline', 39, 'Playwright E2E verification & mobile viewport audit', NOW() - INTERVAL '5 days'),
          ('v2.3.2', '510c0b37', 'production', 'succeeded', 'GitHub Actions CI/CD', 51, 'Web portal layout, navigation, and core HR/Finance self-service pages', NOW() - INTERVAL '9 days')
      `);
    }

    // Seed sample support inquiries if empty
    const inqCount = await client.query(`SELECT count(*)::int AS c FROM sta_support_inquiries`);
    if (inqCount.rows[0].c === 0) {
      await client.query(`
        INSERT INTO sta_support_inquiries (reference, name, email, organization, category, subject, message, status, created_at)
        VALUES
          ('SUP-2026-101', 'Folake Adeleke', 'manager@acme.com', 'Acme Nigeria Ltd', 'support', 'Bulk CSV payroll import formatting', 'Could you share the latest CSV column mapping for PenCom PFA codes?', 'open', NOW() - INTERVAL '4 hours'),
          ('SUP-2026-102', 'Tunde Bakare', 'tunde@sterlingpartners.ng', 'Sterling Enterprise Partners', 'sales', 'Enterprise 250-seat multi-branch rollout', 'We would like to schedule a dedicated onboarding call for 4 subsidiaries in Lagos and Abuja.', 'in_progress', NOW() - INTERVAL '1 day'),
          ('SUP-2026-103', 'Chidi Eze', 'employee@acme.com', 'Acme Nigeria Ltd', 'bug_report', 'Geofence radius check at Ikeja Annex', 'Resolved after updating office coordinates to 200m radius.', 'resolved', NOW() - INTERVAL '3 days')
      `);
    }

    await client.query("COMMIT");
    console.log("CEO & Support tables created and seeded successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to setup CEO & Support tables:", err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

setupCeoAndSupportTables();
