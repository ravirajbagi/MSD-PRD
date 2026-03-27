import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Task 1 — HTTP Security Headers', () => {
  test('GET / returns X-Frame-Options: DENY', async ({ page, request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    expect(headers['x-frame-options']).toBe('DENY');
  });

  test('GET / returns X-Content-Type-Options: nosniff', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  test('GET / returns Referrer-Policy: no-referrer', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    expect(headers['referrer-policy']).toBe('no-referrer');
  });

  test('GET / returns Strict-Transport-Security', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    expect(headers['strict-transport-security']).toContain('max-age=63072000');
    expect(headers['strict-transport-security']).toContain('includeSubDomains');
  });

  test('GET / returns Permissions-Policy restricting camera/mic/geo/payment', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    const pp = headers['permissions-policy'] ?? '';
    expect(pp).toContain('camera=()');
    expect(pp).toContain('microphone=()');
    expect(pp).toContain('geolocation=()');
    expect(pp).toContain('payment=()');
  });

  test('GET / returns Content-Security-Policy with required directives', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    const csp = headers['content-security-policy'] ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('frame-ancestors');
    expect(csp).toContain('https://api.openai.com');
    expect(csp).toContain('https://api.github.com');
  });

  test('headers present on API routes too', async ({ request }) => {
    // Security headers should apply to all routes including API
    const response = await request.get('/api/extract');
    const headers = response.headers();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  test('screenshot — landing page loads with security headers applied', async ({ page }) => {
    await page.goto('/');
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task1-01-landing-with-headers.png'),
      fullPage: true,
    });
    await expect(page.locator('[data-testid="product-name"]')).toBeVisible();
  });
});
