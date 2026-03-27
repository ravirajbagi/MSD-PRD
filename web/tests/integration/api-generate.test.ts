import { describe, test, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock openai-client and logger before importing the route
vi.mock('@/lib/openai-client', () => ({
  generateNotebook: vi.fn(),
  OPENAI_MODEL: 'gpt-4o-mini',
}));
vi.mock('@/lib/logger', () => ({
  logRequest: vi.fn(),
  logError: vi.fn(),
}));

import { POST } from '@/app/api/generate/route';
import { generateNotebook } from '@/lib/openai-client';

const mockGenerate = generateNotebook as ReturnType<typeof vi.fn>;

const VALID_PAPER = 'A'.repeat(200);
const VALID_KEY = 'sk-testkey1234567890abcdefghij'; // matches /^sk-[a-zA-Z0-9\-_]{20,}$/

const VALID_SPEC = {
  title: 'Test Paper',
  abstract: 'Test abstract.',
  sections: [
    { id: 'intro', title: 'Intro', cell_type: 'markdown', source: ['# Intro'] },
    { id: 'code', title: 'Code', cell_type: 'code', source: ['print("hello")'] },
  ],
};

function makeRequest(body: object, ip = '127.0.0.1') {
  return new NextRequest('http://localhost/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

function parseSseEvents(text: string): Record<string, unknown>[] {
  return text
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => {
      try { return JSON.parse(line.slice(6)); }
      catch { return null; }
    })
    .filter(Boolean) as Record<string, unknown>[];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/generate', () => {
  test('valid body returns SSE stream with done event containing notebook', async () => {
    mockGenerate.mockResolvedValue(VALID_SPEC);

    const req = makeRequest({ paperText: VALID_PAPER, apiKey: VALID_KEY }, '10.1.0.1');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const text = await res.text();
    const events = parseSseEvents(text);
    const doneEvent = events.find((e) => e.done === true);

    expect(doneEvent).toBeDefined();
    expect(typeof doneEvent!.notebook).toBe('string');

    // notebook should be parseable .ipynb JSON
    const nb = JSON.parse(doneEvent!.notebook as string);
    expect(nb.nbformat).toBe(4);
  });

  test('invalid API key format returns 400 immediately', async () => {
    const req = makeRequest({ paperText: VALID_PAPER, apiKey: 'bad-key' }, '10.1.0.2');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/API key/i);
  });

  test('paperText over 100k chars returns 400', async () => {
    const req = makeRequest(
      { paperText: 'x'.repeat(100_001), apiKey: VALID_KEY },
      '10.1.0.3'
    );
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/100,000/);
  });

  test('missing paperText returns 400', async () => {
    const req = makeRequest({ apiKey: VALID_KEY }, '10.1.0.4');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/paperText/i);
  });

  test('SSE stream emits status messages before done event', async () => {
    mockGenerate.mockResolvedValue(VALID_SPEC);

    const req = makeRequest({ paperText: VALID_PAPER, apiKey: VALID_KEY }, '10.1.0.5');
    const res = await POST(req);
    const text = await res.text();
    const events = parseSseEvents(text);

    const statusEvents = events.filter((e) => typeof e.status === 'string');
    expect(statusEvents.length).toBeGreaterThan(0);
  });

  test('6th request from same IP returns 429', async () => {
    mockGenerate.mockResolvedValue(VALID_SPEC);
    const ip = '10.1.0.99';

    // Fill rate limit: 5 requests
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest({ paperText: VALID_PAPER, apiKey: VALID_KEY }, ip));
      await res.text(); // consume stream to allow clean teardown
    }

    // 6th request should be rate limited
    const res = await POST(makeRequest({ paperText: VALID_PAPER, apiKey: VALID_KEY }, ip));
    expect(res.status).toBe(429);
  });
});
