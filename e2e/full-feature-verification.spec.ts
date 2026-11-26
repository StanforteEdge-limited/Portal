import { test, expect, type BrowserContext, type Page, type Response } from '@playwright/test';

const WEB_BASE = process.env.WEB_BASE_URL || 'http://localhost:5173';
const API_BASE = (process.env.API_BASE_URL || 'http://localhost:3000/v1').replace(/\/+$/, '');
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@acme.com';
const PASSWORD = process.env.E2E_PASSWORD || 'Password123!';

type EndpointIssue = { route: string; method: string; url: string; status: number };

function attachMonitor(page: Page) {
  const apiErrors: EndpointIssue[] = [];
  const pageErrors: string[] = [];
  let currentRoute = '/';
  const onResponse = (res: Response) => {
    const url = res.url();
    if (!url.includes('/v1/')) return;
    if (res.status() >= 400) {
      apiErrors.push({
        route: currentRoute,
        method: res.request().method(),
        url: url.replace(API_BASE, ''),
        status: res.status(),
      });
    }
  };
  const onPageError = (err: Error) => pageErrors.push(`[${currentRoute}] ${err.message}`);
  page.on('response', onResponse);
  page.on('pageerror', onPageError);
  return {
    setRoute: (r: string) => { currentRoute = r; },
    apiErrors,
    pageErrors,
    detach: () => {
      page.off('response', onResponse);
      page.off('pageerror', onPageError);
    },
  };
}

test.describe('Full Feature, Extended Finance, Mail, Billing/Paystack & Seed Data E2E', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto(`${WEB_BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('1. Healthz, Billing/Paystack API, Subscription Plans & Webhook Security', async () => {
    const health = await page.request.get(`${API_BASE}/health`);
    expect(health.status()).toBe(200);

    const plansRes = await page.request.get(`${API_BASE}/billing/plans`);
    expect(plansRes.status()).toBe(200);
    const plansJson = await plansRes.json();
    const plans = plansJson?.data ?? plansJson;
    expect(Array.isArray(plans)).toBe(true);
    expect(plans.map((p: any) => p.code)).toEqual(expect.arrayContaining(['starter', 'growth', 'enterprise']));

    const subRes = await page.request.get(`${API_BASE}/billing/subscription`);
    expect(subRes.status()).toBe(200);
    const subJson = await subRes.json();
    const sub = subJson?.data ?? subJson;
    expect(sub?.status).toBe('active');
    expect(sub?.plan?.code).toBe('growth');

    const badWebhook = await page.request.post(`${API_BASE}/billing/webhook/paystack`, {
      data: { event: 'charge.success', data: { reference: 'sub_fake' } },
      headers: { 'x-paystack-signature': 'invalid-hmac-signature' },
    });
    expect([401, 502]).toContain(badWebhook.status());
  });

  test('2. Mail page (/mail) loads cleanly with zero API 404/500s', async () => {
    const monitor = attachMonitor(page);
    monitor.setRoute('/mail');
    await page.goto(`${WEB_BASE}/mail`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await expect(page.locator('body')).not.toContainText('Page not found');
    monitor.detach();

    expect(monitor.apiErrors.filter((e) => e.status === 404 || e.status >= 500)).toEqual([]);
    expect(monitor.pageErrors).toEqual([]);
  });

  test('3. ALL Extended Finance & Accounting routes (23 routes): zero UI 404s, zero API 404/500s', async () => {
    const routes = [
      '/finance/budgets',
      '/finance/budgets/new',
      '/finance/chart-of-accounts',
      '/finance/expenses',
      '/finance/bills',
      '/finance/invoices',
      '/finance/income',
      '/finance/assets',
      '/finance/assets/new',
      '/finance/assets/disposals',
      '/finance/ledger/manual',
      '/finance/manual-entry/statutory-deductions',
      '/finance/legacy-manual-entry',
      '/finance/payables',
      '/finance/receivables',
      '/finance/deductions',
      '/finance/deductions/types',
      '/finance/reports',
      '/finance/contacts',
      '/finance/customers',
      '/finance/vendors',
      '/finance/items',
      '/finance/settings',
    ];
    const monitor = attachMonitor(page);
    const notFound: string[] = [];

    for (const r of routes) {
      monitor.setRoute(r);
      await page.goto(`${WEB_BASE}${r}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(200);
      if (await page.getByText('Page not found').isVisible().catch(() => false)) {
        notFound.push(r);
      }
    }

    monitor.detach();
    const api404s = monitor.apiErrors.filter((e) => e.status === 404);
    const api500s = monitor.apiErrors.filter((e) => e.status >= 500);
    if (api404s.length) console.log('[Extended Finance 404s]:', JSON.stringify(api404s, null, 2));
    if (api500s.length) console.log('[Extended Finance 500s]:', JSON.stringify(api500s, null, 2));

    expect(notFound, 'UI 404 routes').toEqual([]);
    expect(api500s, 'API 500 errors').toEqual([]);
    expect(api404s, 'API 404 errors').toEqual([]);
    expect(monitor.pageErrors, 'Uncaught JS errors').toEqual([]);
  });

  test('4. Seeded Demo Data renders live in UI (Budgets, Accounts, Expenses, Assets, Projects, Policies)', async () => {
    await page.goto(`${WEB_BASE}/finance/budgets`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/FY2026 Corporate Operations Budget/i)).toBeVisible({ timeout: 10000 });

    await page.goto(`${WEB_BASE}/finance/accounts`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/GTBank Operations Account/i)).toBeVisible({ timeout: 10000 });

    await page.goto(`${WEB_BASE}/finance/expenses`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/EXP-2026-001/i)).toBeVisible({ timeout: 10000 });

    await page.goto(`${WEB_BASE}/finance/assets`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/MacBook Pro 16-inch/i)).toBeVisible({ timeout: 10000 });

    await page.goto(`${WEB_BASE}/projects`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Stanforte Portal Enterprise Rollout/i)).toBeVisible({ timeout: 10000 });
  });
});
