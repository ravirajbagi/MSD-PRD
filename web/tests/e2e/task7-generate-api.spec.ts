import { test, expect } from '@playwright/test';

test.describe('Task 7 — /api/generate SSE route', () => {
  test('returns 405 for GET requests', async ({ request }) => {
    const res = await request.get('/api/generate');
    expect(res.status()).toBe(405);
  });

  test('returns 400 when body is missing paperText', async ({ request }) => {
    const res = await request.post('/api/generate', {
      data: { apiKey: 'sk-test' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('returns 400 when body is missing apiKey', async ({ request }) => {
    const res = await request.post('/api/generate', {
      data: { paperText: 'some text' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
  });

  test('returns text/event-stream content-type for valid request', async ({ request }) => {
    // We can't pass a real API key in tests — we test that the route at least
    // accepts the request shape and returns SSE headers before failing
    const res = await request.post('/api/generate', {
      data: { paperText: 'test paper text about transformers', apiKey: 'sk-invalid-key' },
      headers: { 'Content-Type': 'application/json' },
    });
    // Route should return SSE content type (even if OpenAI call fails)
    const contentType = res.headers()['content-type'];
    expect(contentType).toMatch(/text\/event-stream/);
  });

  test('SSE stream emits status events before error on bad key', async ({ request }) => {
    const res = await request.post('/api/generate', {
      data: { paperText: 'test paper text about deep learning', apiKey: 'sk-invalid-test-key' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(200);
    const body = await res.text();
    // Should have at least one data: line
    expect(body).toMatch(/^data:/m);
  });
});
