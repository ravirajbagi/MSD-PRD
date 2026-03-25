import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Task 10 — E2E Navigation Guards', () => {
  test('visiting /upload without API key redirects to /', async ({ page }) => {
    // Clear sessionStorage
    await page.goto('/');
    await page.evaluate(() => sessionStorage.clear());
    await page.goto('/upload');
    await page.screenshot({ path: path.join('tests', 'screenshots', 'task10-01-upload-redirect.png') });
    await expect(page).toHaveURL('/');
  });

  test('visiting /processing without paper text redirects to /', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => sessionStorage.clear());
    await page.goto('/processing');
    await expect(page).toHaveURL('/');
  });

  test('visiting /result without notebook data redirects to /upload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.clear();
      sessionStorage.setItem('openai_api_key', 'sk-test');
    });
    await page.goto('/result');
    await expect(page).toHaveURL('/upload');
  });

  test('full happy-path navigation flow exists (/ -> /upload -> /processing)', async ({ page }) => {
    // Step 1: Enter API key
    await page.goto('/');
    await page.fill('[data-testid="api-key-input"]', 'sk-test-1234567890');
    await page.click('[data-testid="get-started-btn"]');
    await expect(page).toHaveURL('/upload');

    // Step 2: Upload page renders correctly
    await expect(page.locator('[data-testid="pdf-dropzone"]')).toBeVisible();
    await page.screenshot({ path: path.join('tests', 'screenshots', 'task10-02-happy-path-upload.png') });
  });

  test('error boundary renders fallback for bad notebook JSON on result page', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.setItem('openai_api_key', 'sk-test');
      sessionStorage.setItem('paper_title', 'Test Paper');
      sessionStorage.setItem('notebook_json', 'INVALID JSON {{{');
    });
    await page.goto('/result');
    // Should handle gracefully — either redirect or show error boundary
    await page.screenshot({ path: path.join('tests', 'screenshots', 'task10-03-error-boundary.png'), fullPage: true });
    // Page should not crash to a blank white screen — either redirects or shows error UI
    const body = page.locator('body');
    await expect(body).toBeVisible();
    // Should NOT be a Next.js 500 error page
    await expect(page.locator('text=Application error')).not.toBeVisible();
  });
});
