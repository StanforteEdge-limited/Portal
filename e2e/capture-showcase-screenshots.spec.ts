import { test, expect } from '@playwright/test';
import { mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const WEB_BASE = process.env.WEB_BASE_URL || 'http://localhost:5173';
const SHOTS_DIR = join(process.cwd(), 'apps', 'web', 'public', 'screenshots');
const VIDEO_DIR = join(process.cwd(), 'apps', 'web', 'public', 'video-frames');

async function setTheme(page: any, mode: 'light' | 'dark') {
  await page.evaluate((m: string) => {
    localStorage.setItem('portal_theme_mode', m);
    document.documentElement.classList.toggle('dark', m === 'dark');
    document.documentElement.style.colorScheme = m;
  }, mode);
  await page.waitForTimeout(350);
}

test.describe('Capture Real Light & Dark Mode Portal Screenshots', () => {
  test.setTimeout(240_000);
  test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });

  test('captures light and dark mode screenshots for homepage & video frames', async ({ browser }) => {
    mkdirSync(SHOTS_DIR, { recursive: true });
    mkdirSync(VIDEO_DIR, { recursive: true });

    const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    const page = await adminCtx.newPage();

    await page.goto(`${WEB_BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.fill('input[type="email"]', 'admin@acme.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Mix of Light & Dark mode captures across every core module
    const captures: Array<{ route: string; file: string; mode: 'light' | 'dark' }> = [
      { route: '/dashboard', file: '01-dashboard.png', mode: 'light' },
      { route: '/dashboard', file: '01-dashboard-dark.png', mode: 'dark' },
      { route: '/finance', file: '02-finance-overview.png', mode: 'dark' },
      { route: '/finance/payment-vouchers', file: '03-payment-vouchers.png', mode: 'light' },
      { route: '/finance/payroll', file: '04-payroll.png', mode: 'dark' },
      { route: '/finance/payroll', file: '04-payroll-light.png', mode: 'light' },
      { route: '/hr/employees', file: '05-hr-employees.png', mode: 'light' },
      { route: '/hr/employees', file: '05-hr-employees-dark.png', mode: 'dark' },
      { route: '/attendance', file: '06-attendance.png', mode: 'dark' },
      { route: '/attendance', file: '06-attendance-light.png', mode: 'light' },
      { route: '/tasks', file: '07-tasks-projects.png', mode: 'light' },
      { route: '/analytics', file: '08-analytics.png', mode: 'dark' },
      { route: '/procurement', file: '11-procurement.png', mode: 'light' },
      { route: '/procurement', file: '11-procurement-dark.png', mode: 'dark' },
      { route: '/requests/approvals', file: '12-approvals.png', mode: 'light' },
      { route: '/requests/approvals', file: '12-approvals-dark.png', mode: 'dark' },
    ];

    for (const c of captures) {
      await page.goto(`${WEB_BASE}${c.route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
      await setTheme(page, c.mode);
      await page.evaluate(() => document.fonts.ready);
      const out = join(SHOTS_DIR, c.file);
      await page.screenshot({ path: out, fullPage: false, animations: 'disabled' });
      if (!c.file.includes('-light')) {
        copyFileSync(out, join(VIDEO_DIR, c.file));
      }
    }
    await adminCtx.close();

    // CEO Console (native graphite dark sidebar + light canvas)
    const ceoCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    const ceoPage = await ceoCtx.newPage();
    await ceoPage.goto(`${WEB_BASE}/ceo/login`, { waitUntil: 'domcontentloaded' });
    await ceoPage.waitForSelector('#ceo-email', { timeout: 15000 });
    await ceoPage.fill('#ceo-email', 'ceo@stanforteedge.com');
    await ceoPage.fill('#ceo-password', 'CeoPortal2026!');
    await ceoPage.click('button[type="submit"]');
    await ceoPage.waitForURL((u) => !u.pathname.includes('/ceo/login'), { timeout: 15000 });
    await expect(ceoPage.getByText(/Platform Revenue Trajectory/i)).toBeVisible({ timeout: 10000 });
    await ceoPage.waitForTimeout(400);
    const ceoOut = join(SHOTS_DIR, '09-ceo-console.png');
    await ceoPage.screenshot({ path: ceoOut, fullPage: false });
    copyFileSync(ceoOut, join(VIDEO_DIR, '09-ceo-console.png'));
    await ceoCtx.close();
  });
});
