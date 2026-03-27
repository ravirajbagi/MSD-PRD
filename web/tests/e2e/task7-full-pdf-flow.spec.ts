import { test, expect } from '@playwright/test';
import path from 'path';

const PDF_FIXTURE = path.join('tests', 'fixtures', 'test.pdf');

const MOCK_NOTEBOOK_JSON = JSON.stringify({
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {
    kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
    language_info: { name: 'python', version: '3.10.0' },
    colab: { name: 'test-paper.ipynb', provenance: [] },
  },
  cells: [
    { cell_type: 'markdown', metadata: {}, source: ['# Test Paper'] },
    { cell_type: 'code', metadata: {}, source: ['import numpy as np'], outputs: [], execution_count: null },
  ],
});

// Pre-canned SSE response that simulates a successful generation
function buildSseResponse() {
  const events = [
    `data: {"status": "Analyzing paper structure..."}\n\n`,
    `data: {"status": "Generating notebook sections..."}\n\n`,
    `data: {"done": true, "notebook": ${JSON.stringify(MOCK_NOTEBOOK_JSON)}, "title": "Test Paper"}\n\n`,
  ];
  return events.join('');
}

test.describe('Task 7 — Full PDF upload flow (headless)', () => {
  test('step 1: landing page renders API key input', async ({ page }) => {
    await page.goto('/');
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task7-01-landing.png'),
    });
    await expect(page.locator('[data-testid="api-key-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="get-started-btn"]')).toBeVisible();
  });

  test('step 2: entering API key navigates to upload page', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="api-key-input"]', 'sk-test-abc1234567890abcdefghij');
    await page.click('[data-testid="get-started-btn"]');
    await expect(page).toHaveURL('/upload');
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task7-02-upload-page.png'),
    });
    await expect(page.locator('[data-testid="pdf-dropzone"]')).toBeVisible();
  });

  test('step 3: processing page shows spinner and status after upload (mocked APIs)', async ({ page }) => {
    // Mock /api/extract to return extracted text
    await page.route('**/api/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'Attention Is All You Need. This paper proposes the Transformer architecture. '.repeat(5),
          pageCount: 3,
          title: 'Test Paper',
          truncated: false,
        }),
      });
    });

    // Mock /api/generate to return pre-canned SSE
    await page.route('**/api/generate', async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: buildSseResponse(),
      });
    });

    // Navigate with API key in session
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.setItem('openai_api_key', 'sk-test-abc1234567890abcdefghij');
    });
    await page.goto('/upload');

    // Upload the test PDF
    await page.locator('[data-testid="file-input"]').setInputFiles(PDF_FIXTURE);
    await expect(page.locator('[data-testid="generate-btn"]')).toBeEnabled();
    await page.click('[data-testid="generate-btn"]');

    // Should navigate to /processing
    await expect(page).toHaveURL('/processing', { timeout: 10000 });
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task7-03-processing.png'),
    });
    await expect(page.locator('[data-testid="processing-spinner"]')).toBeVisible();
  });

  test('step 4: result page shows download button after successful generation (mocked APIs)', async ({ page }) => {
    // Mock /api/extract
    await page.route('**/api/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'Attention Is All You Need. This paper proposes the Transformer architecture. '.repeat(5),
          pageCount: 3,
          title: 'Test Paper',
          truncated: false,
        }),
      });
    });

    // Mock /api/generate with SSE that completes
    await page.route('**/api/generate', async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: buildSseResponse(),
      });
    });

    // Enter API key and upload PDF
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.setItem('openai_api_key', 'sk-test-abc1234567890abcdefghij');
    });
    await page.goto('/upload');
    await page.locator('[data-testid="file-input"]').setInputFiles(PDF_FIXTURE);
    await page.click('[data-testid="generate-btn"]');

    // Wait for navigation to /processing then to /result
    await expect(page).toHaveURL('/processing', { timeout: 10000 });
    await expect(page).toHaveURL('/result', { timeout: 15000 });

    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task7-04-result.png'),
    });
    await expect(page.locator('[data-testid="download-btn"]')).toBeVisible();
  });
});
