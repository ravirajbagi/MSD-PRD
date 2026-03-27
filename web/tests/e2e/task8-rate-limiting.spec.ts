import { test, expect } from '@playwright/test';

const VALID_KEY = 'sk-test-12345678901234567890';
// Unique IP per test run to avoid interference from other tests
const TEST_IP = '10.99.88.77';

test.describe('Task 8 — Rate Limiting', () => {
  test('6th rapid POST to /api/generate from same IP returns 429', async ({ request }) => {
    const results: number[] = [];

    for (let i = 0; i < 6; i++) {
      const res = await request.post('/api/generate', {
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': TEST_IP,
        },
        data: {
          paperText: 'a'.repeat(200),
          apiKey: VALID_KEY,
        },
      });
      results.push(res.status());
    }

    // First 5 should NOT be 429 (they pass through to route validation or OpenAI)
    for (let i = 0; i < 5; i++) {
      expect(results[i]).not.toBe(429);
    }
    // 6th should be rate limited
    expect(results[5]).toBe(429);
  });

  test('429 response includes error message and retryAfter', async ({ request }) => {
    const overLimitIp = '10.99.77.66';
    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      await request.post('/api/generate', {
        headers: { 'X-Forwarded-For': overLimitIp },
        data: { paperText: 'a'.repeat(200), apiKey: VALID_KEY },
      });
    }
    const res = await request.post('/api/generate', {
      headers: { 'X-Forwarded-For': overLimitIp },
      data: { paperText: 'a'.repeat(200), apiKey: VALID_KEY },
    });
    expect(res.status()).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/rate limit/i);
    expect(typeof body.retryAfter).toBe('number');
    expect(res.headers()['retry-after']).toBeTruthy();
  });

  test('different IPs are rate-limited independently', async ({ request }) => {
    const ip1 = '10.99.55.11';
    const ip2 = '10.99.55.22';

    // Use up ip1's limit
    for (let i = 0; i < 5; i++) {
      await request.post('/api/generate', {
        headers: { 'X-Forwarded-For': ip1 },
        data: { paperText: 'a'.repeat(200), apiKey: VALID_KEY },
      });
    }

    // ip2 should still be allowed
    const res = await request.post('/api/generate', {
      headers: { 'X-Forwarded-For': ip2 },
      data: { paperText: 'a'.repeat(200), apiKey: VALID_KEY },
    });
    expect(res.status()).not.toBe(429);
  });
});
