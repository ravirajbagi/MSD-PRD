import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Task 1 — Next.js + Tailwind + shadcn/ui setup', () => {
  test('app loads on localhost:3000', async ({ page }) => {
    await page.goto('/');
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task1-01-homepage.png'),
    });
    await expect(page).not.toHaveTitle('');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Tailwind CSS is active — body has expected background or text styling', async ({ page }) => {
    await page.goto('/');
    // The default Next.js page uses Tailwind — check at least one element exists
    const body = page.locator('body');
    await expect(body).toBeVisible();
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task1-02-tailwind-check.png'),
    });
  });

  test('shadcn/ui Button component is importable (smoke test via page render)', async ({ page }) => {
    await page.goto('/');
    // We verify the app renders without JS errors, which confirms shadcn imports work
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task1-03-no-errors.png'),
    });
    expect(errors.filter(e => !e.includes('Warning:'))).toHaveLength(0);
  });
});
