import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const ADMIN_EMAIL = "admin@acme.com";
const EMPLOYEE_EMAIL = "employee@acme.com";
const PASSWORD = "Password123!";

async function loginAs(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

test.describe.serial("Payroll & Payment Vouchers End-to-End", () => {
  test.setTimeout(45000);

  let adminContext: BrowserContext;
  let adminPage: Page;

  test.beforeAll(async ({ browser }) => {
    adminContext = await browser.newContext();
    adminPage = await adminContext.newPage();
    await loginAs(adminPage, ADMIN_EMAIL);
  });

  test.afterAll(async () => {
    await adminContext?.close();
  });

  test("1. Finance Payroll Hub displays seeded runs and action controls", async () => {
    await adminPage.goto("/finance/payroll", { waitUntil: "networkidle" });

    await expect(adminPage.getByRole("heading", { name: /Payroll & Employee Payments/i })).toBeVisible();
    await expect(adminPage.getByRole("button", { name: /Employee Salaries/i })).toBeVisible();
    await expect(adminPage.getByRole("button", { name: /Components/i })).toBeVisible();
    await expect(adminPage.getByRole("button", { name: /Tax Tables/i })).toBeVisible();
    await expect(adminPage.getByRole("button", { name: /New Payroll Run/i })).toBeVisible();

    await expect(adminPage.getByText("Payroll October 2026").first()).toBeVisible();
    await expect(adminPage.getByText("Payroll November 2026").first()).toBeVisible();
    await expect(adminPage.getByText("Payroll December 2026").first()).toBeVisible();
  });

  test("2. Employee salaries, payroll components, and tax tables load cleanly", async () => {
    await adminPage.goto("/hr/payroll/workers", { waitUntil: "networkidle" });
    const workersTable = adminPage.getByRole("table");
    await expect(workersTable.getByText("Daniel Owonikoko")).toBeVisible();
    await expect(workersTable.getByText("Folake Adeleke")).toBeVisible();
    await expect(workersTable.getByText("Chidi Eze")).toBeVisible();

    await adminPage.goto("/finance/payroll/components", { waitUntil: "networkidle" });
    await expect(adminPage.getByText("Basic Salary").first()).toBeVisible();
    await expect(adminPage.getByText("PAYE Income Tax").first()).toBeVisible();

    await adminPage.goto("/finance/payroll/tax-tables", { waitUntil: "networkidle" });
    await expect(adminPage.locator("h1").first()).toBeVisible();
  });

  test("3. Create a new payroll run, generate employee items, and clean up", async () => {
    await adminPage.goto("/hr/payroll/runs/new", { waitUntil: "networkidle" });
    await expect(adminPage.getByRole("heading", { name: /New Payroll Run/i })).toBeVisible();

    const uniqueRunName = `Payroll E2E ${Date.now()}`;
    await adminPage.locator("form input").first().fill(uniqueRunName);

    const selects = adminPage.locator("form select");
    if ((await selects.count()) >= 3) {
      await selects.nth(1).selectOption("2027");
      await selects.nth(2).selectOption("1");
    }

    await adminPage.getByRole("button", { name: /Create Run/i }).click();
    await adminPage.waitForURL("**/hr/payroll/runs/**", { timeout: 15000 });
    await expect(adminPage.getByText(uniqueRunName)).toBeVisible();

    const generateBtn = adminPage.getByRole("button", { name: /Generate/i }).first();
    if (await generateBtn.isVisible().catch(() => false)) {
      await generateBtn.click();
      await adminPage.waitForTimeout(1000);
    }

    adminPage.once("dialog", (dialog) => dialog.accept());
    const deleteBtn = adminPage.getByRole("button", { name: /Delete/i }).first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      await adminPage.waitForURL("**/hr/payroll", { timeout: 15000 });
    }
  });

  test("4. Executive Payroll Authorization shows approved November 2026 run", async () => {
    await adminPage.goto("/admin/payroll/authorization", { waitUntil: "networkidle" });

    await expect(adminPage.getByRole("heading", { name: /Payroll authorization/i })).toBeVisible();
    await expect(adminPage.getByText("Payroll November 2026").first()).toBeVisible();
    await expect(adminPage.getByRole("link", { name: /New payroll run/i })).toBeVisible();
  });

  test("5. Payment Vouchers register renders seeded vouchers and supports filtering", async () => {
    await adminPage.goto("/finance/payment-vouchers", { waitUntil: "networkidle" });

    await expect(adminPage.getByRole("heading", { name: /Payment Vouchers/i })).toBeVisible();
    await expect(adminPage.getByText("PV-2026-001")).toBeVisible();
    await expect(adminPage.getByText("PV-2026-002")).toBeVisible();
    await expect(adminPage.getByText("PV-2026-003")).toBeVisible();
    await expect(adminPage.getByText("PV-2026-004")).toBeVisible();

    // Filter by Confirmed (retirement_status = 'verified')
    await adminPage.getByRole("button", { name: /^Confirmed$/i }).click();
    await expect(adminPage.getByText("PV-2026-001")).toBeVisible();
    await expect(adminPage.getByText("PV-2026-002")).not.toBeVisible();

    // Back to All Vouchers and search
    await adminPage.getByRole("button", { name: /All Vouchers/i }).click();
    const searchInput = adminPage.locator('input[placeholder*="Search voucher"]');
    await searchInput.fill("PV-2026-003");
    await expect(adminPage.getByText("PV-2026-003")).toBeVisible();
    await expect(adminPage.getByText("PV-2026-001")).not.toBeVisible();
  });

  test("6. Employee self-service payslips page loads cleanly", async ({ browser }) => {
    const empContext = await browser.newContext();
    const empPage = await empContext.newPage();
    const pageErrors: string[] = [];
    empPage.on("pageerror", (err) => pageErrors.push(err.message));

    try {
      await loginAs(empPage, EMPLOYEE_EMAIL);
      await empPage.goto("/account/payslips", { waitUntil: "networkidle" });
      await expect(empPage.locator("h1").first()).toBeVisible();
      expect(pageErrors).toEqual([]);
    } finally {
      await empContext.close();
    }
  });
});
