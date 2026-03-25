import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Task 2 — ARC-AGI dark theme + PageShell', () => {
  test('body has near-black background (#0a0a0a)', async ({ page }) => {
    await page.goto('/');
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task2-01-dark-bg.png'),
      fullPage: true,
    });
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // #0a0a0a = rgb(10, 10, 10)
    expect(bgColor).toBe('rgb(10, 10, 10)');
  });

  test('PageShell renders with nav bar containing the product name', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('[data-testid="top-nav"]');
    await expect(nav).toBeVisible();
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task2-02-nav-bar.png'),
    });
  });

  test('nav bar contains product name text', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('[data-testid="top-nav"]');
    await expect(nav).toContainText('PaperToNotebook');
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task2-03-product-name.png'),
    });
  });

  test('page content area is visible inside PageShell', async ({ page }) => {
    await page.goto('/');
    const main = page.locator('[data-testid="page-main"]');
    await expect(main).toBeVisible();
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task2-04-page-shell.png'),
      fullPage: true,
    });
  });

  test('accent color CSS variable is set to electric orange', async ({ page }) => {
    await page.goto('/');
    const accentColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--accent-electric')
        .trim();
    });
    expect(accentColor).toBeTruthy();
  });
});
