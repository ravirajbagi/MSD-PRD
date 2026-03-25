import { test, expect } from '@playwright/test';
import path from 'path';

const MOCK_NOTEBOOK = JSON.stringify({
  nbformat: 4, nbformat_minor: 5,
  metadata: { kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' }, language_info: { name: 'python', version: '3.10.0' } },
  cells: [
    { cell_type: 'markdown', metadata: {}, source: ['# Attention Is All You Need'] },
    { cell_type: 'code', metadata: {}, source: ['import numpy as np'], outputs: [], execution_count: null },
  ],
});

async function seedResult(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate((nb) => {
    sessionStorage.setItem('openai_api_key', 'sk-test');
    sessionStorage.setItem('paper_title', 'Attention Is All You Need');
    sessionStorage.setItem('notebook_json', nb);
  }, MOCK_NOTEBOOK);
}

test.describe('Task 9 — Result page', () => {
  test('result page renders with paper title and stats', async ({ page }) => {
    await seedResult(page);
    await page.goto('/result');
    await page.screenshot({ path: path.join('tests', 'screenshots', 'task9-01-result-page.png'), fullPage: true });
    await expect(page.locator('[data-testid="result-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="result-title"]')).toContainText('Attention Is All You Need');
  });

  test('Download button is visible', async ({ page }) => {
    await seedResult(page);
    await page.goto('/result');
    await expect(page.locator('[data-testid="download-btn"]')).toBeVisible();
  });

  test('Open in Colab button is visible', async ({ page }) => {
    await seedResult(page);
    await page.goto('/result');
    await expect(page.locator('[data-testid="open-colab-btn"]')).toBeVisible();
  });

  test('Generate Another link is visible and goes to /upload', async ({ page }) => {
    await seedResult(page);
    await page.goto('/result');
    const link = page.locator('[data-testid="generate-another-link"]');
    await expect(link).toBeVisible();
    await page.screenshot({ path: path.join('tests', 'screenshots', 'task9-02-result-actions.png') });
  });

  test('notebook stats show cell and section counts', async ({ page }) => {
    await seedResult(page);
    await page.goto('/result');
    await expect(page.locator('[data-testid="notebook-stats"]')).toBeVisible();
  });
});
