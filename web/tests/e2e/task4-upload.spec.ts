import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Helper: set API key in sessionStorage before navigating
async function setApiKey(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => sessionStorage.setItem('openai_api_key', 'sk-test-key-123456'));
}

test.describe('Task 4 — PDF Upload page', () => {
  test('upload page renders drop zone and browse button', async ({ page }) => {
    await setApiKey(page);
    await page.goto('/upload');
    await page.screenshot({ path: path.join('tests', 'screenshots', 'task4-01-upload-page.png'), fullPage: true });
    await expect(page.locator('[data-testid="pdf-dropzone"]')).toBeVisible();
    await expect(page.locator('[data-testid="browse-btn"]')).toBeVisible();
  });

  test('Generate button is disabled before file is selected', async ({ page }) => {
    await setApiKey(page);
    await page.goto('/upload');
    const btn = page.locator('[data-testid="generate-btn"]');
    await expect(btn).toBeDisabled();
  });

  test('uploading a PDF shows filename and enables Generate button', async ({ page }) => {
    await setApiKey(page);
    await page.goto('/upload');

    // Create a tiny valid-looking PDF buffer for testing
    const pdfPath = path.join('tests', 'fixtures', 'test.pdf');
    // Use a real minimal PDF
    await page.locator('[data-testid="file-input"]').setInputFiles(pdfPath);

    await page.screenshot({ path: path.join('tests', 'screenshots', 'task4-02-file-selected.png') });
    await expect(page.locator('[data-testid="file-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="generate-btn"]')).toBeEnabled();
  });

  test('rejects non-PDF files with an error message', async ({ page }) => {
    await setApiKey(page);
    await page.goto('/upload');

    const txtPath = path.join('tests', 'fixtures', 'test.txt');
    await page.locator('[data-testid="file-input"]').setInputFiles(txtPath);

    await page.screenshot({ path: path.join('tests', 'screenshots', 'task4-03-wrong-file.png') });
    await expect(page.locator('[data-testid="file-error"]')).toBeVisible();
  });
});
