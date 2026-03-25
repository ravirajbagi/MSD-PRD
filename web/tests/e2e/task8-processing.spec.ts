import { test, expect } from '@playwright/test';
import path from 'path';

async function seedSession(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    sessionStorage.setItem('openai_api_key', 'sk-test-key-123456');
    sessionStorage.setItem('paper_text', 'Sample paper about attention mechanisms in deep learning.');
    sessionStorage.setItem('paper_title', 'Attention Is All You Need');
  });
}

test.describe('Task 8 — Processing / Waiting page', () => {
  test('page renders spinner and initial status message', async ({ page }) => {
    await seedSession(page);
    await page.goto('/processing');
    await page.screenshot({ path: path.join('tests', 'screenshots', 'task8-01-processing-start.png'), fullPage: true });
    await expect(page.locator('[data-testid="processing-spinner"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-feed"]')).toBeVisible();
  });

  test('shows error state with Try Again link on failure', async ({ page }) => {
    await seedSession(page);
    // Override sessionStorage with a bad key that will trigger an error
    await page.goto('/processing');
    // Wait for error state to appear (the mock SSE will fail with invalid key)
    await expect(page.locator('[data-testid="error-state"]')).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: path.join('tests', 'screenshots', 'task8-02-error-state.png') });
    await expect(page.locator('[data-testid="try-again-link"]')).toBeVisible();
  });

  test('Try Again link navigates back to /upload', async ({ page }) => {
    await seedSession(page);
    await page.goto('/processing');
    await expect(page.locator('[data-testid="error-state"]')).toBeVisible({ timeout: 30000 });
    await page.click('[data-testid="try-again-link"]');
    await expect(page).toHaveURL('/upload');
  });
});
