import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Task 10 — Security Regression', () => {
  test('GET / returns all 6 required security headers with correct values', async ({ request }) => {
    const response = await request.get('/');
    const h = response.headers();

    expect(h['x-frame-options']).toBe('DENY');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBe('no-referrer');
    expect(h['strict-transport-security']).toContain('max-age=63072000');
    expect(h['permissions-policy']).toContain('camera=()');
    expect(h['content-security-policy']).toContain("default-src 'self'");
  });

  test('CSP connect-src restricts to OpenAI and GitHub only', async ({ request }) => {
    const response = await request.get('/');
    const csp = response.headers()['content-security-policy'] ?? '';
    expect(csp).toContain('https://api.openai.com');
    expect(csp).toContain('https://api.github.com');
    expect(csp).toContain("connect-src 'self'");
  });

  test('CSP frame-ancestors is none (clickjacking prevention)', async ({ request }) => {
    const response = await request.get('/');
    const csp = response.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test('POST /api/generate rejects invalid API key format', async ({ request }) => {
    const res = await request.post('/api/generate', {
      data: { paperText: 'a'.repeat(200), apiKey: 'not-a-real-key' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/generate rejects paperText over 100k chars', async ({ request }) => {
    const res = await request.post('/api/generate', {
      data: { paperText: 'a'.repeat(100_001), apiKey: 'sk-test-12345678901234567890' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/exceeds maximum length/i);
  });

  test('rate limiting blocks 6th request to /api/generate from same IP', async ({ request }) => {
    const ip = '10.11.12.13';
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request.post('/api/generate', {
        headers: { 'X-Forwarded-For': ip },
        data: { paperText: 'a'.repeat(200), apiKey: 'sk-test-12345678901234567890' },
      });
      statuses.push(res.status());
    }
    expect(statuses[5]).toBe(429);
  });

  test('screenshot — landing page loads correctly after all security changes', async ({ page }) => {
    await page.goto('/');
    await page.screenshot({
      path: path.join('tests', 'screenshots', 'task10-01-landing-final.png'),
      fullPage: true,
    });
    await expect(page.locator('[data-testid="product-name"]')).toBeVisible();
  });
});
