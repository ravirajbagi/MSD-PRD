import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Task 2 — API Key Format Validation', () => {
  test('client: empty key shows required error', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="get-started-btn"]');
    await expect(page.locator('[data-testid="api-key-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="api-key-error"]')).toContainText('required');
  });

  test('client: key not starting with sk- shows format error', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="api-key-input"]', 'invalid-key-that-is-long-enough');
    await page.click('[data-testid="get-started-btn"]');
    await expect(page.locator('[data-testid="api-key-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="api-key-error"]')).toContainText('sk-');
  });

  test('client: key starting with sk- but too short shows format error', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="api-key-input"]', 'sk-tooshort');
    await page.click('[data-testid="get-started-btn"]');
    await expect(page.locator('[data-testid="api-key-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="api-key-error"]')).toContainText('sk-');
  });

  test('client: valid sk- key with 20+ suffix navigates to /upload', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="api-key-input"]', 'sk-test-12345678901234567890');
    await page.click('[data-testid="get-started-btn"]');
    await expect(page).toHaveURL('/upload');
  });

  test('server: POST /api/generate with bad format key returns 400', async ({ request }) => {
    const res = await request.post('/api/generate', {
      data: { paperText: 'a'.repeat(100), apiKey: 'notvalid' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid api key format/i);
  });

  test('server: POST /api/generate with key not starting with sk- returns 400', async ({ request }) => {
    const res = await request.post('/api/generate', {
      data: { paperText: 'a'.repeat(100), apiKey: 'Bearer eyJhbGciOiJIUzI1NiJ9xxxxxxxxxx' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid api key format/i);
  });

  test('screenshot — format validation error on landing page', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="api-key-input"]', 'badkey');
    await page.click('[data-testid="get-started-btn"]');
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task2-01-key-format-error.png'),
    });
    await expect(page.locator('[data-testid="api-key-error"]')).toBeVisible();
  });
});
