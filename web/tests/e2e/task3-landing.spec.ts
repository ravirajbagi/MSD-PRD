import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Task 3 — Landing / API Key page', () => {
  test('shows product name and description', async ({ page }) => {
    await page.goto('/');
    await page.screenshot({ path: path.join('tests', 'screenshots', 'task3-01-landing.png'), fullPage: true });
    await expect(page.locator('[data-testid="product-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-description"]')).toBeVisible();
  });

  test('API key input field is visible and password-masked', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('[data-testid="api-key-input"]');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('type', 'password');
  });

  test('shows validation error when submitting empty key', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="get-started-btn"]');
    await page.screenshot({ path: path.join('tests', 'screenshots', 'task3-02-validation-error.png') });
    await expect(page.locator('[data-testid="api-key-error"]')).toBeVisible();
  });

  test('navigates to /upload when valid key is entered', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="api-key-input"]', 'sk-test-1234567890abcdef');
    await page.click('[data-testid="get-started-btn"]');
    await page.screenshot({ path: path.join('tests', 'screenshots', 'task3-03-after-submit.png') });
    await expect(page).toHaveURL('/upload');
  });

  test('key is stored in sessionStorage after submission', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="api-key-input"]', 'sk-test-stored-key');
    await page.click('[data-testid="get-started-btn"]');
    const stored = await page.evaluate(() => sessionStorage.getItem('openai_api_key'));
    expect(stored).toBe('sk-test-stored-key');
  });

  test('pressing Enter in the input navigates to /upload', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="api-key-input"]', 'sk-test-enter-key');
    await page.press('[data-testid="api-key-input"]', 'Enter');
    await expect(page).toHaveURL('/upload');
  });
});
