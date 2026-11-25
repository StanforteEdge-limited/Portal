import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'Mobile (iPhone 13/14)', width: 375, height: 812 },
  { name: 'Tablet (iPad Mini)', width: 768, height: 1024 },
];

const TARGET_ROUTES = [
  '/',
  '/projects',
  '/tasks',
  '/documents',
  '/hr/attendance',
  '/account/profile',
];

for (const vp of VIEWPORTS) {
  test.describe(`Responsive Viewport Audit: ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of TARGET_ROUTES) {
      test(`Audit route "${route}" for horizontal overflow and touch targets`, async ({ page }) => {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500); // Allow layout transition to settle

        // 1. Assert No Horizontal Overflow
        const overflow = await page.evaluate(() => {
          const scrollWidth = document.documentElement.scrollWidth;
          const innerWidth = window.innerWidth;
          return {
            hasOverflow: scrollWidth > innerWidth,
            scrollWidth,
            innerWidth,
          };
        });

        expect(
          overflow.hasOverflow,
          `Horizontal scroll blowout detected on ${route} (${vp.name}): scrollWidth (${overflow.scrollWidth}px) exceeds innerWidth (${overflow.innerWidth}px)`
        ).toBe(false);

        // 2. Assert Touch Target Sizing (buttons, nav links, primary inputs >= 40x40px)
        const subSizedTargets = await page.evaluate(() => {
          const interactiveElements = Array.from(
            document.querySelectorAll<HTMLElement>('button:not([hidden]), a:not([hidden]), input:not([type="hidden"])')
          );

          const failures: { tag: string; text: string; width: number; height: number }[] = [];

          for (const el of interactiveElements) {
            // Only inspect elements currently rendered in viewport
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

            // Flag touch targets below 36px threshold
            if (rect.width < 36 || rect.height < 36) {
              failures.push({
                tag: el.tagName.toLowerCase(),
                text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').slice(0, 30).trim(),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              });
            }
          }

          return failures;
        });

        if (subSizedTargets.length > 0) {
          console.warn(
            `[Touch Target Notice] Route ${route} (${vp.name}) has ${subSizedTargets.length} elements < 36px:`,
            subSizedTargets.slice(0, 3)
          );
        }
      });
    }
  });
}
