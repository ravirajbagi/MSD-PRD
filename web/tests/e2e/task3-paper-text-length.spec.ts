import { test, expect } from '@playwright/test';

const VALID_KEY = 'sk-test-12345678901234567890';

test.describe('Task 3 — paperText Length Cap', () => {
  test('POST /api/generate with text over 100k chars returns 400', async ({ request }) => {
    const res = await request.post('/api/generate', {
      data: {
        paperText: 'a'.repeat(100_001),
        apiKey: VALID_KEY,
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/exceeds maximum length/i);
  });

  test('POST /api/generate with exactly 100k chars passes length check (fails at OpenAI)', async ({ request }) => {
    const res = await request.post('/api/generate', {
      data: {
        paperText: 'a'.repeat(100_000),
        apiKey: VALID_KEY,
      },
    });
    // Should NOT be 400 for length — will be a streaming SSE response (200) or error from OpenAI
    expect(res.status()).not.toBe(400);
  });

  test('POST /api/generate with normal text passes length check', async ({ request }) => {
    const res = await request.post('/api/generate', {
      data: {
        paperText: 'This is a normal research paper abstract of reasonable length.',
        apiKey: VALID_KEY,
      },
    });
    expect(res.status()).not.toBe(400);
  });
});
