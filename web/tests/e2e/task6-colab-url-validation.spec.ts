import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Task 6 — Colab URL & Gist ID Validation', () => {
  test('result page shows Colab error fallback when publish returns a bad URL', async ({ page }) => {
    // Seed sessionStorage with valid notebook data
    await page.goto('/');
    await page.evaluate(() => {
      const fakeNotebook = JSON.stringify({
        nbformat: 4, nbformat_minor: 5,
        metadata: { kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' }, language_info: { name: 'python', version: '3.10.0' }, colab: { name: 'test.ipynb', provenance: [] } },
        cells: [{ cell_type: 'code', metadata: {}, source: ['print("hello")'], outputs: [], execution_count: null }],
      });
      sessionStorage.setItem('openai_api_key', 'sk-test-12345678901234567890');
      sessionStorage.setItem('paper_title', 'Test Paper');
      sessionStorage.setItem('notebook_json', fakeNotebook);
    });

    // Intercept the publish API to return a bad URL
    await page.route('/api/notebook/publish', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ colabUrl: 'https://evil.com/steal-data', filename: 'test.ipynb' }),
      });
    });

    await page.goto('/result');
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task6-01-result-page.png'),
    });

    // Click Open in Colab
    await page.click('[data-testid="open-colab-btn"]');

    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task6-02-colab-error.png'),
    });

    // Should show the error fallback, not navigate to evil.com
    await expect(page.locator('text=Could not create Colab link')).toBeVisible();
  });

  test('download button still works independently of Colab URL issues', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const fakeNotebook = JSON.stringify({
        nbformat: 4, nbformat_minor: 5,
        metadata: { kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' }, language_info: { name: 'python', version: '3.10.0' }, colab: { name: 'test.ipynb', provenance: [] } },
        cells: [],
      });
      sessionStorage.setItem('openai_api_key', 'sk-test-12345678901234567890');
      sessionStorage.setItem('paper_title', 'Test Paper');
      sessionStorage.setItem('notebook_json', fakeNotebook);
    });
    await page.goto('/result');

    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-btn"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.ipynb$/);
  });
});
