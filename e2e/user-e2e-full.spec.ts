import { test, expect, type BrowserContext, type Page, type Response } from '@playwright/test';

/**
 * Comprehensive End-to-End User & Browser Test Suite (Playwright)
 *
 * Covers:
 *  1. Public pages & interactive controls (Landing, Pricing toggle + FAQs, Features, Security, Vendor Portal Login)
 *  2. Authentication flows (invalid login, password toggle, Employee RBAC gating, Admin login)
 *  3. Full Page-by-Page & Endpoint Integration Audit (Core, Staff, HR, Admin, Finance, Payroll)
 *  4. Interactive UI & Button-Clicking Flows (Dashboard, Tasks, Projects, Attendance, Leave, Procurement, Admin Settings tabs)
 *  5. Payment & Finance End-to-End Flows (Payment Request form, Payment Vouchers, Finance Requests, Payroll)
 */

const WEB_BASE = process.env.WEB_BASE_URL || 'http://localhost:5173';
const API_BASE = (process.env.API_BASE_URL || 'http://localhost:3000/v1').replace(/\/+$/, '');

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@acme.com';
const EMPLOYEE_EMAIL = process.env.E2E_EMPLOYEE_EMAIL || 'employee@acme.com';
const PASSWORD = process.env.E2E_PASSWORD || 'Password123!';

type EndpointIssue = {
  route: string;
  method: string;
  url: string;
  status: number;
};

async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto(`${WEB_BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
}

function attachNetworkAndErrorMonitor(page: Page) {
  const apiErrors: EndpointIssue[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  let currentRoute = '/';

  const onResponse = (res: Response) => {
    const url = res.url();
    if (!url.includes('/v1/')) return;
    const status = res.status();
    if (status >= 400) {
      apiErrors.push({
        route: currentRoute,
        method: res.request().method(),
        url: url.replace(API_BASE, ''),
        status,
      });
    }
  };

  const onPageError = (err: Error) => {
    pageErrors.push(`[${currentRoute}] ${err.message}`);
  };

  const onConsole = (msg: any) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('Failed to load resource')) {
        consoleErrors.push(`[${currentRoute}] ${text}`);
      }
    }
  };

  page.on('response', onResponse);
  page.on('pageerror', onPageError);
  page.on('console', onConsole);

  return {
    setRoute: (r: string) => {
      currentRoute = r;
    },
    apiErrors,
    consoleErrors,
    pageErrors,
    detach: () => {
      page.off('response', onResponse);
      page.off('pageerror', onPageError);
      page.off('console', onConsole);
    },
  };
}

/* ============================================================================
   1. Public Marketing Pages & Interactive Controls
   ============================================================================ */
test.describe('1. Public Pages & Interactive UI', () => {
  test('Public marketing pages load cleanly and interactive controls work', async ({ page }) => {
    const monitor = attachNetworkAndErrorMonitor(page);

    monitor.setRoute('/');
    await page.goto(`${WEB_BASE}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toContainText('Page not found');

    // Pricing page — click Monthly / Annual toggle and FAQ accordion
    monitor.setRoute('/pricing');
    await page.goto(`${WEB_BASE}/pricing`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('$49')).toBeVisible();
    await page.getByRole('button', { name: 'Monthly Billing' }).click();
    await expect(page.getByText('$59')).toBeVisible();
    await page.getByRole('button', { name: /Annual Billing/i }).click();
    await expect(page.getByText('$49')).toBeVisible();
    await page.getByText('How is monthly payroll calculated?').click();
    await expect(page.getByText(/statutory PAYE taxes/i)).toBeVisible();

    monitor.setRoute('/features');
    await page.goto(`${WEB_BASE}/features`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toContainText('Page not found');

    monitor.setRoute('/security');
    await page.goto(`${WEB_BASE}/security`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toContainText('Page not found');

    monitor.setRoute('/vendor-portal/login');
    await page.goto(`${WEB_BASE}/vendor-portal/login`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Vendor Portal')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();

    monitor.detach();
    expect(monitor.pageErrors, `Uncaught page errors: ${monitor.pageErrors.join('\n')}`).toEqual([]);
  });
});

/* ============================================================================
   2. Authentication, Invalid Login & Employee RBAC Gating
   ============================================================================ */
test.describe('2. Authentication & RBAC UI Flows', () => {
  test('shows error on invalid credentials and toggles password visibility', async ({ page }) => {
    await page.goto(`${WEB_BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', 'WrongPassword999!');

    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(page.locator('input[placeholder="Password"]')).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(page.locator('input[placeholder="Password"]')).toHaveAttribute('type', 'password');

    await page.click('button[type="submit"]');
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
  });

  test('employee login succeeds and restricts admin-only analytics page', async ({ page }) => {
    await loginViaUI(page, EMPLOYEE_EMAIL, PASSWORD);
    await expect(page).toHaveURL(/\/(dashboard)?$/);

    await page.goto(`${WEB_BASE}/analytics`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Administrator access required/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Return to dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

/* ============================================================================
   3. Authenticated Admin Suite (Single Login — Zero Rate-Limit Churn)
   ============================================================================ */
test.describe('3. Authenticated Admin E2E Suite', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  let adminContext: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    adminContext = await browser.newContext();
    page = await adminContext.newPage();
    await loginViaUI(page, ADMIN_EMAIL, PASSWORD);
  });

  test.afterAll(async () => {
    await adminContext?.close();
  });

  async function auditRoutes(routes: string[], groupName: string) {
    const monitor = attachNetworkAndErrorMonitor(page);
    const notFoundRoutes: string[] = [];

    for (const route of routes) {
      monitor.setRoute(route);
      await page.goto(`${WEB_BASE}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(200);

      const is404 = await page.getByText('Page not found').isVisible().catch(() => false);
      if (is404) {
        notFoundRoutes.push(route);
      }
    }

    monitor.detach();
    return {
      notFoundRoutes,
      api404s: monitor.apiErrors.filter((e) => e.status === 404),
      api500s: monitor.apiErrors.filter((e) => e.status >= 500),
      pageErrors: monitor.pageErrors,
      groupName,
    };
  }

  test('Core & Staff pages (22 routes): zero UI 404s, zero JS errors, zero API 404/500s', async () => {
    const res = await auditRoutes(
      [
        '/dashboard',
        '/requests',
        '/requests/new',
        '/requests/approvals',
        '/tasks',
        '/attendance',
        '/leave',
        '/projects',
        '/teams',
        '/documents',
        '/policies',
        '/files',
        '/chat',
        '/profile',
        '/profile/payslips',
        '/profile/timesheets',
        '/account/settings',
        '/account/notifications',
        '/account/help',
        '/account/downloads',
        '/procurement',
        '/analytics',
      ],
      'Core & Staff',
    );
    expect(res.notFoundRoutes, 'UI 404 routes').toEqual([]);
    expect(res.api500s, 'API 500 errors').toEqual([]);
    expect(res.api404s, 'API 404 errors').toEqual([]);
    expect(res.pageErrors, 'Uncaught JS errors').toEqual([]);
  });

  test('HR & Administration pages (16 routes): zero UI 404s, zero JS errors, zero API 404/500s', async () => {
    const res = await auditRoutes(
      [
        '/hr/employees',
        '/hr/employees/create',
        '/hr/attendance',
        '/hr/leave',
        '/hr/payroll/loans',
        '/hr/payroll/workers',
        '/hr/settings',
        '/admin/users',
        '/admin/users/bulk',
        '/admin/groups',
        '/admin/roles',
        '/admin/organizations',
        '/admin/projects',
        '/admin/files',
        '/admin/settings',
        '/admin/payroll/authorization',
      ],
      'HR & Admin',
    );
    expect(res.notFoundRoutes, 'UI 404 routes').toEqual([]);
    expect(res.api500s, 'API 500 errors').toEqual([]);
    expect(res.api404s, 'API 404 errors').toEqual([]);
    expect(res.pageErrors, 'Uncaught JS errors').toEqual([]);
  });

  test('Finance Core & Payroll pages: zero UI 404s, zero JS errors, zero API 404/500s', async () => {
    const res = await auditRoutes(
      [
        '/finance',
        '/finance/requests',
        '/finance/payment-vouchers',
        '/finance/accounts',
        '/finance/ledger',
        '/finance/payroll',
        '/finance/payroll/components',
        '/finance/payroll/tax-tables',
      ],
      'Finance Core & Payroll',
    );
    expect(res.notFoundRoutes, 'UI 404 routes').toEqual([]);
    expect(res.api500s, 'API 500 errors').toEqual([]);
    expect(res.api404s, 'API 404 errors').toEqual([]);
    expect(res.pageErrors, 'Uncaught JS errors').toEqual([]);
  });

  test('Newly wired Finance sidebar routes render UI cleanly without 404 NotFoundScreen', async () => {
    const res = await auditRoutes(
      [
        '/finance/income',
        '/finance/manual-entry/statutory-deductions',
        '/finance/legacy-manual-entry',
        '/finance/customers',
        '/finance/vendors',
        '/finance/items',
      ],
      'Finance Extended UI',
    );
    expect(res.notFoundRoutes, 'UI 404 routes').toEqual([]);
    expect(res.pageErrors, 'Uncaught JS errors').toEqual([]);
  });

  test('Admin Settings: click through all 6 configuration tabs', async () => {
    const monitor = attachNetworkAndErrorMonitor(page);
    monitor.setRoute('/admin/settings');
    await page.goto(`${WEB_BASE}/admin/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    for (const tab of [
      'Request Types',
      'Categories',
      'Taxonomies',
      'Workspace Profile',
      'Timezone & Regional',
      'Security & Access',
    ]) {
      const btn = page.getByRole('button', { name: tab });
      await expect(btn).toBeVisible({ timeout: 8000 });
      await btn.click();
      await page.waitForTimeout(300);
    }

    monitor.detach();
    expect(monitor.apiErrors.filter((e) => e.status === 404 || e.status >= 500)).toEqual([]);
    expect(monitor.pageErrors).toEqual([]);
  });

  test('Tasks: switch views and click New Task button', async () => {
    const monitor = attachNetworkAndErrorMonitor(page);
    monitor.setRoute('/tasks');
    await page.goto(`${WEB_BASE}/tasks`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    const dailyLogBtn = page.getByRole('button', { name: /Daily Log/i }).first();
    if (await dailyLogBtn.isVisible().catch(() => false)) {
      await dailyLogBtn.click();
      await page.waitForTimeout(250);
    }
    const myTasksBtn = page.getByRole('button', { name: /My Tasks/i }).first();
    if (await myTasksBtn.isVisible().catch(() => false)) {
      await myTasksBtn.click();
      await page.waitForTimeout(250);
    }
    const newTaskBtn = page.getByRole('button', { name: /New Task|Add Task/i }).first();
    if (await newTaskBtn.isVisible().catch(() => false)) {
      await newTaskBtn.click();
      await page.waitForTimeout(250);
    }

    monitor.detach();
    expect(monitor.apiErrors.filter((e) => e.status >= 500)).toEqual([]);
    expect(monitor.pageErrors).toEqual([]);
  });

  test('Procurement: navigate tabs (Requisitions, Purchase Orders, Vendors)', async () => {
    const monitor = attachNetworkAndErrorMonitor(page);
    monitor.setRoute('/procurement');
    await page.goto(`${WEB_BASE}/procurement`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    for (const label of ['Purchase Orders', 'Vendors', 'Requisitions']) {
      const btn = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(250);
      }
    }

    monitor.detach();
    expect(monitor.apiErrors.filter((e) => e.status === 404 || e.status >= 500)).toEqual([]);
    expect(monitor.pageErrors).toEqual([]);
  });

  test('Payment & Disbursement flow: Payment Request creation page + Payment Vouchers filter + Payroll', async () => {
    const monitor = attachNetworkAndErrorMonitor(page);

    // 1. Open /requests/new and click a Payment / Financial request type
    monitor.setRoute('/requests/new');
    await page.goto(`${WEB_BASE}/requests/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await expect(page.locator('body')).not.toContainText('Page not found');

    const paymentCard = page.locator('button, a').filter({ hasText: /Payment|Expense|Reimbursement|Finance/i }).first();
    if (await paymentCard.isVisible().catch(() => false)) {
      await paymentCard.click();
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(300);
    }

    // 2. Payment Vouchers page + filter interaction
    monitor.setRoute('/finance/payment-vouchers');
    await page.goto(`${WEB_BASE}/finance/payment-vouchers`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const searchInput = page.locator('input[placeholder*="voucher" i], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('PV-');
      await page.waitForTimeout(250);
      await searchInput.fill('');
    }

    // 3. Finance Requests queue & Payroll runs
    monitor.setRoute('/finance/requests');
    await page.goto(`${WEB_BASE}/finance/requests`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    monitor.setRoute('/finance/payroll');
    await page.goto(`${WEB_BASE}/finance/payroll`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    monitor.detach();
    expect(monitor.apiErrors.filter((e) => e.status === 404 || e.status >= 500)).toEqual([]);
    expect(monitor.pageErrors).toEqual([]);
  });
});
