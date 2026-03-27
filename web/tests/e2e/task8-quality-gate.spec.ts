/**
 * Task 8 — Quality gate test (manual-only, @quality tag, skipped in CI)
 *
 * Run with:
 *   npx playwright test tests/e2e/task8-quality-gate.spec.ts --headed --grep @quality
 *
 * Prerequisites:
 *   - App running at http://localhost:3000
 *   - C:\MyData\paper.pdf present ("Attention Is All You Need")
 *   - Enter your real OpenAI API key when the browser opens
 *
 * This test is tagged @quality and skipped in CI.
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const PAPER_PDF = 'C:\\MyData\\paper.pdf';

test.describe('@quality Real notebook quality gate', () => {
  test.skip(!fs.existsSync(PAPER_PDF), `Skip: ${PAPER_PDF} not found`);

  test('@quality step 1: enter API key and navigate to upload page', async ({ page }) => {
    await page.goto('/');
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task8-quality-01-landing.png'),
    });

    // User must type their real API key
    await expect(page.locator('[data-testid="api-key-input"]')).toBeVisible();
    await page.locator('[data-testid="api-key-input"]').focus();

    // Pause for manual input in headed mode
    await page.pause();

    await page.click('[data-testid="get-started-btn"]');
    await expect(page).toHaveURL('/upload');
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task8-quality-02-upload.png'),
    });
  });

  test('@quality step 2: upload paper PDF and start generation', async ({ page }) => {
    await page.goto('/');
    // Restore session from step 1 — user must have completed step 1
    const apiKey = await page.evaluate(() => sessionStorage.getItem('openai_api_key'));
    if (!apiKey) {
      // Allow manual entry
      await page.pause();
      await page.click('[data-testid="get-started-btn"]');
    } else {
      await page.goto('/upload');
    }

    await expect(page).toHaveURL('/upload');
    await page.locator('[data-testid="file-input"]').setInputFiles(PAPER_PDF);
    await expect(page.locator('[data-testid="generate-btn"]')).toBeEnabled();
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task8-quality-03-file-selected.png'),
    });
    await page.click('[data-testid="generate-btn"]');
    await expect(page).toHaveURL('/processing', { timeout: 15000 });
  });

  test('@quality step 3: processing page shows status updates (wait up to 5 min)', async ({ page }) => {
    // Seed session if needed
    await page.goto('/processing');
    const hasSession = await page.evaluate(
      () => !!sessionStorage.getItem('openai_api_key') && !!sessionStorage.getItem('paper_text')
    );
    if (!hasSession) {
      test.skip(true, 'Session not seeded — run steps 1 and 2 first');
      return;
    }

    await expect(page.locator('[data-testid="processing-spinner"]')).toBeVisible();
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task8-quality-04-processing.png'),
    });

    // Wait up to 5 minutes for navigation to /result
    await expect(page).toHaveURL('/result', { timeout: 5 * 60 * 1000 });
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task8-quality-05-result.png'),
    });
  });

  test('@quality step 4: download and validate generated notebook JSON', async ({ page }) => {
    await page.goto('/');
    const notebookJson = await page.evaluate(() => sessionStorage.getItem('notebook_json'));
    if (!notebookJson) {
      test.skip(true, 'No notebook_json in session — run steps 1-3 first');
      return;
    }

    // Validate notebook structure
    let notebook: Record<string, unknown>;
    expect(() => { notebook = JSON.parse(notebookJson); }).not.toThrow();

    // @ts-ignore — dynamic assertion
    expect(notebook!.nbformat).toBe(4);

    // @ts-ignore
    const cells = notebook!.cells as unknown[];
    expect(Array.isArray(cells)).toBe(true);
    expect(cells.length).toBeGreaterThanOrEqual(8);

    // At least one code cell with an import statement
    const codeCells = (cells as Array<{ cell_type: string; source: string[] }>)
      .filter((c) => c.cell_type === 'code');
    expect(codeCells.length).toBeGreaterThan(0);

    const hasImport = codeCells.some((c) =>
      c.source.join('\n').includes('import ')
    );
    expect(hasImport).toBe(true);

    // No dangerous patterns
    const allCode = codeCells.map((c) => c.source.join('\n')).join('\n');
    expect(allCode).not.toMatch(/os\.system|subprocess\.call|subprocess\.run|exec\s*\(/);

    await page.goto('/result');
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task8-quality-06-validation-passed.png'),
      fullPage: true,
    });
    await expect(page.locator('[data-testid="download-btn"]')).toBeVisible();
  });
});
