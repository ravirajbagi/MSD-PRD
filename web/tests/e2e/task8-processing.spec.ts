import { test, expect } from '@playwright/test';
import path from 'path';

async function seedSession(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    sessionStorage.setItem('openai_api_key', 'sk-test-key-1234567890abcdef');
    sessionStorage.setItem('paper_text', 'Sample paper about attention mechanisms in deep learning.');
    sessionStorage.setItem('paper_title', 'Attention Is All You Need');
  });
}

// Pre-canned SSE error response — avoids real OpenAI call and dev-mode SSE buffering
const ERROR_SSE = [
  'data: {"status": "Analyzing paper..."}\n\n',
  'data: {"error": "Invalid API key. Please check your key and try again."}\n\n',
].join('');

test.describe('Task 8 — Processing / Waiting page', () => {
  test('page renders spinner and initial status message', async ({ page }) => {
    // Delay generate response so spinner is visible during initial render
    await page.route('**/api/generate', async (route) => {
      // Check spinner before delivering error — adds 2s delay
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        body: ERROR_SSE,
      });
    });
    await seedSession(page);
    await page.goto('/processing');
    // Spinner is visible in initial 'processing' phase
    await expect(page.locator('[data-testid="processing-spinner"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-feed"]')).toBeVisible();
    await page.screenshot({ path: path.join('tests', 'screenshots', 'task8-01-processing-start.png'), fullPage: true });
  });

  test('shows error state with Try Again link on failure', async ({ page }) => {
    await page.route('**/api/generate', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        body: ERROR_SSE,
      });
    });
    await seedSession(page);
    await page.goto('/processing');
    await expect(page.locator('[data-testid="error-state"]')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join('tests', 'screenshots', 'task8-02-error-state.png') });
    await expect(page.locator('[data-testid="try-again-link"]')).toBeVisible();
  });

  test('Try Again link navigates back to /upload', async ({ page }) => {
    await page.route('**/api/generate', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        body: ERROR_SSE,
      });
    });
    await seedSession(page);
    await page.goto('/processing');
    await expect(page.locator('[data-testid="error-state"]')).toBeVisible({ timeout: 10000 });
    await page.click('[data-testid="try-again-link"]');
    await expect(page).toHaveURL('/upload');
  });
});
